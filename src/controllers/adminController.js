const UserModel = require("../models/userModel");

function handleError(res, error, fallbackMessage) {
  const statusCode = error.statusCode || 500;
  if (statusCode === 500) {
    console.error(fallbackMessage, error);
  }
  res.status(statusCode).json({
    success: false,
    error: statusCode === 500 ? fallbackMessage : error.message,
    message: error.message,
  });
}

/**
 * Admin Controller - Handle HTTP requests for admin user management
 */
class AdminController {
  /**
   * GET /admin/users?search=&role=&page=&limit=
   */
  static async listUsers(req, res) {
    try {
      const { search, role, page, limit } = req.query;
      const result = await UserModel.adminList({ search, role, page, limit });
      res.json({ success: true, ...result });
    } catch (error) {
      handleError(res, error, "Failed to list users");
    }
  }

  /**
   * PUT /admin/users/:id
   * Body: subset of { roles, teams, is_active }
   */
  static async updateUser(req, res) {
    try {
      const user = await UserModel.adminUpdate(req.params.id, req.body);
      if (!user) {
        return res.status(404).json({ success: false, error: "User not found" });
      }
      res.json({ success: true, user });
    } catch (error) {
      handleError(res, error, "Failed to update user");
    }
  }
}

module.exports = AdminController;
