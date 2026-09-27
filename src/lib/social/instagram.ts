import type { Page } from "playwright";
import type { ActionOutcome, ListType, SessionInfo, SocialUser } from "@/types/social";
import { HOME_URLS, jitter, sleep, withPage } from "./browser";
import { SocialError } from "./errors";

// App-ID, die instagram.com im Browser selbst mitschickt.
const IG_APP_ID = "936619743392459";
const PAGE_SIZE = 50;

interface IgRawUser {
  pk?: string | number;
  pk_id?: string;
  id?: string;
  username: string;
  full_name?: string;
  profile_pic_url?: string;
  is_private?: boolean;
  is_verified?: boolean;
}

interface IgFetchResult {
  status: number;
  text: string;
}

function toUser(raw: IgRawUser): SocialUser {
  return {
    id: String(raw.pk_id ?? raw.pk ?? raw.id ?? ""),
    username: raw.username,
    fullName: raw.full_name ?? "",
    avatarUrl: raw.profile_pic_url ?? "",
    isPrivate: raw.is_private,
    isVerified: raw.is_verified,
  };
}

async function ensureOnInstagram(page: Page): Promise<void> {
  if (!page.url().startsWith(HOME_URLS.instagram)) {
    await page.goto(HOME_URLS.instagram, { waitUntil: "domcontentloaded" });
  }
}

/** Ruft die Web-API von Instagram im eingeloggten Browser-Tab auf (gleiche Cookies wie im Browser). */
async function igFetch<T>(
  page: Page,
  path: string,
  form?: Record<string, string>,
): Promise<T> {
  await ensureOnInstagram(page);
  const result = await page.evaluate(
    async ({ path, form, appId }): Promise<IgFetchResult> => {
      const csrf = /(?:^|;\s*)csrftoken=([^;]+)/.exec(document.cookie)?.[1] ?? "";
      const headers: Record<string, string> = {
        "x-ig-app-id": appId,
        "x-csrftoken": csrf,
        "x-requested-with": "XMLHttpRequest",
      };
      if (form) headers["content-type"] = "application/x-www-form-urlencoded";
      const res = await fetch(path, {
        method: form ? "POST" : "GET",
        credentials: "include",
        headers,
        body: form ? new URLSearchParams(form).toString() : undefined,
      });
      return { status: res.status, text: await res.text() };
    },
    { path, form, appId: IG_APP_ID },
  );

  if (result.status === 429) {
    throw new SocialError(
      "Instagram bremst gerade (zu viele Anfragen, HTTP 429). Bitte 15–30 Minuten warten und dann erneut versuchen.",
      { blocked: true, status: 429 },
    );
  }

  let json: Record<string, unknown> = {};
  try {
    json = JSON.parse(result.text) as Record<string, unknown>;
  } catch {
    if (result.status >= 400 || result.text.trimStart().startsWith("<")) {
      throw new SocialError(
        `Instagram hat keine gültige Antwort geliefert (HTTP ${result.status}). Bist du eingeloggt?`,
        { status: 502 },
      );
    }
  }

  const message = typeof json.message === "string" ? json.message : "";
  const blocked =
    json.spam === true ||
    message === "feedback_required" ||
    message === "Please wait a few minutes before you try again." ||
    result.status === 429;
  if (blocked) {
    throw new SocialError(
      "Instagram hat Aktionen vorübergehend blockiert (Spam-Schutz). Bitte einige Stunden warten.",
      { blocked: true, status: 429 },
    );
  }
  if (result.status === 401 || json.require_login === true || message === "login_required") {
    throw new SocialError("Nicht bei Instagram eingeloggt.", { status: 401 });
  }
  if (result.status >= 400 || json.status === "fail") {
    throw new SocialError(`Instagram-Fehler: ${message || `HTTP ${result.status}`}`, {
      status: result.status >= 400 ? result.status : 502,
    });
  }
  return json as T;
}

async function myUserId(page: Page): Promise<string | undefined> {
  const cookies = await page.context().cookies(HOME_URLS.instagram);
  return cookies.find((c) => c.name === "ds_user_id")?.value;
}

interface IgProfileInfo extends IgRawUser {
  edge_followed_by?: { count?: number };
  edge_follow?: { count?: number };
}

/** Eigener Account über den Endpunkt, den auch die Profil-Bearbeiten-Seite nutzt. */
async function currentUser(page: Page, id: string): Promise<SocialUser> {
  const data = await igFetch<{ user?: IgRawUser }>(page, "/api/v1/accounts/current_user/?edit=true");
  if (!data.user?.username) {
    throw new SocialError("Instagram-Account konnte nicht ermittelt werden.", { status: 502 });
  }
  return { ...toUser(data.user), id };
}

export function getSession(): Promise<SessionInfo> {
  return withPage("instagram", async (page) => {
    const id = await myUserId(page);
    if (!id) return { platform: "instagram", loggedIn: false };
    const me = await currentUser(page, id);
    // Zahlen sind nur Zusatzinfo – wenn Instagram hier bremst, trotzdem als eingeloggt anzeigen.
    const profile = await igFetch<{ data?: { user?: IgProfileInfo | null } }>(
      page,
      `/api/v1/users/web_profile_info/?username=${encodeURIComponent(me.username)}`,
    ).catch(() => null);
    const info = profile?.data?.user;
    return {
      platform: "instagram",
      loggedIn: true,
      user: {
        ...me,
        followerCount: info?.edge_followed_by?.count,
        followingCount: info?.edge_follow?.count,
      },
    };
  });
}

async function requireMe(page: Page): Promise<string> {
  const id = await myUserId(page);
  if (!id) throw new SocialError("Nicht bei Instagram eingeloggt.", { status: 401 });
  return id;
}

async function lookupUser(page: Page, username: string): Promise<SocialUser> {
  const data = await igFetch<{ data?: { user?: IgRawUser | null } }>(
    page,
    `/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`,
  );
  const user = data.data?.user;
  if (!user) throw new SocialError(`Instagram-Account „${username}“ nicht gefunden.`, { status: 404 });
  return toUser(user);
}

interface IgListPage {
  users?: IgRawUser[];
  next_max_id?: string | number | null;
}

const LIST_RETRY_WAITS_MS = [60_000, 180_000];

/** Beim Laden langer Listen bremst Instagram öfter kurz – dann warten und nochmal versuchen. */
async function fetchPageWithRetry(page: Page, path: string): Promise<IgListPage> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await igFetch<IgListPage>(page, path);
    } catch (error) {
      const wait = LIST_RETRY_WAITS_MS[attempt];
      if (!(error instanceof SocialError) || error.status !== 429 || wait === undefined) throw error;
      await sleep(wait);
    }
  }
}

async function fetchList(
  page: Page,
  userId: string,
  type: ListType,
  limit: number,
): Promise<SocialUser[]> {
  const users = new Map<string, SocialUser>();
  let maxId: string | undefined;
  do {
    const params = new URLSearchParams({ count: String(PAGE_SIZE) });
    if (type === "followers") params.set("search_surface", "follow_list_page");
    if (maxId) params.set("max_id", maxId);
    const data = await fetchPageWithRetry(
      page,
      `/api/v1/friendships/${userId}/${type}/?${params.toString()}`,
    );
    for (const raw of data.users ?? []) {
      const user = toUser(raw);
      users.set(user.id, user);
    }
    maxId = data.next_max_id != null ? String(data.next_max_id) : undefined;
    // Kleine Pause zwischen den Seiten, damit es nicht wie ein Bot aussieht.
    if (maxId) await jitter(2500, 4500);
  } while (maxId && users.size < limit);
  return [...users.values()].slice(0, limit);
}

export function getMyRelations(): Promise<{
  me: SocialUser;
  followers: SocialUser[];
  following: SocialUser[];
}> {
  return withPage("instagram", async (page) => {
    const id = await requireMe(page);
    const me = await currentUser(page, id);
    const following = await fetchList(page, id, "following", Number.POSITIVE_INFINITY);
    const followers = await fetchList(page, id, "followers", Number.POSITIVE_INFINITY);
    return { me, followers, following };
  });
}

export function getList(
  username: string,
  type: ListType,
  limit: number,
): Promise<{ account: SocialUser; users: SocialUser[] }> {
  return withPage("instagram", async (page) => {
    await requireMe(page);
    const account = await lookupUser(page, username);
    const users = await fetchList(page, account.id, type, limit);
    return { account, users };
  });
}

export function getMyFollowingIds(): Promise<Set<string>> {
  return withPage("instagram", async (page) => {
    const id = await requireMe(page);
    const following = await fetchList(page, id, "following", Number.POSITIVE_INFINITY);
    return new Set(following.map((u) => u.id));
  });
}

interface FriendshipResponse {
  friendship_status?: { following?: boolean; outgoing_request?: boolean };
}

export function follow(user: SocialUser): Promise<ActionOutcome> {
  return withPage("instagram", async (page): Promise<ActionOutcome> => {
    await requireMe(page);
    const data = await igFetch<FriendshipResponse>(
      page,
      `/api/v1/friendships/create/${user.id}/`,
      { container_module: "profile", user_id: user.id },
    );
    const status = data.friendship_status;
    if (status && !status.following && !status.outgoing_request) {
      throw new SocialError(`Folgen von @${user.username} hat nicht geklappt.`, { status: 502 });
    }
    return "done";
  });
}

export function unfollow(user: SocialUser): Promise<ActionOutcome> {
  return withPage("instagram", async (page): Promise<ActionOutcome> => {
    await requireMe(page);
    const data = await igFetch<FriendshipResponse>(
      page,
      `/api/v1/friendships/destroy/${user.id}/`,
      { container_module: "profile", user_id: user.id },
    );
    if (data.friendship_status?.following) {
      throw new SocialError(`Entfolgen von @${user.username} hat nicht geklappt.`, { status: 502 });
    }
    return "done";
  });
}
