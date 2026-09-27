import { randomUUID } from "node:crypto";
import type { Job, JobAction, Platform, SocialUser } from "@/types/social";
import { sleep } from "./browser";
import { SocialError } from "./errors";
import { markFollowed, platforms } from "./index";

export const MIN_DELAY_MS = 3_000;

const g = globalThis as unknown as { __socialJobs?: Map<string, Job> };
const jobs = (g.__socialJobs ??= new Map<string, Job>());
const cancelled = new Set<string>();

export function listJobs(): Job[] {
  return [...jobs.values()].sort((a, b) => b.startedAt - a.startedAt);
}

export function getJob(id: string): Job | undefined {
  return jobs.get(id);
}

export function cancelJob(id: string): Job | undefined {
  const job = jobs.get(id);
  if (job?.status === "running") cancelled.add(id);
  return job;
}

export function startJob(
  platform: Platform,
  action: JobAction,
  users: SocialUser[],
  delayMs: number,
): Job {
  const running = listJobs().find((j) => j.platform === platform && j.status === "running");
  if (running) {
    throw new SocialError("Für diese Plattform läuft bereits eine Automatik. Erst stoppen.", {
      status: 409,
    });
  }
  if (users.length === 0) throw new SocialError("Keine User ausgewählt.", { status: 400 });

  const job: Job = {
    id: randomUUID(),
    platform,
    action,
    delayMs: Math.max(MIN_DELAY_MS, delayMs),
    items: users.map((user) => ({ user, status: "pending" })),
    index: 0,
    status: "running",
    startedAt: Date.now(),
  };
  jobs.set(job.id, job);
  void run(job);
  return job;
}

async function waitOrCancel(job: Job, ms: number): Promise<void> {
  const until = Date.now() + ms;
  while (Date.now() < until && !cancelled.has(job.id)) await sleep(200);
}

async function run(job: Job): Promise<void> {
  const service = platforms[job.platform];
  try {
    for (; job.index < job.items.length; job.index++) {
      if (cancelled.has(job.id)) {
        job.status = "cancelled";
        job.message = "Gestoppt.";
        break;
      }
      const item = job.items[job.index];
      try {
        const outcome =
          job.action === "follow" ? await service.follow(item.user) : await service.unfollow(item.user);
        markFollowed(job.platform, item.user.id, job.action === "follow");
        item.status = outcome === "already" ? "skipped" : "done";
        if (outcome === "already") {
          item.message = job.action === "follow" ? "Folgst du schon" : "Folgst du nicht";
          continue; // keine Pause nötig, es wurde nichts geklickt
        }
      } catch (error) {
        item.status = "error";
        item.message = error instanceof Error ? error.message : String(error);
        if (error instanceof SocialError && (error.blocked || error.status === 401 || error.status === 503)) {
          job.status = error.blocked ? "blocked" : "error";
          job.message = item.message;
          break;
        }
      }
      if (job.index < job.items.length - 1) await waitOrCancel(job, job.delayMs);
    }
    if (job.status === "running") job.status = cancelled.has(job.id) ? "cancelled" : "done";
  } catch (error) {
    job.status = "error";
    job.message = error instanceof Error ? error.message : String(error);
  } finally {
    job.finishedAt = Date.now();
    cancelled.delete(job.id);
  }
}
