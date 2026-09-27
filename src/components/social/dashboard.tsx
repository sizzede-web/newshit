"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Platform } from "@/types/social";
import { PlatformPanel } from "./platform-panel";

const TABS: { id: Platform; label: string }[] = [
  { id: "instagram", label: "Instagram" },
  { id: "tiktok", label: "TikTok" },
];

export function Dashboard() {
  const [active, setActive] = useState<Platform>("instagram");

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">brandlo.de</p>
          <h1 className="text-2xl font-semibold tracking-tight">Social Manager</h1>
        </div>
        <div className="inline-flex rounded-xl border border-border bg-muted p-1" role="tablist">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={active === tab.id}
              onClick={() => setActive(tab.id)}
              className={cn(
                "rounded-lg px-4 py-1.5 text-sm font-medium transition-colors",
                active === tab.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* Beide Panels bleiben gemountet, damit geladene Listen beim Tab-Wechsel erhalten bleiben. */}
      {TABS.map((tab) => (
        <div key={tab.id} hidden={active !== tab.id}>
          <PlatformPanel platform={tab.id} />
        </div>
      ))}
    </main>
  );
}
