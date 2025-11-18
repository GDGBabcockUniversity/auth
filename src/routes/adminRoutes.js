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

/**
 * @route   POST /admin/users/:userId/teams
 * @desc    Add team to user
 * @access  Admin only
 * @body    { team: string }
 */
router.post("/users/:userId/teams", async (req, res) => {
  try {
    const { team } = req.body;

    if (!team) {
      return res.status(400).json({
        success: false,
        error: "team is required",
      });
    }

    await UserModel.addTeam(req.params.userId, team);

    res.json({
      success: true,
      message: `Team '${team}' added successfully`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to add team",
      message: error.message,
    });
  }
});

/**
 * @route   DELETE /admin/users/:userId/teams/:team
 * @desc    Remove team from user
 * @access  Admin only
 */
router.delete("/users/:userId/teams/:team", async (req, res) => {
  try {
    await UserModel.removeTeam(req.params.userId, req.params.team);

    res.json({
      success: true,
      message: `Team '${req.params.team}' removed successfully`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to remove team",
      message: error.message,
    });
  }
});

/**
 * @route   GET /admin/tracks/:track/users
 * @desc    Get users by track
 * @access  Admin only
 */
router.get("/tracks/:track/users", async (req, res) => {
  try {
    const users = await UserModel.getUsersByTrack(req.params.track);

    res.json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch users",
      message: error.message,
    });
  }
});

/**
 * @route   GET /admin/teams/:team/users
 * @desc    Get users by team
 * @access  Admin only
 */
router.get("/teams/:team/users", async (req, res) => {
  try {
    const users = await UserModel.getUsersByTeam(req.params.team);

    res.json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch users",
      message: error.message,
    });
  }
});

/**
 * @route   GET /admin/departments/:department/students
 * @desc    Get students by department
 * @access  Admin only
 */
router.get("/departments/:department/students", async (req, res) => {
  try {
    const students = await UserModel.getStudentsByDepartment(
      req.params.department
    );

    res.json({
      success: true,
      count: students.length,
      students,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch students",
      message: error.message,
    });
  }
});

module.exports = router;
