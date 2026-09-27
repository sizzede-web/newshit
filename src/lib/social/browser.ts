import path from "node:path";
import { chromium, type BrowserContext, type Page } from "playwright";
import type { Platform } from "@/types/social";
import { SocialError } from "./errors";

const PROFILE_DIR = path.join(process.cwd(), ".social-profile");

export const HOME_URLS: Record<Platform, string> = {
  instagram: "https://www.instagram.com/",
  tiktok: "https://www.tiktok.com/",
};

export const LOGIN_URLS: Record<Platform, string> = {
  instagram: "https://www.instagram.com/accounts/login/",
  tiktok: "https://www.tiktok.com/login",
};

interface BrowserState {
  context?: Promise<BrowserContext>;
  pages: Partial<Record<Platform, Page>>;
  locks: Record<Platform, Promise<unknown>>;
}

// Auf globalThis, damit Hot-Reload im Dev-Server keinen zweiten Browser startet.
const g = globalThis as unknown as { __socialBrowser?: BrowserState };
const state: BrowserState = (g.__socialBrowser ??= {
  pages: {},
  locks: { instagram: Promise.resolve(), tiktok: Promise.resolve() },
});

export function getContext(): Promise<BrowserContext> {
  if (!state.context) {
    state.context = chromium
      .launchPersistentContext(PROFILE_DIR, {
        headless: process.env.SOCIAL_HEADLESS === "1",
        executablePath: process.env.CHROMIUM_PATH || undefined,
        viewport: null,
        locale: "de-DE",
        args: ["--disable-blink-features=AutomationControlled"],
      })
      .then((context) => {
        context.on("close", () => {
          state.context = undefined;
          state.pages = {};
        });
        return context;
      })
      .catch((error: unknown) => {
        state.context = undefined;
        const message = error instanceof Error ? error.message : String(error);
        throw new SocialError(
          message.includes("Executable doesn't exist")
            ? "Browser fehlt. Einmalig im Projektordner ausführen: npm run setup"
            : `Browser konnte nicht gestartet werden: ${message}`,
          { status: 503 },
        );
      });
  }
  return state.context;
}

export async function getPage(platform: Platform): Promise<Page> {
  const existing = state.pages[platform];
  if (existing && !existing.isClosed()) return existing;
  const context = await getContext();
  const page = await context.newPage();
  state.pages[platform] = page;
  await page.goto(HOME_URLS[platform], { waitUntil: "domcontentloaded" });
  return page;
}

/**
 * Führt Browser-Arbeit pro Plattform nacheinander aus, damit sich
 * Listen-Laden, manuelle Aktionen und Automatik-Jobs nicht in die Quere kommen.
 */
export function withPage<T>(platform: Platform, fn: (page: Page) => Promise<T>): Promise<T> {
  const run = state.locks[platform].then(async () => fn(await getPage(platform)));
  state.locks[platform] = run.catch(() => undefined);
  return run;
}

export async function openLogin(platform: Platform): Promise<void> {
  const page = await getPage(platform);
  await page.goto(LOGIN_URLS[platform], { waitUntil: "domcontentloaded" });
  await page.bringToFront();
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function jitter(minMs: number, maxMs: number): Promise<void> {
  return sleep(minMs + Math.random() * (maxMs - minMs));
}
