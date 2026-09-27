import type { Platform, SocialUser } from "@/types/social";
import { SocialError } from "./errors";
import * as instagram from "./instagram";
import * as tiktok from "./tiktok";

export const platforms = { instagram, tiktok } as const;

export function parsePlatform(value: unknown): Platform {
  if (value === "instagram" || value === "tiktok") return value;
  throw new SocialError("Unbekannte Plattform.", { status: 400 });
}

export function parseUser(value: unknown): SocialUser {
  const v = value as Partial<SocialUser> | null;
  if (!v || typeof v.id !== "string" || typeof v.username !== "string" || !v.id || !v.username) {
    throw new SocialError("Ungültiger User.", { status: 400 });
  }
  return {
    id: v.id,
    username: v.username,
    fullName: typeof v.fullName === "string" ? v.fullName : "",
    avatarUrl: typeof v.avatarUrl === "string" ? v.avatarUrl : "",
    secUid: typeof v.secUid === "string" ? v.secUid : undefined,
  };
}

// Zwischenspeicher: wem folgt der eingeloggte Account (für „bereits gefolgt“-Markierung).
const g = globalThis as unknown as {
  __socialFollowing?: Partial<Record<Platform, Set<string>>>;
};
const followingCache = (g.__socialFollowing ??= {});

export function setMyFollowing(platform: Platform, ids: Iterable<string>): void {
  followingCache[platform] = new Set(ids);
}

export async function getMyFollowing(platform: Platform): Promise<Set<string>> {
  const cached = followingCache[platform];
  if (cached) return cached;
  const ids = await platforms[platform].getMyFollowingIds();
  followingCache[platform] = ids;
  return ids;
}

export function markFollowed(platform: Platform, id: string, following: boolean): void {
  const set = followingCache[platform];
  if (!set) return;
  if (following) set.add(id);
  else set.delete(id);
}
