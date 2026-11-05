import { defineAction, fail } from "@agent-native/core/action";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb, schema } from "../server/db/index.js";

export default defineAction({
  description: "Stop tracking an opportunity and delete it.",
  schema: z.object({
    id: z.string().describe("The opportunity id"),
  }),
  outputSchema: z.object({
    id: z.string(),
    deleted: z.boolean(),
    message: z.string(),
  }),
  run: async ({ id }, ctx) => {
    const ownerEmail = ctx?.userEmail;
    if (!ownerEmail) {
      fail("Sign in required.", {
        errorCode: "unauthorized",
        statusCode: 401,
      });
    }
    const db = getDb();
    const deleted = await db
      .delete(schema.opportunities)
      .where(
        and(
          eq(schema.opportunities.id, id),
          eq(schema.opportunities.ownerEmail, ownerEmail),
        ),
      )
      .returning({ id: schema.opportunities.id });
    if (deleted.length === 0) {
      fail("Opportunity not found.", {
        errorCode: "not_found",
        statusCode: 404,
      });
    }
    return { id, deleted: true, message: "Opportunity deleted." };
  },
});
