const { query } = require("../config/database");

/**
 * User Model - Database operations for users
 */
class UserModel {
  /**
   * Find user by Firebase UID
   * @param {string} firebaseUid - Firebase UID
   * @returns {Object|null} User object or null
   */
  static async findByFirebaseUid(firebaseUid) {
    const result = await query(
      "SELECT * FROM users WHERE firebase_uid = $1 AND is_active = TRUE",
      [firebaseUid]
    );
    return result.rows[0] || null;
  }

  /**
   * Find user by internal ID
   * @param {string} userId - Internal user ID (UUID)
   * @returns {Object|null} User object or null
   */
  static async findById(userId) {
    const result = await query(
      "SELECT * FROM users WHERE id = $1 AND is_active = TRUE",
      [userId]
    );
    return result.rows[0] || null;
  }

  /**
   * Find user by email
   * @param {string} email - User email
   * @returns {Object|null} User object or null
   */
  static async findByEmail(email) {
    const result = await query(
      "SELECT * FROM users WHERE email = $1 AND is_active = TRUE",
      [email]
    );
    return result.rows[0] || null;
  }

  /**
   * Create new user
   * @param {Object} userData - User data from Firebase
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
      // Optional fields
      gender,
      birthday,
      studentStatus,
      matricNo,
      department,
      faculty,
      primaryTrack,
      secondaryTrack,
      primarySkillLevel,
      secondarySkillLevel,
      teams,
    } = userData;

    const result = await query(
      `INSERT INTO users 
        (firebase_uid, email, full_name, avatar_url, email_verified, whatsapp_number,
         gender, birthday, student_status, matric_no, department, faculty,
         primary_track, secondary_track, primary_skill_level, secondary_skill_level,
         teams, last_login_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, CURRENT_TIMESTAMP)
       RETURNING *`,
      [
        firebaseUid,
        email,
        fullName || email.split("@")[0],
        avatarUrl,
        emailVerified || false,
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
        secondarySkillLevel,
        teams || [],
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
    const allowedFields = [
      "full_name",
      "whatsapp_number",
      "avatar_url",
      "email_verified",
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
      "teams",
      "roles",
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
   * Soft delete user
   * @param {string} userId - Internal user ID
   */
  static async softDelete(userId) {
    await query(
      "UPDATE users SET is_active = FALSE, deleted_at = CURRENT_TIMESTAMP WHERE id = $1",
      [userId]
    );
  }

  /**
   * Get user profile (safe fields only)
   * @param {string} userId - Internal user ID
   * @returns {Object} User profile
   */
  static async getProfile(userId) {
    const result = await query(
      `SELECT 
        id, firebase_uid, email, full_name, whatsapp_number, avatar_url, email_verified,
        gender, birthday, student_status, matric_no, department, faculty,
        primary_track, secondary_track, primary_skill_level, secondary_skill_level,
        teams, roles, tos_agreed, tos_agreed_at, tos_version,
        created_at, updated_at, last_login_at
       FROM users 
       WHERE id = $1 AND is_active = TRUE`,
      [userId]
    );
    return result.rows[0] || null;
  }

  /**
   * Check if user has specific role
   * @param {string} userId - Internal user ID
   * @param {string} role - Role to check
   * @returns {boolean} True if user has role
   */
  static async hasRole(userId, role) {
    const result = await query(
      "SELECT roles FROM users WHERE id = $1 AND is_active = TRUE",
      [userId]
    );

    if (!result.rows[0]) return false;
    return result.rows[0].roles.includes(role);
  }

  /**
   * Add role to user
   * @param {string} userId - Internal user ID
   * @param {string} role - Role to add
   */
  static async addRole(userId, role) {
    await query(
      `UPDATE users 
       SET roles = array_append(roles, $2)
       WHERE id = $1 AND NOT ($2 = ANY(roles))`,
      [userId, role]
    );
  }

  /**
   * Remove role from user
   * @param {string} userId - Internal user ID
   * @param {string} role - Role to remove
   */
  static async removeRole(userId, role) {
    await query(
      "UPDATE users SET roles = array_remove(roles, $2) WHERE id = $1",
      [userId, role]
    );
  }

  /**
   * Add team to user
   * @param {string} userId - Internal user ID
   * @param {string} team - Team to add
   */
  static async addTeam(userId, team) {
    await query(
      `UPDATE users 
       SET teams = array_append(teams, $2)
       WHERE id = $1 AND NOT ($2 = ANY(teams))`,
      [userId, team]
    );
  }

  /**
   * Remove team from user
   * @param {string} userId - Internal user ID
   * @param {string} team - Team to remove
   */
  static async removeTeam(userId, team) {
    await query(
      "UPDATE users SET teams = array_remove(teams, $2) WHERE id = $1",
      [userId, team]
    );
  }

  /**
   * Check if user has agreed to TOS
   * @param {string} userId - Internal user ID
   * @returns {boolean} True if user has agreed to current TOS
   */
  static async hasTOSAgreed(userId) {
    const result = await query(
      "SELECT tos_agreed FROM users WHERE id = $1 AND is_active = TRUE",
      [userId]
    );

    if (!result.rows[0]) return false;
    return result.rows[0].tos_agreed;
  }

  /**
   * Record TOS agreement
   * @param {string} userId - Internal user ID
   * @param {string} version - TOS version
   */
  static async recordTOSAgreement(userId, version) {
    await query(
      `UPDATE users 
       SET tos_agreed = TRUE, tos_agreed_at = CURRENT_TIMESTAMP, tos_version = $2
       WHERE id = $1`,
      [userId, version]
    );
  }

  /**
   * Get users by track
   * @param {string} track - Track name
   * @returns {Array} Users with that track
   */
  static async getUsersByTrack(track) {
    const result = await query(
      `SELECT id, email, full_name, primary_track, secondary_track, primary_skill_level
       FROM users 
       WHERE (primary_track = $1 OR secondary_track = $1) AND is_active = TRUE`,
      [track]
    );
    return result.rows;
  }

  /**
   * Get users by team
   * @param {string} team - Team name
   * @returns {Array} Users in that team
   */
  static async getUsersByTeam(team) {
    const result = await query(
      `SELECT id, email, full_name, teams, roles
       FROM users 
       WHERE $1 = ANY(teams) AND is_active = TRUE`,
      [team]
    );
    return result.rows;
  }

  /**
   * Get students by department
   * @param {string} department - Department name
   * @returns {Array} Students in that department
   */
  static async getStudentsByDepartment(department) {
    const result = await query(
      `SELECT id, email, full_name, matric_no, department, faculty, student_status
       FROM users 
       WHERE department = $1 AND is_active = TRUE`,
      [department]
    );
    return result.rows;
  }
}

module.exports = UserModel;
