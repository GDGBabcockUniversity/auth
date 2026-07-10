const AnalyticsModel = require("../models/analyticsModel");

/**
 * Analytics Controller - Handle HTTP requests for the admin analytics dashboard
 */
class AnalyticsController {
  /**
   * GET /analytics/overview
   */
  static async overview(req, res) {
    try {
      const analytics = await AnalyticsModel.getOverview();
      res.json({ success: true, analytics });
    } catch (error) {
      console.error("Failed to fetch analytics overview:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch analytics overview",
        message: error.message,
      });
    }
  }
}

module.exports = AnalyticsController;
