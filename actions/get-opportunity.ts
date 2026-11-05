import { defineAction, fail } from "@agent-native/core/action";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb, schema } from "../server/db/index.js";
import {
  opportunitySchema,
  toOpportunity,
} from "../server/lib/opportunities.js";

export default defineAction({
  description: "Get one tracked opportunity by id.",
  schema: z.object({
    id: z.string().describe("The opportunity id"),
  }),
  outputSchema: z.object({ opportunity: opportunitySchema }),
  http: { method: "GET" },
  readOnly: true,
  run: async ({ id }, ctx) => {
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
        and(
          eq(schema.opportunities.id, id),
          eq(schema.opportunities.ownerEmail, ownerEmail),
        ),
      )
      .limit(1);
    const row = rows[0];
    if (!row) {
      fail("Opportunity not found.", {
        errorCode: "not_found",
        statusCode: 404,
      });
    }
    return { opportunity: toOpportunity(row) };
  },
});
