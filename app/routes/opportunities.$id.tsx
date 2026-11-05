import {
  useActionMutation,
  useActionQuery,
} from "@agent-native/core/client/hooks";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { daysLeft } from "./opportunities._index";

const STATUSES = ["tracking", "interested", "applied", "won", "lost"] as const;
type Status = (typeof STATUSES)[number];

const STATUS_LABEL: Record<Status, string> = {
  tracking: "Tracking",
  interested: "Interested",
  applied: "Applied",
  won: "Won",
  lost: "Lost",
};

export function meta() {
  return [{ title: "Opportunity — Opportunity Radar" }];
}

export default function OpportunityDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [notesDraft, setNotesDraft] = useState<string | null>(null);

  const query = useActionQuery("get-opportunity", { id: id ?? "" });
  const update = useActionMutation("update-opportunity", {
    onSuccess: () => {
      setNotesDraft(null);
      toast.success("Saved.");
    },
    onError: (error) =>
      toast.error(
        error instanceof Error ? error.message : "Could not save it.",
      ),
  });
  const remove = useActionMutation("delete-opportunity", {
    onSuccess: () => {
      toast.success("Opportunity deleted.");
      navigate("/opportunities");
    },
    onError: (error) =>
      toast.error(
        error instanceof Error ? error.message : "Could not delete it.",
      ),
  });

  const opp = query.data?.opportunity;
  const days = opp ? daysLeft(opp.deadline) : null;

  if (query.isPending) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-6">
        <Skeleton className="h-8 w-2/3 rounded-lg" />
        <Skeleton className="mt-4 h-40 w-full rounded-xl" />
      </div>
    );
  }

  if (query.isError || !opp) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-6">
        <p className="text-sm text-destructive">
          This opportunity could not be found.
        </p>
        <Link to="/opportunities" className="mt-2 inline-block">
          <Button variant="outline">Back to opportunities</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <Link
        to="/opportunities"
        className="text-sm text-muted-foreground hover:underline"
      >
        ← Opportunities
      </Link>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">
        {opp.title}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {opp.organizer ?? "Unknown organizer"}
        {opp.prizeText ? ` · ${opp.prizeText}` : ""}
      </p>

      <Card className="mt-5 p-4">
        <dl className="grid gap-3 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Deadline</dt>
            <dd className="font-medium">
              {new Date(opp.deadline).toLocaleString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
              {days !== null
                ? ` (${days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? "due today" : `${days}d left`})`
                : ""}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Entry cost</dt>
            <dd className="font-medium">{opp.entryCost}</dd>
          </div>
          {opp.sourceUrl ? (
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Official page</dt>
              <dd>
                <a
                  href={opp.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-primary hover:underline"
                >
                  Open ↗
                </a>
              </dd>
            </div>
          ) : null}
          {opp.requirements ? (
            <div>
              <dt className="text-muted-foreground">Requirements</dt>
              <dd className="mt-1 whitespace-pre-wrap">{opp.requirements}</dd>
            </div>
          ) : null}
        </dl>
      </Card>

      <Card className="mt-4 p-4">
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="opp-status">Status</Label>
            <select
              id="opp-status"
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={opp.status}
              onChange={(e) =>
                update.mutate({
                  id: opp.id,
                  status: e.target.value as Status,
                })
              }
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="opp-notes">Notes</Label>
            <textarea
              id="opp-notes"
              className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={notesDraft ?? opp.notes ?? ""}
              onChange={(e) => setNotesDraft(e.target.value)}
              placeholder="Add notes…"
            />
            {notesDraft !== null ? (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={update.isPending}
                  onClick={() =>
                    update.mutate({ id: opp.id, notes: notesDraft })
                  }
                >
                  Save notes
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setNotesDraft(null)}
                >
                  Cancel
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </Card>

      <div className="mt-5">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive">Stop tracking</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Stop tracking this opportunity?</AlertDialogTitle>
              <AlertDialogDescription>
                “{opp.title}” will be deleted. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep it</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => remove.mutate({ id: opp.id })}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
