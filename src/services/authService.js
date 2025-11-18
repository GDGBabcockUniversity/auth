const { admin } = require("../config/firebase");
const { query } = require("../config/database");
const UserModel = require("../models/userModel");
const { generateAccessToken, generateRefreshToken } = require("../utils/jwt");
const crypto = require("crypto");

/**
 * Auth Service - Business logic for authentication (Simplified)
 */
class AuthService {
  /**
   * Verify Firebase token and create/update user in database
   * @param {string} firebaseToken - Firebase ID token from client
   * @param {Object} metadata - Request metadata (IP, user agent)
   * @returns {Object} User data and JWT tokens
   */
  static async loginWithFirebase(firebaseToken, metadata = {}) {
    try {
      // Verify Firebase token
      const decodedToken = await admin.auth().verifyIdToken(firebaseToken);

      // Extract user info from Firebase token
      const {
        uid: firebaseUid,
        email,
        name,
        picture: avatarUrl,
        email_verified: emailVerified,
      } = decodedToken;

      // Find or create user in our database
      let user = await UserModel.findByFirebaseUid(firebaseUid);

      if (!user) {
        // Create new user
        user = await UserModel.create({
          firebaseUid,
          email,
          fullName: name,
          avatarUrl,
          emailVerified,
        });
      } else {
        // Update last login
        await UserModel.updateLastLogin(user.id);
      }

      // Generate our own JWT tokens
      const accessToken = generateAccessToken({
        user_id: user.id,
        email: user.email,
        full_name: user.full_name,
        roles: user.roles,
        teams: user.teams,
      });

      const refreshToken = generateRefreshToken({
        user_id: user.id,
        email: user.email,
      });

      // Store refresh token in database
      await this.storeRefreshToken(user.id, refreshToken, metadata);

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          avatar_url: user.avatar_url,
          roles: user.roles,
          teams: user.teams,
        },
        tokens: {
          access_token: accessToken,
          refresh_token: refreshToken,
          token_type: "Bearer",
          expires_in: 86400, // 24 hours in seconds
        },
      };
    } catch (error) {
      console.error("Login error:", error);

      if (error.code === "auth/id-token-expired") {
        throw new Error("Firebase token has expired");
      } else if (error.code === "auth/argument-error") {
        throw new Error("Invalid Firebase token format");
      }

      throw new Error("Authentication failed: " + error.message);
    }
  }

  /**
   * Refresh access token using refresh token
   * @param {string} refreshToken - Refresh token
   * @returns {Object} New access token
   */
  static async refreshAccessToken(refreshToken) {
    try {
      const { verifyToken } = require("../utils/jwt");
      const decoded = verifyToken(refreshToken);

      // Check if refresh token exists and is active in database
      const tokenResult = await query(
        `SELECT rt.*, u.email, u.full_name, u.roles, u.teams
         FROM refresh_tokens rt
         JOIN users u ON rt.user_id = u.id
         WHERE rt.token_hash = $1 AND rt.is_active = TRUE AND rt.expires_at > CURRENT_TIMESTAMP`,
        [this.hashToken(refreshToken)]
      );

      if (!tokenResult.rows[0]) {
        throw new Error("Invalid or expired refresh token");
      }

      const tokenData = tokenResult.rows[0];

      // Generate new access token
      const accessToken = generateAccessToken({
        user_id: tokenData.user_id,
        email: tokenData.email,
        full_name: tokenData.full_name,
        roles: tokenData.roles,
        teams: tokenData.teams,
      });

      return {
        success: true,
        tokens: {
          access_token: accessToken,
          token_type: "Bearer",
          expires_in: 86400,
        },
      };
    } catch (error) {
      throw new Error("Token refresh failed: " + error.message);
    }
  }

  /**
   * Logout user and revoke refresh token
   * @param {string} userId - User ID
   * @param {string} refreshToken - Refresh token to revoke
   */
  static async logout(userId, refreshToken) {
    try {
      if (refreshToken) {
        // Revoke specific refresh token
        await query(
          `UPDATE refresh_tokens 
           SET is_active = FALSE, revoked_at = CURRENT_TIMESTAMP
           WHERE user_id = $1 AND token_hash = $2`,
          [userId, this.hashToken(refreshToken)]
        );
      } else {
        // Revoke all refresh tokens for user
        await query(
          `UPDATE refresh_tokens 
           SET is_active = FALSE, revoked_at = CURRENT_TIMESTAMP
           WHERE user_id = $1 AND is_active = TRUE`,
          [userId]
        );
      }

      return { success: true, message: "Logged out successfully" };
    } catch (error) {
      throw new Error("Logout failed: " + error.message);
    }
  }

  /**
   * Store refresh token in database
   * @param {string} userId - User ID
   * @param {string} token - Refresh token
   * @param {Object} metadata - Request metadata
   */
  static async storeRefreshToken(userId, token, metadata = {}) {
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, tokenHash, expiresAt, metadata.ip, metadata.userAgent]
    );
  }

  /**
   * Hash token for secure storage
   * @param {string} token - Token to hash
   * @returns {string} Hashed token
   */
  static hashToken(token) {
    return crypto.createHash("sha256").update(token).digest("hex");
  }
}

module.exports = AuthService;
