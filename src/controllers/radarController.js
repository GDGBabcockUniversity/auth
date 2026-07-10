const RadarModel = require("../models/radarModel");

const MAX_SCORE = 1000000;
const MAX_READ_SECONDS = 6 * 60 * 60; // 6 hours per event — generous ceiling against bad input

function badRequest(res, message) {
  return res.status(400).json({ success: false, error: message, message });
}

/**
 * Radar Controller - Handle HTTP requests for RADAR game scores and reads
 */
class RadarController {
  /**
   * POST /radar/scores
   * body: { game, puzzle_id?, score, meta? }
   */
  static async recordScore(req, res) {
    try {
      const { game, puzzle_id, score, meta } = req.body;

      if (!game || typeof game !== "string" || !game.trim()) {
        return badRequest(res, "game is required");
      }
      if (
        typeof score !== "number" ||
        !Number.isFinite(score) ||
        score < 0 ||
        score > MAX_SCORE
      ) {
        return badRequest(res, `score must be a number between 0 and ${MAX_SCORE}`);
      }
      if (meta !== undefined && meta !== null && typeof meta !== "object") {
        return badRequest(res, "meta must be an object");
      }

      const row = await RadarModel.recordScore(req.user.user_id, {
        game: game.trim(),
        puzzleId: puzzle_id,
        score: Math.round(score),
        meta,
      });

      res.status(201).json({ success: true, score: row });
    } catch (error) {
      console.error("Record score error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to record score",
        message: error.message,
      });
    }
  }

  /**
   * POST /radar/reads
   * body: { slug, seconds }
   */
  static async recordRead(req, res) {
    try {
      const { slug, seconds } = req.body;

      if (!slug || typeof slug !== "string" || !slug.trim()) {
        return badRequest(res, "slug is required");
      }
      if (
        typeof seconds !== "number" ||
        !Number.isFinite(seconds) ||
        seconds < 0 ||
        seconds > MAX_READ_SECONDS
      ) {
        return badRequest(
          res,
          `seconds must be a number between 0 and ${MAX_READ_SECONDS}`
        );
      }

      const row = await RadarModel.recordRead(req.user.user_id, {
        slug: slug.trim(),
        seconds: Math.round(seconds),
      });

      res.status(201).json({ success: true, read: row });
    } catch (error) {
      console.error("Record read error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to record read",
        message: error.message,
      });
    }
  }
}

module.exports = RadarController;
