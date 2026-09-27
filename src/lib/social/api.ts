import type {
  ActionOutcome,
  Job,
  JobAction,
  ListResult,
  ListType,
  Platform,
  RelationsResult,
  SessionInfo,
  SocialUser,
} from "@/types/social";

export class ApiError extends Error {
  readonly blocked: boolean;
  constructor(message: string, blocked: boolean) {
    super(message);
    this.blocked = blocked;
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: init?.body ? { "content-type": "application/json" } : undefined,
  });
  const json = (await res.json().catch(() => ({}))) as T & { error?: string; blocked?: boolean };
  if (!res.ok) throw new ApiError(json.error ?? `Fehler (HTTP ${res.status})`, json.blocked === true);
  return json;
}

export const api = {
  session: (platform: Platform) => request<SessionInfo>(`/api/session?platform=${platform}`),
  openLogin: (platform: Platform) =>
    request<{ ok: true }>("/api/session", { method: "POST", body: JSON.stringify({ platform }) }),
  relations: (platform: Platform) => request<RelationsResult>(`/api/relations?platform=${platform}`),
  list: (platform: Platform, username: string, type: ListType, limit: number) =>
    request<ListResult>(
      `/api/list?${new URLSearchParams({ platform, username, type, limit: String(limit) })}`,
    ),
  action: (platform: Platform, action: JobAction, user: SocialUser) =>
    request<{ outcome: ActionOutcome }>("/api/action", {
      method: "POST",
      body: JSON.stringify({ platform, action, user }),
    }),
  startJob: (platform: Platform, action: JobAction, users: SocialUser[], delayMs: number) =>
    request<Job>("/api/jobs", {
      method: "POST",
      body: JSON.stringify({ platform, action, users, delayMs }),
    }),
  job: (id: string) => request<Job>(`/api/jobs?id=${encodeURIComponent(id)}`),
  jobs: () => request<Job[]>("/api/jobs"),
  cancelJob: (id: string) =>
    request<Job>(`/api/jobs?id=${encodeURIComponent(id)}`, { method: "DELETE" }),
};

export function avatarSrc(url: string): string {
  return url ? `/api/avatar?url=${encodeURIComponent(url)}` : "";
}
