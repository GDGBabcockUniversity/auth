const { query } = require("../config/database");

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
   * Create new user
   * @param {Object} userData - User data from Firebase
   * @returns {Object} Created user object
   */
  static async create(userData) {
    const { firebaseUid, email, fullName, avatarUrl, emailVerified } = userData;

    const result = await query(
      `INSERT INTO users (firebase_uid, email, full_name, avatar_url, email_verified, last_login_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
       RETURNING *`,
      [
        firebaseUid,
        email,
        fullName || email.split("@")[0],
        avatarUrl,
        emailVerified || false,
      ]
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
   * Get the profile's Activity tile data. Only events_attended is backed by
   * real data so far (Phase 1 = events only); stars/streak/radar_* stay
   * omitted so the website's getActivity() falls back to its "—" placeholder
   * for fields no service writes yet (see lib/member.ts on GDGWebsite).
   * @param {string} userId - Internal user ID
   * @returns {Object} { events_attended }
   */
  static async getActivity(userId) {
    const result = await query(
      "SELECT COUNT(*)::int AS events_attended FROM event_checkins WHERE user_id = $1",
      [userId]
    );
    return { events_attended: result.rows[0].events_attended };
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
