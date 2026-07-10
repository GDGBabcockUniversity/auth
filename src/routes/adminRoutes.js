const express = require("express");
const AdminController = require("../controllers/adminController");
const { authenticateToken, requireRole } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authenticateToken, requireRole(["admin"]));

/**
 * @route   GET /admin/users
 * @desc    Search/list users with pagination
 * @access  Admin
 */
router.get("/users", AdminController.listUsers);

/**
 * @route   PUT /admin/users/:id
 * @desc    Update a user's roles, teams, or active status
 * @access  Admin
 */
router.put("/users/:id", AdminController.updateUser);

module.exports = router;
