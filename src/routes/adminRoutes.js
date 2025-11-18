const express = require("express");
const UserModel = require("../models/userModel");
const {
  authenticateToken,
  requireRole,
} = require("../middleware/authMiddleware");

const router = express.Router();

/**
 * All routes require authentication and admin role
 */
router.use(authenticateToken);
router.use(requireRole("admin"));

/**
 * @route   GET /admin/users/:userId
 * @desc    Get user by ID
 * @access  Admin only
 */
router.get("/users/:userId", async (req, res) => {
  try {
    const user = await UserModel.findById(req.params.userId);

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
    res.status(500).json({
      success: false,
      error: "Failed to fetch user",
      message: error.message,
    });
  }
});

/**
 * @route   PUT /admin/users/:userId/gdg-member
 * @desc    Set user's GDG member status
 * @access  Admin only
 * @body    { gdg_member: boolean }
 */
router.put("/users/:userId/gdg-member", async (req, res) => {
  try {
    const { gdg_member } = req.body;

    if (typeof gdg_member !== "boolean") {
      return res.status(400).json({
        success: false,
        error: "gdg_member must be a boolean",
      });
    }

    const updatedUser = await UserModel.update(req.params.userId, {
      gdg_member,
    });

    res.json({
      success: true,
      user: updatedUser,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to update GDG member status",
      message: error.message,
    });
  }
});

/**
 * @route   POST /admin/users/:userId/roles
 * @desc    Add role to user
 * @access  Admin only
 * @body    { role: string }
 */
router.post("/users/:userId/roles", async (req, res) => {
  try {
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({
        success: false,
        error: "role is required",
      });
    }

    await UserModel.addRole(req.params.userId, role);

    res.json({
      success: true,
      message: `Role '${role}' added successfully`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to add role",
      message: error.message,
    });
  }
});

/**
 * @route   DELETE /admin/users/:userId/roles/:role
 * @desc    Remove role from user
 * @access  Admin only
 */
router.delete("/users/:userId/roles/:role", async (req, res) => {
  try {
    await UserModel.removeRole(req.params.userId, req.params.role);

    res.json({
      success: true,
      message: `Role '${req.params.role}' removed successfully`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to remove role",
      message: error.message,
    });
  }
});

module.exports = router;
