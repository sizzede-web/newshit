"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, LogIn, Play, RefreshCw, Search, UserMinus, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, avatarSrc } from "@/lib/social/api";
import type {
  Job,
  JobAction,
  ListResult,
  ListType,
  Platform,
  RelationsResult,
  SessionInfo,
  SocialUser,
} from "@/types/social";
import { JobCard } from "./job-card";
import { profileUrl, UserList, type RowState } from "./user-list";

const PLATFORM_NAME: Record<Platform, string> = { instagram: "Instagram", tiktok: "TikTok" };

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function Section({ title, description, children }: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 text-card-foreground">
      <div>
        <h2 className="text-base font-semibold">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function ErrorText({ children }: { children: React.ReactNode }) {
  return <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{children}</p>;
}

export function PlatformPanel({ platform }: { platform: Platform }) {
  const name = PLATFORM_NAME[platform];

  const [session, setSession] = useState<SessionInfo | null>(null);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);

  const [relations, setRelations] = useState<RelationsResult | null>(null);
  const [relationsLoading, setRelationsLoading] = useState(false);
  const [relationsError, setRelationsError] = useState<string | null>(null);
  const [selectedUnfollow, setSelectedUnfollow] = useState<Set<string>>(new Set());

  const [otherUsername, setOtherUsername] = useState("");
  const [otherType, setOtherType] = useState<ListType>("following");
  const [otherLimit, setOtherLimit] = useState(500);
  const [otherList, setOtherList] = useState<ListResult | null>(null);
  const [otherLoading, setOtherLoading] = useState(false);
  const [otherError, setOtherError] = useState<string | null>(null);
  const [hideFollowed, setHideFollowed] = useState(true);
  const [selectedFollow, setSelectedFollow] = useState<Set<string>>(new Set());

  const [rowState, setRowState] = useState<Record<string, RowState>>({});
  const [delaySec, setDelaySec] = useState(5);
  const [job, setJob] = useState<Job | null>(null);
  const [jobError, setJobError] = useState<string | null>(null);

  const jobRunning = job?.status === "running";

  const setRow = useCallback((id: string, state: RowState) => {
    setRowState((prev) => ({ ...prev, [id]: state }));
  }, []);

  // Laufende Automatik nach Neuladen der Seite wieder anzeigen.
  useEffect(() => {
    api
      .jobs()
      .then((jobs) => {
        const latest = jobs.find((j) => j.platform === platform);
        if (latest?.status === "running") setJob(latest);
      })
      .catch(() => undefined);
  }, [platform]);

  // Fortschritt der Automatik abfragen und in die Listen übernehmen.
  useEffect(() => {
    if (!job || job.status !== "running") return;
    const timer = setInterval(() => {
      api
        .job(job.id)
        .then((next) => {
          setJob(next);
          setRowState((prev) => {
            const updated = { ...prev };
            next.items.forEach((item, index) => {
              if (item.status === "pending") {
                if (index === next.index && next.status === "running") {
                  updated[item.user.id] = { status: "busy" };
                }
                return;
              }
              updated[item.user.id] = { status: item.status, message: item.message };
            });
            return updated;
          });
        })
        .catch(() => undefined);
    }, 1000);
    return () => clearInterval(timer);
  }, [job]);

  async function checkSession() {
    setSessionLoading(true);
    setSessionError(null);
    try {
      setSession(await api.session(platform));
    } catch (error) {
      setSessionError(errorMessage(error));
    } finally {
      setSessionLoading(false);
    }
  }

  async function openLogin() {
    setSessionError(null);
    try {
      await api.openLogin(platform);
    } catch (error) {
      setSessionError(errorMessage(error));
    }
  }

  async function loadRelations() {
    setRelationsLoading(true);
    setRelationsError(null);
    try {
      const result = await api.relations(platform);
      setRelations(result);
      setSelectedUnfollow(new Set());
    } catch (error) {
      setRelationsError(errorMessage(error));
    } finally {
      setRelationsLoading(false);
    }
  }

  async function loadOtherList(event: React.FormEvent) {
    event.preventDefault();
    if (!otherUsername.trim()) return;
    setOtherLoading(true);
    setOtherError(null);
    try {
      const result = await api.list(platform, otherUsername, otherType, otherLimit);
      setOtherList(result);
      setSelectedFollow(new Set());
    } catch (error) {
      setOtherError(errorMessage(error));
    } finally {
      setOtherLoading(false);
    }
  }

  async function runSingle(action: JobAction, user: SocialUser) {
    setRow(user.id, { status: "busy" });
    try {
      const { outcome } = await api.action(platform, action, user);
      setRow(user.id, {
        status: outcome === "already" ? "skipped" : "done",
        message:
          outcome === "already"
            ? action === "follow"
              ? "Folgst du schon"
              : "Folgst du nicht"
            : undefined,
      });
    } catch (error) {
      setRow(user.id, { status: "error", message: errorMessage(error) });
    }
  }

  async function startAutomation(action: JobAction, users: SocialUser[]) {
    setJobError(null);
    const pending = users.filter((u) => {
      const state = rowState[u.id]?.status;
      return state !== "done" && state !== "skipped";
    });
    if (pending.length === 0) {
      setJobError("Keine offenen User in der Auswahl.");
      return;
    }
    const verb = action === "follow" ? "folgen" : "entfolgen";
    if (!window.confirm(`${pending.length} Accounts automatisch ${verb} (${delaySec}s Pause dazwischen)?`)) {
      return;
    }
    try {
      setJob(await api.startJob(platform, action, pending, delaySec * 1000));
    } catch (error) {
      setJobError(errorMessage(error));
    }
  }

  async function cancelJob() {
    if (!job) return;
    try {
      setJob(await api.cancelJob(job.id));
    } catch (error) {
      setJobError(errorMessage(error));
    }
  }

  const nonFollowers = relations?.nonFollowers ?? [];
  const otherUsers = useMemo(() => {
    const users = otherList?.users ?? [];
    const myName = session?.user?.username;
    return users.filter(
      (u) => u.username !== myName && (!hideFollowed || !u.iFollow || rowState[u.id]),
    );
  }, [otherList, hideFollowed, rowState, session]);

  const selectedNonFollowers = nonFollowers.filter((u) => selectedUnfollow.has(u.id));
  const selectedOthers = otherUsers.filter((u) => selectedFollow.has(u.id));
  const followableOthers = otherUsers.filter((u) => !u.iFollow);

  return (
    <div className="flex flex-col gap-6">
      <Section
        title={`${name}-Account`}
        description={`Die App steuert ein eigenes Chrome-Fenster. Logge dich dort einmal bei ${name} ein – die Anmeldung bleibt gespeichert.`}
      >
        <div className="flex flex-wrap items-center gap-3">
          {session?.loggedIn && session.user ? (
            <a
              href={profileUrl(platform, session.user.username)}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3"
            >
              {session.user.avatarUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarSrc(session.user.avatarUrl)}
                  alt=""
                  className="size-12 rounded-full bg-muted object-cover"
                />
              )}
              <div>
                <p className="font-medium">
                  {session.user.username ? `@${session.user.username}` : "Eingeloggt"}
                </p>
                <p className="text-sm text-muted-foreground tabular-nums">
                  {session.user.followerCount ?? "–"} Follower · {session.user.followingCount ?? "–"}{" "}
                  Gefolgt
                </p>
              </div>
            </a>
          ) : (
            <p className="text-sm text-muted-foreground">
              {session ? "Nicht eingeloggt." : "Noch nicht verbunden."}
            </p>
          )}
          <div className="ml-auto flex gap-2">
            <Button variant="outline" onClick={openLogin}>
              <LogIn />
              Login-Fenster öffnen
            </Button>
            <Button onClick={checkSession} disabled={sessionLoading}>
              {sessionLoading ? <Loader2 className="animate-spin" /> : <RefreshCw />}
              Verbinden / Status prüfen
            </Button>
          </div>
        </div>
        {sessionError && <ErrorText>{sessionError}</ErrorText>}
      </Section>

      {job && <JobCard job={job} onCancel={cancelJob} />}
      {jobError && <ErrorText>{jobError}</ErrorText>}

      <Section
        title="Folgen dir nicht zurück"
        description="Vergleicht, wem du folgst, mit deinen Followern. Bei vielen Followern kann das ein paar Minuten dauern."
      >
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={loadRelations} disabled={relationsLoading || !session?.loggedIn}>
            {relationsLoading ? <Loader2 className="animate-spin" /> : <Search />}
            {relations ? "Neu analysieren" : "Analysieren"}
          </Button>
          {relations && (
            <p className="text-sm text-muted-foreground tabular-nums">
              {relations.following} Gefolgt · {relations.followers} Follower ·{" "}
              <span className="font-medium text-foreground">
                {relations.nonFollowers.length} folgen nicht zurück
              </span>
            </p>
          )}
          {relations && (
            <Button
              className="ml-auto"
              variant="destructive"
              disabled={jobRunning || selectedNonFollowers.length === 0}
              onClick={() => startAutomation("unfollow", selectedNonFollowers)}
            >
              <UserMinus />
              Ausgewählten automatisch entfolgen ({selectedNonFollowers.length})
            </Button>
          )}
        </div>
        {relationsLoading && (
          <p className="text-sm text-muted-foreground">Lade Listen im Browserfenster …</p>
        )}
        {relationsError && <ErrorText>{relationsError}</ErrorText>}
        {relations && (
          <UserList
            platform={platform}
            users={nonFollowers}
            action="unfollow"
            rowState={rowState}
            selected={selectedUnfollow}
            onSelectedChange={setSelectedUnfollow}
            onAction={(user) => runSingle("unfollow", user)}
            disabled={jobRunning}
          />
        )}
      </Section>

      <Section
        title="Leuten aus einem anderen Account folgen"
        description="Gib einen Account ein und lade, wem er folgt (oder seine Follower). Dann einzeln folgen oder allen automatisch."
      >
        <form onSubmit={loadOtherList} className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-48 flex-1 flex-col gap-1 text-sm">
            Benutzername
            <input
              value={otherUsername}
              onChange={(e) => setOtherUsername(e.target.value)}
              placeholder="z. B. brandlo.de"
              className="h-9 rounded-lg border border-input bg-background px-2.5 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Liste
            <select
              value={otherType}
              onChange={(e) => setOtherType(e.target.value as ListType)}
              className="h-9 rounded-lg border border-input bg-background px-2 outline-none"
            >
              <option value="following">Wem folgt dieser Account</option>
              <option value="followers">Follower dieses Accounts</option>
            </select>
          </label>
          <label className="flex w-28 flex-col gap-1 text-sm">
            Max. Anzahl
            <input
              type="number"
              min={1}
              max={10000}
              value={otherLimit}
              onChange={(e) => setOtherLimit(Number(e.target.value) || 1)}
              className="h-9 rounded-lg border border-input bg-background px-2.5 outline-none"
            />
          </label>
          <Button type="submit" size="lg" disabled={otherLoading || !session?.loggedIn}>
            {otherLoading ? <Loader2 className="animate-spin" /> : <Search />}
            Anzeigen
          </Button>
        </form>
        {otherLoading && (
          <p className="text-sm text-muted-foreground">
            Lade Liste im Browserfenster … (beim ersten Mal wird auch deine eigene Gefolgt-Liste geladen)
          </p>
        )}
        {otherError && <ErrorText>{otherError}</ErrorText>}

        {otherList && (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm">
                <span className="font-medium">@{otherList.account.username}</span>{" "}
                <span className="text-muted-foreground">
                  – {otherList.users.length}{" "}
                  {otherList.type === "following" ? "Accounts, denen er folgt" : "Follower"} geladen
                </span>
              </p>
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  className="size-4 accent-primary"
                  checked={hideFollowed}
                  onChange={(e) => setHideFollowed(e.target.checked)}
                />
                Bereits gefolgte ausblenden
              </label>
              <div className="ml-auto flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  disabled={jobRunning || selectedOthers.length === 0}
                  onClick={() => startAutomation("follow", selectedOthers.filter((u) => !u.iFollow))}
                >
                  <UserPlus />
                  Ausgewählten folgen ({selectedOthers.length})
                </Button>
                <Button
                  disabled={jobRunning || followableOthers.length === 0}
                  onClick={() => startAutomation("follow", followableOthers)}
                >
                  <Play />
                  Allen automatisch folgen ({followableOthers.length})
                </Button>
              </div>
            </div>
            <UserList
              platform={platform}
              users={otherUsers}
              action="follow"
              rowState={rowState}
              selected={selectedFollow}
              onSelectedChange={setSelectedFollow}
              onAction={(user) => runSingle("follow", user)}
              disabled={jobRunning}
            />
          </>
        )}
      </Section>

      <Section title="Automatik-Einstellungen">
        <label className="flex items-center gap-3 text-sm">
          Pause zwischen zwei Aktionen
          <input
            type="number"
            min={3}
            max={600}
            value={delaySec}
            onChange={(e) => setDelaySec(Math.max(3, Number(e.target.value) || 5))}
            className="h-8 w-20 rounded-lg border border-input bg-background px-2.5 outline-none"
          />
          Sekunden
        </label>
        <p className="text-sm text-muted-foreground">
          Hinweis: {name} begrenzt, wie vielen Accounts man pro Stunde/Tag folgen oder entfolgen
          kann. Meldet {name} eine Sperre, stoppt die Automatik von selbst. Zu viele Aktionen können
          zu temporären Sperren deines Accounts führen.
        </p>
      </Section>
    </div>
  );
}
