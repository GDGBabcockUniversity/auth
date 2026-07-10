const { query } = require("../config/database");

/**
 * Analytics Model - Cross-service aggregates for the admin dashboard.
 * Every method is a standalone read; the controller runs them via
 * Promise.all (same pattern as UserModel.getActivity).
 */
class AnalyticsModel {
  /**
   * Top 5 scorers — each user's single best score across all RADAR games.
   */
  static async getTopScorers(limit = 5) {
    const result = await query(
      `SELECT u.id AS user_id, u.full_name, MAX(s.score) AS best_score
       FROM radar_game_scores s
       JOIN users u ON u.id = s.user_id
       GROUP BY u.id, u.full_name
       ORDER BY best_score DESC
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  }

  /**
   * Games ranked by number of plays.
   */
  static async getMostPlayedGames() {
    const result = await query(
      `SELECT game, COUNT(*)::int AS play_count
       FROM radar_game_scores
       GROUP BY game
       ORDER BY play_count DESC`
    );
    return result.rows;
  }

  /**
   * Articles ranked by distinct-reader count.
   */
  static async getMostReadArticles(limit = 5) {
    const result = await query(
      `SELECT slug, COUNT(DISTINCT user_id)::int AS reader_count
       FROM radar_reads
       GROUP BY slug
       ORDER BY reader_count DESC
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  }

  /**
   * Registrations vs check-ins per event — the attendance funnel.
   */
  static async getEventAttendance() {
    const result = await query(
      `SELECT e.id AS event_id, e.title, e.slug,
              COUNT(DISTINCT r.user_id)::int AS registrations,
              COUNT(DISTINCT c.user_id)::int AS checkins
       FROM events e
       LEFT JOIN event_registrations r ON r.event_id = e.id AND r.status != 'cancelled'
       LEFT JOIN event_checkins c ON c.event_id = e.id
       GROUP BY e.id, e.title, e.slug
       ORDER BY e.starts_at DESC`
    );
    return result.rows;
  }

  /**
   * User count per primary_track — participation spread across tracks.
   */
  static async getTrackParticipation() {
    const result = await query(
      `SELECT primary_track, COUNT(*)::int AS member_count
       FROM users
       WHERE primary_track IS NOT NULL
       GROUP BY primary_track
       ORDER BY member_count DESC`
    );
    return result.rows;
  }

  /**
   * All aggregates for GET /analytics/overview, fetched concurrently.
   */
  static async getOverview() {
    const [topScorers, mostPlayedGames, mostReadArticles, eventAttendance, trackParticipation] =
      await Promise.all([
        this.getTopScorers(),
        this.getMostPlayedGames(),
        this.getMostReadArticles(),
        this.getEventAttendance(),
        this.getTrackParticipation(),
      ]);

    return {
      top_scorers: topScorers,
      most_played_games: mostPlayedGames,
      most_read_articles: mostReadArticles,
      event_attendance: eventAttendance,
      track_participation: trackParticipation,
    };
  }
}

module.exports = AnalyticsModel;
