export type Platform = "instagram" | "tiktok";

export type ListType = "followers" | "following";

export interface SocialUser {
  id: string;
  username: string;
  fullName: string;
  avatarUrl: string;
  isPrivate?: boolean;
  isVerified?: boolean;
  /** TikTok-interne ID, wird für manche Aufrufe gebraucht */
  secUid?: string;
  /** true, wenn der eingeloggte Account diesem User bereits folgt */
  iFollow?: boolean;
}

export interface SessionInfo {
  platform: Platform;
  loggedIn: boolean;
  user?: SocialUser & { followerCount?: number; followingCount?: number };
  error?: string;
}

export interface RelationsResult {
  platform: Platform;
  me: SocialUser;
  followers: number;
  following: number;
  nonFollowers: SocialUser[];
}

export interface ListResult {
  platform: Platform;
  account: SocialUser;
  type: ListType;
  users: SocialUser[];
}

export type JobAction = "follow" | "unfollow";

export type JobItemStatus = "pending" | "done" | "skipped" | "error";

export type JobStatus = "running" | "done" | "cancelled" | "blocked" | "error";

export interface JobItem {
  user: SocialUser;
  status: JobItemStatus;
  message?: string;
}

export interface Job {
  id: string;
  platform: Platform;
  action: JobAction;
  delayMs: number;
  items: JobItem[];
  index: number;
  status: JobStatus;
  message?: string;
  startedAt: number;
  finishedAt?: number;
}

export type ActionOutcome = "done" | "already";
