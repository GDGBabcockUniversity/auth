const { query } = require("../config/database");

// Columns safe to return from the public endpoint. user_id and is_public
// never appear here — they're admin/internal only.
const PUBLIC_COLUMNS = `
  id, name, role, section, subteam, is_lead, image_url, words_to_live_by,
  twitter_url, linkedin_url, portfolio_url,
  spotify_track_name, spotify_track_artist, spotify_track_url,
  team_year, display_order
`;

const ADMIN_FIELDS = [
  "name",
  "role",
  "section",
  "subteam",
  "is_lead",
  "image_url",
  "words_to_live_by",
  "twitter_url",
  "linkedin_url",
  "portfolio_url",
  "spotify_track_name",
  "spotify_track_artist",
  "spotify_track_url",
  "team_year",
  "display_order",
  "user_id",
  "is_public",
];

/**
 * Team Model - Database operations for the public team roster
 */
class TeamModel {
  /**
   * Public roster listing — whitelisted columns only.
   * @returns {Array} Team members, ordered for display
   */
  static async listPublic() {
    const result = await query(
      `SELECT ${PUBLIC_COLUMNS} FROM team_members
       WHERE is_public = TRUE
       ORDER BY team_year, display_order, name`
    );
    return result.rows;
  }

  /**
   * Admin roster listing — every column, including inactive entries.
   * @returns {Array} All team members
   */
  static async listAdmin() {
    const result = await query(
      "SELECT * FROM team_members ORDER BY team_year, display_order, name"
    );
    return result.rows;
  }

  static async findById(id) {
    const result = await query("SELECT * FROM team_members WHERE id = $1", [id]);
    return result.rows[0] || null;
  }

  /**
   * Find by (name, team_year) — the natural key the importer upserts on.
   */
  static async findByNameAndYear(name, teamYear) {
    const result = await query(
      "SELECT * FROM team_members WHERE name = $1 AND team_year = $2",
      [name, teamYear]
    );
    return result.rows[0] || null;
  }

  /**
   * Create a team member.
   * @param {Object} data - Any subset of ADMIN_FIELDS; name/role/section required
   */
  static async create(data) {
    const columns = [];
    const placeholders = [];
    const values = [];
    let paramIndex = 1;

    for (const field of ADMIN_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(data, field)) {
        columns.push(field);
        placeholders.push(`$${paramIndex}`);
        values.push(data[field]);
        paramIndex++;
      }
    }

    const result = await query(
      `INSERT INTO team_members (${columns.join(", ")})
       VALUES (${placeholders.join(", ")})
       RETURNING *`,
      values
    );
    return result.rows[0];
  }

  /**
   * Upsert on the (name, team_year) natural key — used by the one-time
   * importer so re-running it never duplicates rows.
   */
  static async upsertByNameAndYear(data) {
    const columns = [];
    const placeholders = [];
    const values = [];
    let paramIndex = 1;

    for (const field of ADMIN_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(data, field)) {
        columns.push(field);
        placeholders.push(`$${paramIndex}`);
        values.push(data[field]);
        paramIndex++;
      }
    }

    const updateSet = columns
      .filter((c) => c !== "name" && c !== "team_year")
      .map((c) => `${c} = EXCLUDED.${c}`)
      .join(", ");

    const result = await query(
      `INSERT INTO team_members (${columns.join(", ")})
       VALUES (${placeholders.join(", ")})
       ON CONFLICT (name, team_year) DO UPDATE SET ${updateSet}
       RETURNING *`,
      values
    );
    return result.rows[0];
  }

  /**
   * Update a team member's fields.
   * @param {string} id - Team member ID
   * @param {Object} data - Any subset of ADMIN_FIELDS
   */
  static async update(id, data) {
    const updateFields = [];
    const values = [];
    let paramIndex = 1;

    for (const field of ADMIN_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(data, field)) {
        updateFields.push(`${field} = $${paramIndex}`);
        values.push(data[field]);
        paramIndex++;
      }
    }

    if (updateFields.length === 0) {
      throw new Error("No valid fields to update");
    }

    values.push(id);
    const result = await query(
      `UPDATE team_members SET ${updateFields.join(", ")} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    return result.rows[0] || null;
  }

  /**
   * Soft-delete — flips is_public off rather than removing the row, so
   * corrections stay recoverable through the same admin UI.
   */
  static async deactivate(id) {
    const result = await query(
      "UPDATE team_members SET is_public = FALSE WHERE id = $1 RETURNING *",
      [id]
    );
    return result.rows[0] || null;
  }
}

module.exports = TeamModel;
