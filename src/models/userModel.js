const { query } = require("../config/database");
const RadarModel = require("./radarModel");

/**
 * User Model - Database operations for users (Simplified)
 */
class UserModel {
  /**
   * Find user by Firebase UID
   * @param {string} firebaseUid - Firebase UID
   * @returns {Object|null} User object or null
   */
  static async findByFirebaseUid(firebaseUid) {
    const result = await query("SELECT * FROM users WHERE firebase_uid = $1", [
      firebaseUid,
    ]);
    return result.rows[0] || null;
  }

  /**
   * Find user by email
   * @param {string} email - User email
   * @returns {Object|null} User object or null
   */
  static async findByEmail(email) {
    const result = await query("SELECT * FROM users WHERE email = $1", [email]);
    return result.rows[0] || null;
  }

  /**
   * Create new user. Accepts the Firebase-derived identity fields plus
   * optional seed-data fields (see getSeedProfile) — all seed columns
   * already exist on `users`, so a first-login prefill is one INSERT, not
   * a create-then-update.
   * @param {Object} userData - User data from Firebase + optional seed data
   * @returns {Object} Created user object
   */
  static async create(userData) {
    const {
      firebaseUid,
      email,
      fullName,
      avatarUrl,
      emailVerified,
      whatsappNumber,
      gender,
      birthday,
      studentStatus,
      matricNo,
      department,
      faculty,
      primaryTrack,
      secondaryTrack,
      primarySkillLevel,
    } = userData;

    const result = await query(
      `INSERT INTO users (
         firebase_uid, email, full_name, avatar_url, email_verified, last_login_at,
         whatsapp_number, gender, birthday, student_status, matric_no,
         department, faculty, primary_track, secondary_track, primary_skill_level
       )
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING *`,
      [
        firebaseUid,
        email,
        fullName || email.split("@")[0],
        avatarUrl,
        emailVerified || false,
        whatsappNumber || null,
        gender || null,
        birthday || null,
        studentStatus || null,
        matricNo || null,
        department || null,
        faculty || null,
        primaryTrack || null,
        secondaryTrack || null,
        primarySkillLevel || null,
      ]
    );

    return result.rows[0];
  }

  /**
   * Look up first-login autofill data by email (see database/migrations/004_team.sql).
   * Replaces the old client-side lookup that shipped 230 members' seed data
   * (whatsapp numbers, birthdays, ...) in the public JS bundle.
   * @param {string} email - User email
   * @returns {Object|null} Seed profile fields, or null if none on file
   */
  static async getSeedProfile(email) {
    const result = await query(
      "SELECT profile FROM member_seed_data WHERE email = $1",
      [email.toLowerCase().trim()]
    );
    return result.rows[0]?.profile || null;
  }

  /**
   * Point an existing account at a new Firebase identity. Firebase treats
   * email/password and Google (etc.) as separate, unlinked identities for
   * the same email address — when a member who signed up one way signs in
   * a different way, this keeps them as the same platform account instead
   * of colliding with the email UNIQUE constraint on a second INSERT.
   * @param {string} userId - Internal user ID
   * @param {string} firebaseUid - The new Firebase UID to link
   * @returns {Object} Updated user object
   */
  static async relinkFirebaseUid(userId, firebaseUid) {
    const result = await query(
      `UPDATE users SET firebase_uid = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [firebaseUid, userId]
    );
    return result.rows[0];
  }

  /**
   * Update user information
   * @param {string} userId - Internal user ID
   * @param {Object} updates - Fields to update
   * @returns {Object} Updated user object
   */
  static async update(userId, updates) {
    // A simplified list of fields a user can update on their own profile
    const allowedFields = [
      "full_name",
      "whatsapp_number",
      "avatar_url",
      "gender",
      "birthday",
      "student_status",
      "matric_no",
      "department",
      "faculty",
      "primary_track",
      "secondary_track",
      "primary_skill_level",
      "secondary_skill_level",
      "tos_agreed",
      "tos_agreed_at",
      "tos_version",
    ];
    const updateFields = [];
    const values = [];
    let paramIndex = 1;

    Object.keys(updates).forEach((key) => {
      if (allowedFields.includes(key)) {
        updateFields.push(`${key} = $${paramIndex}`);
        values.push(updates[key]);
        paramIndex++;
      }
    });

    if (updateFields.length === 0) {
      throw new Error("No valid fields to update");
    }

    values.push(userId);
    const result = await query(
      `UPDATE users 
       SET ${updateFields.join(", ")}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );

    return result.rows[0];
  }

  /**
   * Admin-only update — a separate, narrower allowlist from the self-serve
   * `update` above. Only an admin-gated route may call this.
   * @param {string} userId - Internal user ID
   * @param {Object} updates - Subset of { roles, teams, is_active }
   * @returns {Object|null} Updated user object, or null if not found
   */
  static async adminUpdate(userId, updates) {
    const allowedFields = ["roles", "teams", "is_active"];
    const updateFields = [];
    const values = [];
    let paramIndex = 1;

    Object.keys(updates).forEach((key) => {
      if (allowedFields.includes(key)) {
        updateFields.push(`${key} = $${paramIndex}`);
        values.push(updates[key]);
        paramIndex++;
      }
    });

    if (updateFields.length === 0) {
      throw new Error("No valid fields to update");
    }

    values.push(userId);
    const result = await query(
      `UPDATE users
       SET ${updateFields.join(", ")}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramIndex}
       RETURNING id, email, full_name, avatar_url, roles, teams, is_active, created_at, last_login_at`,
      values
    );

    return result.rows[0] || null;
  }

  /**
   * Admin roster search/list — paginated, optionally filtered by name/email
   * substring and/or a single role.
   * @param {Object} opts - { search, role, page, limit }
   * @returns {Object} { users, total, page, limit }
   */
  static async adminList({ search, role, page = 1, limit = 20 } = {}) {
    const conditions = [];
    const values = [];
    let paramIndex = 1;

    if (search) {
      conditions.push(`(full_name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`);
      values.push(`%${search}%`);
      paramIndex++;
    }
    if (role) {
      conditions.push(`$${paramIndex} = ANY(roles)`);
      values.push(role);
      paramIndex++;
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const safePage = Math.max(parseInt(page, 10) || 1, 1);
    const offset = (safePage - 1) * safeLimit;

    const [rowsResult, countResult] = await Promise.all([
      query(
        `SELECT id, email, full_name, avatar_url, roles, teams, is_active, created_at, last_login_at
         FROM users
         ${whereClause}
         ORDER BY created_at DESC
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...values, safeLimit, offset]
      ),
      query(`SELECT COUNT(*)::int AS total FROM users ${whereClause}`, values),
    ]);

    return {
      users: rowsResult.rows,
      total: countResult.rows[0].total,
      page: safePage,
      limit: safeLimit,
    };
  }

  /**
   * Update last login timestamp
   * @param {string} userId - Internal user ID
   */
  static async updateLastLogin(userId) {
    await query(
      "UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1",
      [userId]
    );
  }

  /**
   * Find user by internal ID (minimal fields)
   * @param {string} userId - Internal user ID
   * @returns {Object|null} User with id/full_name or null
   */
  static async findById(userId) {
    const result = await query("SELECT id, full_name FROM users WHERE id = $1", [
      userId,
    ]);
    return result.rows[0] || null;
  }

  /**
   * Get public user profile
   * @param {string} userId - Internal user ID
   * @returns {Object} User profile
   */
  static async getProfile(userId) {
    const result = await query(
      `SELECT id, email, full_name, avatar_url, student_status, primary_track, teams, roles, tos_agreed, created_at
       FROM users
       WHERE id = $1`,
      [userId]
    );
    return result.rows[0] || null;
  }

  /**
   * Get the profile's Activity tile data. events_attended (Phase 1) and
   * radar_articles_read / radar_reading_minutes (Phase 2) are backed by real
   * data; stars/streak stay omitted so the website's getActivity() falls
   * back to its "—" placeholder for fields no service writes yet (see
   * lib/member.ts on GDGWebsite).
   * @param {string} userId - Internal user ID
   * @returns {Object} { events_attended, radar_articles_read, radar_reading_minutes }
   */
  static async getActivity(userId) {
    const [eventsResult, radarActivity] = await Promise.all([
      query(
        "SELECT COUNT(*)::int AS events_attended FROM event_checkins WHERE user_id = $1",
        [userId]
      ),
      RadarModel.getReadingActivity(userId),
    ]);
    return {
      events_attended: eventsResult.rows[0].events_attended,
      radar_articles_read: radarActivity.radar_articles_read,
      radar_reading_minutes: radarActivity.radar_reading_minutes,
    };
  }

  /**
   * Team roster membership for the profile page's volunteer badge — only
   * returns a linked, still-public team_members row.
   * @param {string} userId - Internal user ID
   * @returns {Object|null} { role, section, subteam } or null
   */
  static async getTeamMembership(userId) {
    const result = await query(
      `SELECT role, section, subteam FROM team_members
       WHERE user_id = $1 AND is_public = TRUE
       LIMIT 1`,
      [userId]
    );
    return result.rows[0] || null;
  }

  /**
   * Get issued certificates shaped to match GDGWebsite's MemberCertificate
   * type exactly: { id, title, event, issued_at, url }.
   * @param {string} userId - Internal user ID
   * @returns {Array} Certificates, most recently issued first
   */
  static async getCertificates(userId) {
    const result = await query(
      `SELECT c.id, c.title, e.title AS event, c.issued_at, c.download_url AS url
       FROM certificates c
       LEFT JOIN events e ON e.id = c.event_id
       WHERE c.user_id = $1 AND c.status = 'issued'
       ORDER BY c.issued_at DESC`,
      [userId]
    );
    return result.rows;
  }
}

module.exports = UserModel;
