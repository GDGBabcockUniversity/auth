const TeamModel = require("../models/teamModel");

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
 * Team Controller - Handle HTTP requests for the public roster and admin team management
 */
class TeamController {
  /**
   * GET /team
   * Public roster listing (whitelisted columns only)
   */
  static async list(req, res) {
    try {
      const members = await TeamModel.listPublic();
      res.json({ success: true, members });
    } catch (error) {
      handleError(res, error, "Failed to list team members");
    }
  }

  /**
   * GET /team/admin/all
   * Admin: every column, including inactive entries
   */
  static async adminList(req, res) {
    try {
      const members = await TeamModel.listAdmin();
      res.json({ success: true, members });
    } catch (error) {
      handleError(res, error, "Failed to list team members");
    }
  }

  /**
   * POST /team/admin
   * Admin: create a team member
   */
  static async create(req, res) {
    try {
      const member = await TeamModel.create(req.body);
      res.status(201).json({ success: true, member });
    } catch (error) {
      handleError(res, error, "Failed to create team member");
    }
  }

  /**
   * PUT /team/admin/:id
   * Admin: update a team member
   */
  static async update(req, res) {
    try {
      const member = await TeamModel.update(req.params.id, req.body);
      if (!member) {
        return res.status(404).json({ success: false, error: "Team member not found" });
      }
      res.json({ success: true, member });
    } catch (error) {
      handleError(res, error, "Failed to update team member");
    }
  }

  /**
   * DELETE /team/admin/:id
   * Admin: soft-delete (is_public = false)
   */
  static async deactivate(req, res) {
    try {
      const member = await TeamModel.deactivate(req.params.id);
      if (!member) {
        return res.status(404).json({ success: false, error: "Team member not found" });
      }
      res.json({ success: true, member });
    } catch (error) {
      handleError(res, error, "Failed to deactivate team member");
    }
  }
}

module.exports = TeamController;
