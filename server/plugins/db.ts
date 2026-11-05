import { runMigrations } from "@agent-native/core/db";

export default runMigrations(
  [
    {
      version: 1,
      name: "opportunities",
      sql: `CREATE TABLE IF NOT EXISTS opportunities (
  id TEXT PRIMARY KEY,
  owner_email TEXT NOT NULL,
  title TEXT NOT NULL,
  organizer TEXT,
  prize_text TEXT,
  deadline TEXT NOT NULL,
  source_url TEXT,
  entry_cost TEXT NOT NULL DEFAULT 'unknown' CHECK (entry_cost IN ('free', 'paid', 'unknown')),
  requirements TEXT,
  status TEXT NOT NULL DEFAULT 'tracking' CHECK (status IN ('tracking', 'interested', 'applied', 'won', 'lost')),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (now()),
  updated_at TEXT NOT NULL DEFAULT (now())
);
CREATE INDEX IF NOT EXISTS opportunities_owner_deadline_idx ON opportunities (owner_email, deadline);`,
    },
  ],
  { table: "opportunities_app_migrations" },
);
