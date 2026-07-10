#!/usr/bin/env node
// Grants the admin role to an existing user by email. This is the bootstrap
// path for the very first admin — PUT /admin/users/:id needs a caller who is
// already an admin, so someone has to be set at the database level once.
// After that, further admins can be granted from the website's admin Users
// page. Usage:
//   DATABASE_URL=<prod url> node scripts/grant-admin.js someone@example.com
require("dotenv").config();
const { pool } = require("../src/config/database");

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: node scripts/grant-admin.js <email>");
    process.exit(1);
  }

  const result = await pool.query(
    `UPDATE users
     SET roles = ARRAY['user','admin']::text[], updated_at = CURRENT_TIMESTAMP
     WHERE LOWER(email) = LOWER($1)
     RETURNING email, roles`,
    [email]
  );
  await pool.end();

  if (result.rowCount === 0) {
    console.error(
      `No user found with email ${email} — they must have signed in on the site at least once first.`
    );
    process.exit(1);
  }

  console.log(`${result.rows[0].email} now has roles: ${result.rows[0].roles.join(", ")}`);
  console.log(
    "Roles are baked into the login token — sign out and back in on the site before opening admin pages."
  );
}

main().catch((err) => {
  console.error("Grant failed:", err);
  process.exit(1);
});
