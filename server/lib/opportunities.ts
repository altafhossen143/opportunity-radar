import { fail } from "@agent-native/core/action";
import { z } from "zod";

import type { opportunities } from "../db/schema.js";

export type OpportunityRow = typeof opportunities.$inferSelect;

export const opportunitySchema = z.object({
  id: z.string(),
  title: z.string(),
  organizer: z.string().nullable(),
  prizeText: z.string().nullable(),
  deadline: z.string(),
  sourceUrl: z.string().nullable(),
  entryCost: z.enum(["free", "paid", "unknown"]),
  requirements: z.string().nullable(),
  status: z.enum(["tracking", "interested", "applied", "won", "lost"]),
  notes: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Opportunity = z.infer<typeof opportunitySchema>;

export function toOpportunity(row: OpportunityRow): Opportunity {
  return {
    id: row.id,
    title: row.title,
    organizer: row.organizer,
    prizeText: row.prizeText,
    deadline: row.deadline,
    sourceUrl: row.sourceUrl,
    entryCost: row.entryCost,
    requirements: row.requirements,
    status: row.status,
    notes: row.notes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/** Normalize any ISO 8601 date-time (with offset) to UTC ISO, or fail. */
export function toIso(value: string, field: string): string {
  if (
    !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:?\d{2})$/.test(value) &&
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    fail(`${field} must be an ISO 8601 date or date-time.`, {
      errorCode: "invalid_time",
    });
  }
  const ms = Date.parse(
    /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T23:59:59Z` : value,
  );
  if (Number.isNaN(ms)) {
    fail(`${field} must be an ISO 8601 date or date-time.`, {
      errorCode: "invalid_time",
    });
  }
  return new Date(ms).toISOString();
}

/** Normalize a title for duplicate comparison: trim + lowercase + collapse space. */
export function normalizeTitle(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, " ");
}
