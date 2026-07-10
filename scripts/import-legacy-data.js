#!/usr/bin/env node
// One-time import: loads scripts/data/*.json (produced by
// GDGWebsite/scripts/export-legacy-data.mjs) directly into Postgres.
// Idempotent — safe to re-run; both target tables upsert on their natural
// keys (member_seed_data.email, team_members(name, team_year)).
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { query, pool } = require("../src/config/database");
const TeamModel = require("../src/models/teamModel");

async function importMemberSeedData() {
  const filePath = path.join(__dirname, "data", "member-seed-data.json");
  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const entries = Object.entries(data);

  for (const [email, profile] of entries) {
    await query(
      `INSERT INTO member_seed_data (email, profile) VALUES ($1, $2)
       ON CONFLICT (email) DO UPDATE SET profile = EXCLUDED.profile`,
      [email.toLowerCase().trim(), JSON.stringify(profile)]
    );
  }

  return entries.length;
}

async function importTeamMembers() {
  const filePath = path.join(__dirname, "data", "team-members.json");
  const members = JSON.parse(fs.readFileSync(filePath, "utf8"));
  let linked = 0;

  for (const m of members) {
    const { linking_email, ...fields } = m;
    let userId = null;

    if (linking_email) {
      const result = await query("SELECT id FROM users WHERE email = $1", [linking_email]);
      userId = result.rows[0]?.id || null;
      if (userId) linked++;
    }

    await TeamModel.upsertByNameAndYear({ ...fields, user_id: userId });
  }

  return { total: members.length, linked };
}

async function main() {
  console.log("Importing member_seed_data...");
  const seedCount = await importMemberSeedData();
  console.log(`  ${seedCount} seed profiles imported.`);

  console.log("Importing team_members...");
  const { total, linked } = await importTeamMembers();
  console.log(`  ${total} team members imported (${linked} linked to an existing user_id).`);

  await pool.end();
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
