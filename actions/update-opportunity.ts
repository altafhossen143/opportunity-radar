import { defineAction, fail } from "@agent-native/core/action";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb, schema } from "../server/db/index.js";
import {
  opportunitySchema,
  toIso,
  toOpportunity,
} from "../server/lib/opportunities.js";

export default defineAction({
  description:
    "Update one tracked opportunity (status, prize, deadline, notes, or any other field).",
  schema: z.object({
    id: z.string().describe("The opportunity id"),
    title: z.string().min(1).optional().describe("Opportunity name"),
    organizer: z.string().optional().describe("Who runs it"),
    prizeText: z.string().optional().describe("Prize as written"),
    deadline: z
      .string()
      .optional()
      .describe("Deadline as ISO 8601 date or date-time with offset"),
    sourceUrl: z.string().optional().describe("Official page URL"),
    entryCost: z
      .enum(["free", "paid", "unknown"])
      .optional()
      .describe('Whether entering costs money: "free", "paid" or "unknown"'),
    requirements: z.string().optional().describe("What entering needs"),
    status: z
      .enum(["tracking", "interested", "applied", "won", "lost"])
      .optional()
      .describe(
        'Tracking status: "tracking", "interested", "applied", "won" or "lost"',
      ),
    notes: z.string().optional().describe("Any extra notes"),
  }),
  outputSchema: opportunitySchema.extend({
    message: z.string(),
  }),
  run: async (input, ctx) => {
    const ownerEmail = ctx?.userEmail;
    if (!ownerEmail) {
      fail("Sign in required.", {
        errorCode: "unauthorized",
        statusCode: 401,
      });
    }
    const db = getDb();
    const existing = await db
      .select()
      .from(schema.opportunities)
      .where(
        and(
          eq(schema.opportunities.id, input.id),
          eq(schema.opportunities.ownerEmail, ownerEmail),
        ),
      )
      .limit(1);
    const row = existing[0];
    if (!row) {
      fail("Opportunity not found.", {
        errorCode: "not_found",
        statusCode: 404,
      });
    }
    const patch: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };
    if (input.title !== undefined) patch.title = input.title.trim();
    if (input.organizer !== undefined)
      patch.organizer = input.organizer.trim() || null;
    if (input.prizeText !== undefined)
      patch.prizeText = input.prizeText.trim() || null;
    if (input.deadline !== undefined)
      patch.deadline = toIso(input.deadline, "deadline");
    if (input.sourceUrl !== undefined)
      patch.sourceUrl = input.sourceUrl.trim() || null;
    if (input.entryCost !== undefined) patch.entryCost = input.entryCost;
    if (input.requirements !== undefined)
      patch.requirements = input.requirements.trim() || null;
    if (input.status !== undefined) patch.status = input.status;
    if (input.notes !== undefined) patch.notes = input.notes.trim() || null;
    const updated = await db
      .update(schema.opportunities)
      .set(patch)
      .where(eq(schema.opportunities.id, input.id))
      .returning();
    const saved = updated[0];
    if (!saved) {
      fail("Opportunity not found.", {
        errorCode: "not_found",
        statusCode: 404,
      });
    }
    return {
      ...toOpportunity(saved),
      message: `Updated "${saved.title}".`,
    };
  },
});
