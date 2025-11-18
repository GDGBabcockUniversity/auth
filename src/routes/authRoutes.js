const express = require("express");
const AuthController = require("../controllers/authController");
const { authenticateToken } = require("../middleware/authMiddleware");

const router = express.Router();

/**
 * @route   POST /auth/login
 * @desc    Login with Firebase token
 * @access  Public
 * @body    { firebase_token: string }
 * @returns { user, tokens }
 */
router.post("/login", AuthController.login);

/**
 * @route   POST /auth/refresh
 * @desc    Refresh access token
 * @access  Public
 * @body    { refresh_token: string }
 * @returns { tokens }
 */
router.post("/refresh", AuthController.refresh);

/**
 * @route   POST /auth/logout
 * @desc    Logout and revoke refresh token
 * @access  Protected
 * @body    { refresh_token?: string }
 * @returns { success, message }
 */
router.post("/logout", authenticateToken, AuthController.logout);

/**
 * @route   GET /auth/me
 * @desc    Get current user profile
 * @access  Protected
 * @returns { user }
 */
router.get("/me", authenticateToken, AuthController.getCurrentUser);

/**
 * @route   PUT /auth/profile
 * @desc    Update user profile
 * @access  Protected
 * @body    { name?, display_name?, phone_number?, etc. }
 * @returns { user }
 */
router.put("/profile", authenticateToken, AuthController.updateProfile);

/**
 * @route   GET /auth/verify
 * @desc    Verify token validity
 * @access  Protected
 * @returns { valid: true, user }
 */
router.get("/verify", authenticateToken, AuthController.verifyToken);

/**
 * @route   POST /auth/tos/agree
 * @desc    Record user's agreement to Terms of Service
 * @access  Protected
 * @body    { version: string }
 * @returns { success: true }
 */
router.post("/tos/agree", authenticateToken, async (req, res) => {
  try {
    const { version } = req.body;
    const userId = req.user.user_id;

    if (!version) {
      return res.status(400).json({
        success: false,
        error: "version is required",
      });
    }

    const UserModel = require("../models/userModel");
    await UserModel.recordTOSAgreement(userId, version);

    res.json({
      success: true,
      message: "TOS agreement recorded",
    });
  } catch (error) {
    console.error("TOS agreement error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to record TOS agreement",
      message: error.message,
    });
  }
});

module.exports = router;
