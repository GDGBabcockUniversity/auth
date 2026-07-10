const { query } = require("../config/database");

/**
 * Radar Model - Database operations for RADAR game scores and reading activity
 */
class RadarModel {
  /**
   * Record one game play. Every play is a new row (history for future
   * leaderboards/analytics) — no dedup/upsert.
   */
  static async recordScore(userId, { game, puzzleId, score, meta }) {
    const result = await query(
      `INSERT INTO radar_game_scores (user_id, game, puzzle_id, score, meta)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, game, puzzleId || null, score, meta ? JSON.stringify(meta) : null]
    );
    return result.rows[0];
  }

  /**
   * Record reading time on an article. One row per (user, slug); repeat
   * reads accumulate seconds rather than overwrite them.
   */
  static async recordRead(userId, { slug, seconds }) {
    const result = await query(
      `INSERT INTO radar_reads (user_id, slug, seconds, read_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id, slug) DO UPDATE
         SET seconds = radar_reads.seconds + EXCLUDED.seconds,
             read_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [userId, slug, seconds]
    );
    return result.rows[0];
  }

  /**
   * Activity summary for the profile: articles read + total reading minutes.
   */
  static async getReadingActivity(userId) {
    const result = await query(
      `SELECT COUNT(*)::int AS radar_articles_read,
              FLOOR(COALESCE(SUM(seconds), 0) / 60)::int AS radar_reading_minutes
       FROM radar_reads
       WHERE user_id = $1`,
      [userId]
    );
    return result.rows[0];
  }
}

module.exports = RadarModel;
