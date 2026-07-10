const express = require("express");
const RadarController = require("../controllers/radarController");
const { authenticateToken } = require("../middleware/authMiddleware");

const router = express.Router();

/**
 * @route   POST /radar/scores
 * @desc    Record a game score
 * @access  Protected
 */
router.post("/scores", authenticateToken, RadarController.recordScore);

/**
 * @route   POST /radar/reads
 * @desc    Record reading time on an article
 * @access  Protected
 */
router.post("/reads", authenticateToken, RadarController.recordRead);

module.exports = router;
