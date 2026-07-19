#!/usr/bin/env node
// Applies the additive schema migrations in order against DATABASE_URL.
// Every migration is idempotent (CREATE ... IF NOT EXISTS, DROP TRIGGER IF
// EXISTS before CREATE), so re-running against an already-migrated database
// is safe. Intended for one-time production setup:
//   DATABASE_URL=<prod url> node scripts/apply-migrations.js
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { pool } = require("../src/config/database");

const MIGRATIONS = ["002_events.sql", "003_radar.sql", "004_team.sql", "005_wrapped.sql"];

async function main() {
  for (const name of MIGRATIONS) {
    const file = path.join(__dirname, "..", "database", "migrations", name);
    const sql = fs.readFileSync(file, "utf8");
    await pool.query(sql);
    console.log(`applied ${name}`);
  }
  await pool.end();
  console.log("All migrations applied.");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
