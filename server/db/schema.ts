import { sql } from "drizzle-orm";
import { index, pgTable, text } from "drizzle-orm/pg-core";

export const opportunities = pgTable(
  "opportunities",
  {
    id: text("id").primaryKey(),
    ownerEmail: text("owner_email").notNull(),
    title: text("title").notNull(),
    organizer: text("organizer"),
    prizeText: text("prize_text"),
    // ISO 8601 UTC date-time string (Date#toISOString output); string order
    // equals time order, so deadline sorting/comparison works on text.
    deadline: text("deadline").notNull(),
    sourceUrl: text("source_url"),
    entryCost: text("entry_cost", {
      enum: ["free", "paid", "unknown"],
    })
      .notNull()
      .default("unknown"),
    requirements: text("requirements"),
    status: text("status", {
      enum: ["tracking", "interested", "applied", "won", "lost"],
    })
      .notNull()
      .default("tracking"),
    notes: text("notes"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`now()`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`now()`),
  },
  (table) => [
    index("opportunities_owner_deadline_idx").on(
      table.ownerEmail,
      table.deadline,
    ),
  ],
);
