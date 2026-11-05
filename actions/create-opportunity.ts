import { defineAction, fail } from "@agent-native/core/action";
import { buildDeepLink } from "@agent-native/core/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb, schema } from "../server/db/index.js";
import {
  normalizeTitle,
  opportunitySchema,
  toIso,
  toOpportunity,
} from "../server/lib/opportunities.js";

export default defineAction({
  description:
    "Track a new opportunity (campaign, grant, hackathon, or call for entries) with its prize, deadline, and entry cost.",
  schema: z.object({
    title: z.string().min(1).describe("Opportunity name, e.g. 'Agent-Native Hackathon'"),
    organizer: z
      .string()
      .optional()
      .describe("Who runs it, e.g. 'Builder.io'"),
    prizeText: z
      .string()
      .optional()
      .describe("Prize as written, e.g. '$5,000' or '50,000 USDT pool'"),
    deadline: z
      .string()
      .describe(
        "Submission/entry deadline as ISO 8601 date or date-time with offset, e.g. '2026-11-10T13:59:00+06:00'",
      ),
    sourceUrl: z
      .string()
      .optional()
      .describe("Official announcement or entry page URL"),
    entryCost: z
      .enum(["free", "paid", "unknown"])
      .default("unknown")
      .describe(
        'Whether entering costs money: "free", "paid" or "unknown"; defaults to "unknown"',
      ),
    requirements: z
      .string()
      .optional()
      .describe("What entering needs, e.g. 'build an app + public demo clip'"),
    status: z
      .enum(["tracking", "interested", "applied", "won", "lost"])
      .default("tracking")
      .describe(
        'Tracking status: "tracking", "interested", "applied", "won" or "lost"; defaults to "tracking"',
      ),
    notes: z.string().optional().describe("Any extra notes"),
  }),
  outputSchema: opportunitySchema.extend({
    message: z.string(),
  }),
  link: ({ result }) => ({
    url: buildDeepLink({
      view: "opportunities",
      to: `/opportunities/${result.id}`,
    }),
    label: "Open opportunity",
  }),
  run: async (input, ctx) => {
    const ownerEmail = ctx?.userEmail;
    if (!ownerEmail) {
      fail("Sign in required.", {
        errorCode: "unauthorized",
        statusCode: 401,
      });
    }
    const deadline = toIso(input.deadline, "deadline");
    const normalized = normalizeTitle(input.title);
    const db = getDb();
    const saved = await db.transaction(async (tx) => {
      const sameDay = await tx
        .select()
        .from(schema.opportunities)
        .where(
          and(
            eq(schema.opportunities.ownerEmail, ownerEmail),
            eq(schema.opportunities.deadline, deadline),
          ),
        );
      if (sameDay.some((row) => normalizeTitle(row.title) === normalized)) {
        fail(
          `Already tracking "${input.title}" with the same deadline.`,
          { errorCode: "duplicate_opportunity", statusCode: 409 },
        );
      }
      const now = new Date().toISOString();
      const rows = await tx
        .insert(schema.opportunities)
        .values({
          id: crypto.randomUUID(),
          ownerEmail,
          title: input.title.trim(),
          organizer: input.organizer?.trim() ?? null,
          prizeText: input.prizeText?.trim() ?? null,
          deadline,
          sourceUrl: input.sourceUrl?.trim() ?? null,
          entryCost: input.entryCost,
          requirements: input.requirements?.trim() ?? null,
          status: input.status,
          notes: input.notes?.trim() ?? null,
          createdAt: now,
          updatedAt: now,
        })
        .returning();
      const created = rows[0];
      if (!created) {
        fail("Could not save the opportunity.", {
          errorCode: "action_failed",
        });
      }
      return created;
    });
    return {
      ...toOpportunity(saved),
      message: `Tracking "${saved.title}" — deadline ${saved.deadline}.`,
    };
  },
});
