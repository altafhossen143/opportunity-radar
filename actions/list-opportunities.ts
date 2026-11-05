import { defineAction, fail } from "@agent-native/core/action";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb, schema } from "../server/db/index.js";
import {
  opportunitySchema,
  toOpportunity,
} from "../server/lib/opportunities.js";

export default defineAction({
  description:
    "List the current user's tracked opportunities, soonest deadline first.",
  schema: z.object({
    status: z
      .enum(["tracking", "interested", "applied", "won", "lost"])
      .optional()
      .describe(
        'Filter by status: "tracking", "interested", "applied", "won" or "lost"; omit for all',
      ),
    limit: z
      .number()
      .int()
      .min(1)
      .max(200)
      .default(100)
      .describe("Maximum opportunities to return; defaults to 100"),
  }),
  outputSchema: z.object({
    opportunities: z.array(opportunitySchema),
  }),
  http: { method: "GET" },
  readOnly: true,
  run: async ({ status, limit }, ctx) => {
    const ownerEmail = ctx?.userEmail;
    if (!ownerEmail) {
      fail("Sign in required.", {
        errorCode: "unauthorized",
        statusCode: 401,
      });
    }
    const db = getDb();
    const rows = await db
      .select()
      .from(schema.opportunities)
      .where(
        status
          ? and(
              eq(schema.opportunities.ownerEmail, ownerEmail),
              eq(schema.opportunities.status, status),
            )
          : eq(schema.opportunities.ownerEmail, ownerEmail),
      )
      .orderBy(asc(schema.opportunities.deadline))
      .limit(limit);
    return { opportunities: rows.map(toOpportunity) };
  },
});
