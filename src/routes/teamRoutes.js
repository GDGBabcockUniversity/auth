const express = require("express");
const TeamController = require("../controllers/teamController");
const { authenticateToken, requireRole } = require("../middleware/authMiddleware");

const router = express.Router();

/**
 * @route   GET /team
 * @desc    Public roster listing (whitelisted columns only)
 * @access  Public
 */
router.get("/", TeamController.list);

/**
 * @route   GET /team/admin/all
 * @desc    Full roster listing, including inactive entries
 * @access  Admin
 */
router.get("/admin/all", authenticateToken, requireRole(["admin"]), TeamController.adminList);

/**
 * @route   POST /team/admin
 * @desc    Create a team member
 * @access  Admin
 */
router.post("/admin", authenticateToken, requireRole(["admin"]), TeamController.create);

/**
 * @route   PUT /team/admin/:id
 * @desc    Update a team member
 * @access  Admin
 */
router.put("/admin/:id", authenticateToken, requireRole(["admin"]), TeamController.update);

/**
 * @route   DELETE /team/admin/:id
 * @desc    Soft-delete a team member (is_public = false)
 * @access  Admin
 */
router.delete("/admin/:id", authenticateToken, requireRole(["admin"]), TeamController.deactivate);

module.exports = router;
