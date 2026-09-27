"use client";

import { Loader2, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Job } from "@/types/social";

const STATUS_LABEL: Record<Job["status"], string> = {
  running: "Läuft",
  done: "Fertig",
  cancelled: "Gestoppt",
  blocked: "Von der Plattform gebremst",
  error: "Fehler",
};

export function JobCard({ job, onCancel }: { job: Job; onCancel: () => void }) {
  const processed = job.items.filter((i) => i.status !== "pending").length;
  const done = job.items.filter((i) => i.status === "done").length;
  const errors = job.items.filter((i) => i.status === "error").length;
  const skipped = job.items.filter((i) => i.status === "skipped").length;
  const current = job.status === "running" ? job.items[job.index] : undefined;
  const verb = job.action === "follow" ? "Folgen" : "Entfolgen";

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-muted/40 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          {job.status === "running" && <Loader2 className="size-4 animate-spin" />}
          Automatik ({verb}, {job.delayMs / 1000}s Pause): {STATUS_LABEL[job.status]}
        </div>
        {job.status === "running" && (
          <Button size="sm" variant="outline" onClick={onCancel}>
            <Square />
            Stoppen
          </Button>
        )}
      </div>
      <progress className="h-2 w-full accent-primary" max={job.items.length} value={processed} />
      <p className="text-xs text-muted-foreground tabular-nums">
        {processed}/{job.items.length} bearbeitet · {done} erfolgreich · {skipped} übersprungen ·{" "}
        {errors} Fehler
        {current && ` · gerade: @${current.user.username}`}
      </p>
      {job.message && job.status !== "done" && (
        <p className={job.status === "blocked" || job.status === "error" ? "text-sm text-destructive" : "text-sm"}>
          {job.message}
        </p>
      )}
    </div>
  );
}
