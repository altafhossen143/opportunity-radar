import {
  useActionMutation,
  useActionQuery,
} from "@agent-native/core/client/hooks";
import { Link } from "react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

const STATUSES = ["tracking", "interested", "applied", "won", "lost"] as const;
type Status = (typeof STATUSES)[number];

const STATUS_LABEL: Record<Status, string> = {
  tracking: "Tracking",
  interested: "Interested",
  applied: "Applied",
  won: "Won",
  lost: "Lost",
};

const STATUS_STYLE: Record<Status, string> = {
  tracking: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  interested: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  applied: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  won: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  lost: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400",
};

export function daysLeft(deadline: string): number {
  const ms = Date.parse(deadline) - Date.now();
  return Math.ceil(ms / 86_400_000);
}

function DeadlineBadge({ deadline }: { deadline: string }) {
  const days = daysLeft(deadline);
  const label =
    days < 0
      ? `${Math.abs(days)}d overdue`
      : days === 0
        ? "due today"
        : days === 1
          ? "1 day left"
          : `${days} days left`;
  const tone =
    days < 0
      ? "bg-red-500/10 text-red-700 dark:text-red-300"
      : days <= 3
        ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
        : "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}
    >
      {label}
    </span>
  );
}

export function meta() {
  return [{ title: "Opportunities — Opportunity Radar" }];
}

export default function OpportunitiesPage() {
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [prizeText, setPrizeText] = useState("");
  const [deadline, setDeadline] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");

  const query = useActionQuery("list-opportunities", {
    ...(statusFilter === "all" ? {} : { status: statusFilter }),
  });
  const create = useActionMutation("create-opportunity", {
    onSuccess: () => {
      setTitle("");
      setPrizeText("");
      setDeadline("");
      setSourceUrl("");
      setShowForm(false);
      toast.success("Opportunity tracked.");
    },
    onError: (error) =>
      toast.error(
        error instanceof Error ? error.message : "Could not save it.",
      ),
  });

  const opportunities = query.data?.opportunities ?? [];

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Opportunities
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Prize campaigns, grants, and hackathons — soonest deadline first.
            Paste an announcement in chat and the agent extracts the details.
          </p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Close" : "Add manually"}
        </Button>
      </div>

      {showForm ? (
        <Card className="mb-5 p-4">
          <form
            className="grid gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!title.trim() || !deadline) return;
              create.mutate({
                title: title.trim(),
                prizeText: prizeText.trim() || undefined,
                deadline: new Date(`${deadline}T23:59:59`).toISOString(),
                sourceUrl: sourceUrl.trim() || undefined,
              });
            }}
          >
            <div className="grid gap-1.5">
              <Label htmlFor="opp-title">Title</Label>
              <Input
                id="opp-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Agent-Native Hackathon"
                required
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="opp-prize">Prize</Label>
                <Input
                  id="opp-prize"
                  value={prizeText}
                  onChange={(e) => setPrizeText(e.target.value)}
                  placeholder="$5,000"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="opp-deadline">Deadline</Label>
                <Input
                  id="opp-deadline"
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="opp-url">Official page URL</Label>
              <Input
                id="opp-url"
                type="url"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://…"
              />
            </div>
            <div>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? "Saving…" : "Track it"}
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      <div className="mb-4 flex flex-wrap gap-1.5">
        {(["all", ...STATUSES] as const).map((s) => (
          <Button
            key={s}
            variant={statusFilter === s ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(s)}
          >
            {s === "all" ? "All" : STATUS_LABEL[s]}
          </Button>
        ))}
      </div>

      {query.isPending ? (
        <div className="grid gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : query.isError ? (
        <p className="text-sm text-destructive">
          Could not load opportunities. Try refreshing.
        </p>
      ) : opportunities.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="font-medium">Nothing tracked yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Paste an announcement into the agent chat — it pulls out the prize,
            deadline, and requirements and saves it here.
          </p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {opportunities.map((opp) => (
            <Link key={opp.id} to={`/opportunities/${opp.id}`}>
              <Card className="p-4 transition-colors hover:bg-accent/50">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{opp.title}</p>
                    <p className="mt-0.5 truncate text-sm text-muted-foreground">
                      {[opp.organizer, opp.prizeText]
                        .filter(Boolean)
                        .join(" · ") || "No prize listed"}
                    </p>
                  </div>
                  <DeadlineBadge deadline={opp.deadline} />
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[opp.status]}`}
                  >
                    {STATUS_LABEL[opp.status]}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(opp.deadline).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                  {opp.entryCost === "free" ? (
                    <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      Free entry
                    </span>
                  ) : null}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
