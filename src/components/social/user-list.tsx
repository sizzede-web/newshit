"use client";

import { useMemo, useState } from "react";
import { BadgeCheck, Check, Loader2, Lock, UserMinus, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { avatarSrc } from "@/lib/social/api";
import { cn } from "@/lib/utils";
import type { JobAction, Platform, SocialUser } from "@/types/social";

export interface RowState {
  status: "busy" | "done" | "skipped" | "error";
  message?: string;
}

interface UserListProps {
  platform: Platform;
  users: SocialUser[];
  action: JobAction;
  rowState: Record<string, RowState>;
  selected: Set<string>;
  onSelectedChange: (selected: Set<string>) => void;
  onAction: (user: SocialUser) => void;
  disabled?: boolean;
}

export function profileUrl(platform: Platform, username: string): string {
  return platform === "instagram"
    ? `https://www.instagram.com/${username}/`
    : `https://www.tiktok.com/@${username}`;
}

export function UserList({
  platform,
  users,
  action,
  rowState,
  selected,
  onSelectedChange,
  onAction,
  disabled,
}: UserListProps) {
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) => u.username.toLowerCase().includes(q) || u.fullName.toLowerCase().includes(q),
    );
  }, [users, query]);

  const allVisibleSelected = visible.length > 0 && visible.every((u) => selected.has(u.id));

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectedChange(next);
  }

  function toggleAll() {
    const next = new Set(selected);
    for (const u of visible) {
      if (allVisibleSelected) next.delete(u.id);
      else next.add(u.id);
    }
    onSelectedChange(next);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            className="size-4 accent-primary"
            checked={allVisibleSelected}
            onChange={toggleAll}
          />
          Alle
        </label>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Suchen…"
          className="h-8 flex-1 rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        <span className="text-xs text-muted-foreground tabular-nums">
          {selected.size} ausgewählt · {visible.length} angezeigt
        </span>
      </div>

      <ul className="max-h-[32rem] divide-y divide-border overflow-y-auto rounded-lg border border-border">
        {visible.length === 0 && (
          <li className="p-4 text-center text-sm text-muted-foreground">Keine Einträge.</li>
        )}
        {visible.map((user) => {
          const state = rowState[user.id];
          const finished = state?.status === "done" || state?.status === "skipped";
          return (
            <li key={user.id} className="flex items-center gap-3 px-3 py-2">
              <input
                type="checkbox"
                className="size-4 shrink-0 accent-primary"
                checked={selected.has(user.id)}
                onChange={() => toggle(user.id)}
                aria-label={`@${user.username} auswählen`}
              />
              {user.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarSrc(user.avatarUrl)}
                  alt=""
                  loading="lazy"
                  className="size-9 shrink-0 rounded-full bg-muted object-cover"
                />
              ) : (
                <div className="size-9 shrink-0 rounded-full bg-muted" />
              )}
              <div className="min-w-0 flex-1">
                <a
                  href={profileUrl(platform, user.username)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 truncate text-sm font-medium hover:underline"
                >
                  @{user.username}
                  {user.isVerified && <BadgeCheck className="size-3.5 text-sky-500" />}
                  {user.isPrivate && <Lock className="size-3 text-muted-foreground" />}
                </a>
                <p
                  className={cn(
                    "truncate text-xs",
                    state?.status === "error" ? "text-destructive" : "text-muted-foreground",
                  )}
                >
                  {state?.message ?? user.fullName}
                </p>
              </div>
              {action === "follow" && user.iFollow && !state ? (
                <span className="text-xs text-muted-foreground">Gefolgt</span>
              ) : (
                <Button
                  size="sm"
                  variant={action === "unfollow" ? "destructive" : "default"}
                  disabled={disabled || finished || state?.status === "busy"}
                  onClick={() => onAction(user)}
                >
                  {state?.status === "busy" ? (
                    <Loader2 className="animate-spin" />
                  ) : finished ? (
                    <Check />
                  ) : action === "unfollow" ? (
                    <UserMinus />
                  ) : (
                    <UserPlus />
                  )}
                  {finished
                    ? action === "unfollow"
                      ? "Entfolgt"
                      : "Gefolgt"
                    : action === "unfollow"
                      ? "Entfolgen"
                      : "Folgen"}
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
