const AuthService = require("../services/authService");
const UserModel = require("../models/userModel");

/**
 * Auth Controller - Handle HTTP requests for authentication
 */
class AuthController {
  /**
   * POST /auth/login
   * Login with Firebase token
   */
  static async login(req, res) {
    try {
      const { firebase_token } = req.body;

      if (!firebase_token) {
        return res.status(400).json({
          success: false,
          error: "firebase_token is required",
        });
      }

      // Get request metadata
      const metadata = {
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get("user-agent"),
      };

      const result = await AuthService.loginWithFirebase(
        firebase_token,
        metadata
      );

      res.json(result);
    } catch (error) {
      console.error("Login controller error:", error);
      res.status(401).json({
        success: false,
        error: "Authentication failed",
        message: error.message,
      });
    }
  }

  /**
   * POST /auth/refresh
   * Refresh access token
   */
  static async refresh(req, res) {
    try {
      const { refresh_token } = req.body;

      if (!refresh_token) {
        return res.status(400).json({
          success: false,
          error: "refresh_token is required",
        });
      }

      const result = await AuthService.refreshAccessToken(refresh_token);

      res.json(result);
    } catch (error) {
      console.error("Refresh controller error:", error);
      res.status(401).json({
        success: false,
        error: "Token refresh failed",
        message: error.message,
      });
    }
  }

  /**
   * POST /auth/logout
   * Logout user
   */
  static async logout(req, res) {
    try {
      const { refresh_token } = req.body;
      const userId = req.user.user_id;

      const result = await AuthService.logout(userId, refresh_token);

      res.json(result);
    } catch (error) {
      console.error("Logout controller error:", error);
      res.status(500).json({
        success: false,
        error: "Logout failed",
        message: error.message,
      });
    }
  }

  /**
   * GET /auth/me
   * Get current user profile
   */
  static async getCurrentUser(req, res) {
    try {
      const userId = req.user.user_id;

      const user = await UserModel.getProfile(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          error: "User not found",
        });
      }

      res.json({
        success: true,
        user,
      });
    } catch (error) {
      console.error("Get current user error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch user",
        message: error.message,
      });
    }
  }

  /**
   * PUT /auth/profile
   * Update user profile
   */
  static async updateProfile(req, res) {
    try {
      const userId = req.user.user_id;
      const updates = req.body;

      // Remove fields that shouldn't be updated via this endpoint
      delete updates.id;
      delete updates.firebase_uid;
      delete updates.email;
      delete updates.roles;
      delete updates.gdg_member;

      const updatedUser = await UserModel.update(userId, updates);

      res.json({
        success: true,
        user: updatedUser,
      });
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update profile",
        message: error.message,
      });
    }
  }

  /**
   * GET /auth/verify
   * Verify token validity
   */
  static async verifyToken(req, res) {
    try {
      // If we reach here, token is valid (passed through authenticateToken middleware)
      res.json({
        success: true,
        valid: true,
        user: req.user,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Verification failed",
        message: error.message,
      });
    }
  }
}

module.exports = AuthController;
