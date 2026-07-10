const express = require("express");
const AnalyticsController = require("../controllers/analyticsController");
const { authenticateToken, requireRole } = require("../middleware/authMiddleware");

const router = express.Router();

/**
 * @route   GET /analytics/overview
 * @desc    Cross-service aggregates for the admin dashboard
 * @access  Admin
 */
router.get(
  "/overview",
  authenticateToken,
  requireRole(["admin"]),
  AnalyticsController.overview
);

module.exports = router;
