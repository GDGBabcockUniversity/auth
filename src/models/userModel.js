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
      name,
      displayName,
      photoUrl,
      emailVerified,
      phoneNumber,
    } = userData;

    const result = await query(
      `INSERT INTO users 
        (firebase_uid, email, name, display_name, photo_url, email_verified, phone_number, last_login_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
       RETURNING *`,
      [
        firebaseUid,
        email,
        name,
        displayName,
        photoUrl,
        emailVerified,
        phoneNumber,
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
      "name",
      "display_name",
      "photo_url",
      "email_verified",
      "phone_number",
      "gdg_member",
      "roles",
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
        id, email, name, display_name, photo_url, email_verified,
        phone_number, gdg_member, roles, created_at, last_login_at
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
}

module.exports = UserModel;
