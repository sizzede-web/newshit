import type { Locator, Page, Response } from "playwright";
import type { ActionOutcome, ListType, SessionInfo, SocialUser } from "@/types/social";
import { HOME_URLS, jitter, sleep, withPage } from "./browser";
import { SocialError } from "./errors";

const FOLLOW_TEXT = /^(folgen|follow|zurückfolgen|follow back)$/i;
const FOLLOWING_TEXT = /^(gefolgt|following|freunde|friends)$/i;
const UNFOLLOW_CONFIRM_TEXT = /^(nicht mehr folgen|entfolgen|unfollow)$/i;

interface TtRawUser {
  id?: string;
  uniqueId?: string;
  nickname?: string;
  avatarThumb?: string;
  avatarMedium?: string;
  secUid?: string;
  privateAccount?: boolean;
  verified?: boolean;
}

interface TtUserDetail {
  statusCode?: number;
  userInfo?: {
    user?: TtRawUser;
    stats?: { followerCount?: number; followingCount?: number };
  };
}

function toUser(raw: TtRawUser): SocialUser {
  return {
    id: raw.id ?? raw.secUid ?? raw.uniqueId ?? "",
    username: raw.uniqueId ?? "",
    fullName: raw.nickname ?? "",
    avatarUrl: raw.avatarThumb ?? raw.avatarMedium ?? "",
    isPrivate: raw.privateAccount,
    isVerified: raw.verified,
    secUid: raw.secUid,
  };
}

function cleanUsername(username: string): string {
  return username.trim().replace(/^@/, "");
}

async function isLoggedIn(page: Page): Promise<boolean> {
  const cookies = await page.context().cookies(HOME_URLS.tiktok);
  return cookies.some((c) => (c.name === "sessionid" || c.name === "sid_tt") && c.value);
}

async function requireLogin(page: Page): Promise<void> {
  if (!(await isLoggedIn(page))) {
    throw new SocialError("Nicht bei TikTok eingeloggt.", { status: 401 });
  }
}

/** Liest die Daten, die TikTok für das Server-Rendering in die Seite einbettet. */
async function readRehydration(page: Page): Promise<Record<string, unknown>> {
  const text = await page
    .locator("script#__UNIVERSAL_DATA_FOR_REHYDRATION__")
    .textContent({ timeout: 15_000 })
    .catch(() => null);
  if (!text) return {};
  try {
    const json = JSON.parse(text) as { __DEFAULT_SCOPE__?: Record<string, unknown> };
    return json.__DEFAULT_SCOPE__ ?? {};
  } catch {
    return {};
  }
}

async function openProfile(page: Page, username: string): Promise<SocialUser & {
  followerCount?: number;
  followingCount?: number;
}> {
  const name = cleanUsername(username);
  await page.goto(`${HOME_URLS.tiktok}@${encodeURIComponent(name)}`, {
    waitUntil: "domcontentloaded",
  });
  const scope = await readRehydration(page);
  const detail = scope["webapp.user-detail"] as TtUserDetail | undefined;
  const raw = detail?.userInfo?.user;
  if (!raw?.uniqueId) {
    throw new SocialError(
      `TikTok-Account „${name}“ nicht gefunden (oder TikTok zeigt ein Captcha – bitte im Browserfenster lösen).`,
      { status: 404 },
    );
  }
  return {
    ...toUser(raw),
    followerCount: detail?.userInfo?.stats?.followerCount,
    followingCount: detail?.userInfo?.stats?.followingCount,
  };
}

async function readMe(page: Page): Promise<SocialUser> {
  await requireLogin(page);
  if (!page.url().startsWith(HOME_URLS.tiktok)) {
    await page.goto(HOME_URLS.tiktok, { waitUntil: "domcontentloaded" });
  }
  const account = await page.evaluate(async () => {
    try {
      const res = await fetch("/passport/web/account/info/?aid=1988", { credentials: "include" });
      const json = (await res.json()) as {
        data?: { username?: string; screen_name?: string; user_id_str?: string; sec_user_id?: string; avatar_url?: string };
      };
      return json.data ?? null;
    } catch {
      return null;
    }
  });
  if (account?.username) {
    return {
      id: account.user_id_str ?? "",
      username: account.username,
      fullName: account.screen_name ?? "",
      avatarUrl: account.avatar_url ?? "",
      secUid: account.sec_user_id,
    };
  }
  const scope = await readRehydration(page);
  const appUser = (scope["webapp.app-context"] as { user?: TtRawUser & { uid?: string } } | undefined)
    ?.user;
  if (appUser?.uniqueId) return toUser({ ...appUser, id: appUser.id ?? appUser.uid });
  throw new SocialError("TikTok-Account konnte nicht ermittelt werden. Bist du eingeloggt?", {
    status: 401,
  });
}

export function getSession(): Promise<SessionInfo> {
  return withPage("tiktok", async (page) => {
    if (!(await isLoggedIn(page))) return { platform: "tiktok", loggedIn: false };
    const me = await readMe(page);
    const profile = await openProfile(page, me.username);
    return { platform: "tiktok", loggedIn: true, user: profile };
  });
}

/** Scrollt die Follower-/Gefolgt-Liste im Popup ein Stück weiter. */
async function scrollList(page: Page): Promise<void> {
  await page.evaluate(() => {
    const root: ParentNode = document.querySelector('[role="dialog"]') ?? document;
    const candidates = [...root.querySelectorAll<HTMLElement>("div, ul, section")].filter((el) => {
      const style = getComputedStyle(el);
      return (
        (style.overflowY === "auto" || style.overflowY === "scroll") &&
        el.scrollHeight > el.clientHeight + 20 &&
        el.querySelector('a[href*="/@"]') !== null
      );
    });
    const best = candidates.sort(
      (a, b) => b.querySelectorAll('a[href*="/@"]').length - a.querySelectorAll('a[href*="/@"]').length,
    )[0];
    if (best) best.scrollTop = best.scrollHeight;
  });
}

async function collectList(
  page: Page,
  username: string,
  type: ListType,
  limit: number,
): Promise<{ account: SocialUser; users: SocialUser[] }> {
  const account = await openProfile(page, username);
  const users = new Map<string, SocialUser>();
  let responses = 0;
  let hasMore = true;
  let lastResponseAt = Date.now();

  // TikTok signiert seine API-Aufrufe selbst – wir lesen einfach die Antworten mit,
  // während die Liste im Popup gescrollt wird.
  const onResponse = async (res: Response) => {
    const url = new URL(res.url());
    if (!url.pathname.startsWith("/api/user/list")) return;
    const secUid = url.searchParams.get("secUid");
    if (secUid && account.secUid && secUid !== account.secUid) return;
    try {
      const json = (await res.json()) as {
        userList?: { user?: TtRawUser }[];
        hasMore?: boolean;
      };
      responses += 1;
      lastResponseAt = Date.now();
      hasMore = json.hasMore === true;
      for (const entry of json.userList ?? []) {
        if (!entry.user?.uniqueId) continue;
        const user = toUser(entry.user);
        users.set(user.id, user);
      }
    } catch {
      // Antwort war kein JSON – ignorieren
    }
  };

  page.on("response", onResponse);
  try {
    const counter = page.locator(`[data-e2e="${type}-count"]`).first();
    await counter.click({ timeout: 10_000 }).catch(() => {
      throw new SocialError("Follower-/Gefolgt-Zahl auf dem Profil nicht gefunden.", { status: 502 });
    });

    const waitUntil = Date.now() + 15_000;
    while (responses === 0 && Date.now() < waitUntil) await sleep(300);
    if (responses === 0) {
      throw new SocialError(
        `Die ${type === "followers" ? "Follower" : "Gefolgt"}-Liste von @${account.username} ist privat oder konnte nicht geladen werden.`,
        { status: 403 },
      );
    }

    while (hasMore && users.size < limit) {
      const before = users.size;
      await scrollList(page);
      await jitter(1200, 2200);
      if (users.size === before && Date.now() - lastResponseAt > 12_000) break;
    }
  } finally {
    page.off("response", onResponse);
    await page.keyboard.press("Escape").catch(() => undefined);
  }

  return { account, users: [...users.values()].slice(0, limit) };
}

export function getList(
  username: string,
  type: ListType,
  limit: number,
): Promise<{ account: SocialUser; users: SocialUser[] }> {
  return withPage("tiktok", async (page) => {
    await requireLogin(page);
    return collectList(page, username, type, limit);
  });
}

export function getMyRelations(): Promise<{
  me: SocialUser;
  followers: SocialUser[];
  following: SocialUser[];
}> {
  return withPage("tiktok", async (page) => {
    const me = await readMe(page);
    const following = await collectList(page, me.username, "following", Number.POSITIVE_INFINITY);
    const followers = await collectList(page, me.username, "followers", Number.POSITIVE_INFINITY);
    return { me: following.account, followers: followers.users, following: following.users };
  });
}

export function getMyFollowingIds(): Promise<Set<string>> {
  return withPage("tiktok", async (page) => {
    const me = await readMe(page);
    const { users } = await collectList(page, me.username, "following", Number.POSITIVE_INFINITY);
    return new Set(users.map((u) => u.id));
  });
}

async function buttonText(locator: Locator): Promise<string> {
  return ((await locator.innerText().catch(() => "")) || "").trim();
}

async function findFollowButton(page: Page): Promise<Locator> {
  const button = page.locator('[data-e2e="follow-button"]').first();
  try {
    await button.waitFor({ state: "visible", timeout: 10_000 });
  } catch {
    throw new SocialError(
      "Folgen-Button nicht gefunden – evtl. zeigt TikTok ein Captcha im Browserfenster.",
      { status: 502 },
    );
  }
  return button;
}

async function waitForText(locator: Locator, test: (text: string) => boolean): Promise<boolean> {
  const until = Date.now() + 6_000;
  while (Date.now() < until) {
    if (test(await buttonText(locator))) return true;
    await sleep(300);
  }
  return false;
}

export function follow(user: SocialUser): Promise<ActionOutcome> {
  return withPage("tiktok", async (page) => {
    await requireLogin(page);
    await openProfile(page, user.username);
    const button = await findFollowButton(page);
    if (!FOLLOW_TEXT.test(await buttonText(button))) return "already";
    await button.click();
    const ok = await waitForText(button, (text) => !FOLLOW_TEXT.test(text));
    if (!ok) {
      throw new SocialError(
        `Folgen von @${user.username} wurde nicht bestätigt – evtl. Limit erreicht.`,
        { blocked: true, status: 429 },
      );
    }
    return "done";
  });
}

export function unfollow(user: SocialUser): Promise<ActionOutcome> {
  return withPage("tiktok", async (page) => {
    await requireLogin(page);
    await openProfile(page, user.username);

    let target: Locator | undefined;
    const unfollowButton = page.locator('[data-e2e="unfollow-button"]').first();
    if (await unfollowButton.isVisible().catch(() => false)) {
      target = unfollowButton;
    } else {
      const followButton = await findFollowButton(page);
      const text = await buttonText(followButton);
      if (FOLLOW_TEXT.test(text)) return "already";
      if (FOLLOWING_TEXT.test(text) || text === "") target = followButton;
    }
    if (!target) {
      throw new SocialError(`Entfolgen-Button für @${user.username} nicht gefunden.`, { status: 502 });
    }

    await target.click();
    const confirm = page.getByRole("button", { name: UNFOLLOW_CONFIRM_TEXT }).first();
    const hasConfirm = await confirm
      .waitFor({ state: "visible", timeout: 2_000 })
      .then(() => true)
      .catch(() => false);
    if (hasConfirm) await confirm.click();

    const followButton = page.locator('[data-e2e="follow-button"]').first();
    const ok = await waitForText(followButton, (text) => FOLLOW_TEXT.test(text));
    if (!ok) {
      throw new SocialError(`Entfolgen von @${user.username} wurde nicht bestätigt.`, { status: 502 });
    }
    return "done";
  });
}
