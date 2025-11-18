const express = require("express");
const AuthController = require("../controllers/authController");
const { authenticateToken } = require("../middleware/authMiddleware");

const router = express.Router();

/**
 * @route   POST /auth/login
 * @desc    Login with Firebase token
 * @access  Public
 */
router.post("/login", AuthController.login);

/**
 * @route   POST /auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post("/refresh", AuthController.refresh);

/**
 * @route   POST /auth/logout
 * @desc    Logout and revoke refresh token
 * @access  Protected
 */
router.post("/logout", authenticateToken, AuthController.logout);

/**
 * @route   GET /auth/me
 * @desc    Get current user profile
 * @access  Protected
 */
router.get("/me", authenticateToken, AuthController.getCurrentUser);

/**
 * @route   PUT /auth/profile
 * @desc    Update user profile
 * @access  Protected
 */
router.put("/profile", authenticateToken, AuthController.updateProfile);

/**
 * @route   GET /auth/verify
 * @desc    Verify token validity
 * @access  Protected
 */
router.get("/verify", authenticateToken, AuthController.verifyToken);

module.exports = router;
