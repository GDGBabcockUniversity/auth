const { query, transaction } = require("../config/database");

/**
 * Event Model - Database operations for events, registrations, checkins, certificates
 */
class EventModel {
  /**
   * Create a new event
   * @param {Object} data - Event data (must include slug)
   * @returns {Object} Created event
   */
  static async create(data) {
    const result = await query(
      `INSERT INTO events
         (slug, title, description, cover_image_url, location, starts_at, ends_at, capacity, status, certificate_type, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        data.slug,
        data.title,
        data.description || null,
        data.cover_image_url || null,
        data.location || null,
        data.starts_at,
        data.ends_at || null,
        data.capacity ?? null,
        data.status || "draft",
        data.certificate_type || "participation",
        data.created_by || null,
      ]
    );
    return result.rows[0];
  }

  /**
   * Update an event's fields
   * @param {string} id - Event ID
   * @param {Object} data - Fields to update
   * @returns {Object|null} Updated event or null
   */
  static async update(id, data) {
    const allowedFields = [
      "title",
      "description",
      "cover_image_url",
      "location",
      "starts_at",
      "ends_at",
      "capacity",
      "status",
      "certificate_type",
    ];
    const updateFields = [];
    const values = [];
    let paramIndex = 1;

    for (const key of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        updateFields.push(`${key} = $${paramIndex}`);
        values.push(data[key]);
        paramIndex++;
      }
    }

    if (updateFields.length === 0) {
      throw new Error("No valid fields to update");
    }

    values.push(id);
    const result = await query(
      `UPDATE events SET ${updateFields.join(", ")} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    return result.rows[0] || null;
  }

  static async findById(id) {
    const result = await query("SELECT * FROM events WHERE id = $1", [id]);
    return result.rows[0] || null;
  }

  static async findBySlug(slug) {
    const result = await query(
      `SELECT e.*,
         (SELECT COUNT(*)::int FROM event_registrations r
            WHERE r.event_id = e.id AND r.status = 'registered') AS registered_count
       FROM events e
       WHERE e.slug = $1`,
      [slug]
    );
    return result.rows[0] || null;
  }

  /**
   * List published events (public)
   * @param {Object} filters - { upcoming: true|false|undefined }
   */
  static async list({ upcoming } = {}) {
    let sql = `
      SELECT e.*,
        (SELECT COUNT(*)::int FROM event_registrations r
           WHERE r.event_id = e.id AND r.status = 'registered') AS registered_count
      FROM events e
      WHERE e.status = 'published'
    `;
    if (upcoming === true) {
      sql += " AND e.starts_at >= CURRENT_TIMESTAMP";
    } else if (upcoming === false) {
      sql += " AND e.starts_at < CURRENT_TIMESTAMP";
    }
    sql += " ORDER BY e.starts_at ASC";
    const result = await query(sql);
    return result.rows;
  }

  /**
   * List events of any status (admin only)
   * @param {Object} filters - { status? }
   */
  static async adminList({ status } = {}) {
    let sql = `
      SELECT e.*,
        (SELECT COUNT(*)::int FROM event_registrations r
           WHERE r.event_id = e.id AND r.status = 'registered') AS registered_count
      FROM events e
    `;
    const params = [];
    if (status) {
      params.push(status);
      sql += ` WHERE e.status = $${params.length}`;
    }
    sql += " ORDER BY e.starts_at DESC";
    const result = await query(sql, params);
    return result.rows;
  }

  /**
   * Register a user for an event, enforcing capacity.
   * Re-registering after a cancellation flips the row back to 'registered'.
   * A live duplicate registration returns an empty RETURNING set.
   */
  static async register(eventId, userId) {
    return transaction(async (client) => {
      const eventResult = await client.query(
        "SELECT * FROM events WHERE id = $1 FOR UPDATE",
        [eventId]
      );
      const event = eventResult.rows[0];
      if (!event) {
        const err = new Error("Event not found");
        err.statusCode = 404;
        throw err;
      }
      if (event.status !== "published") {
        const err = new Error("Event is not open for registration");
        err.statusCode = 409;
        throw err;
      }

      if (event.capacity !== null) {
        const countResult = await client.query(
          `SELECT COUNT(*)::int AS count FROM event_registrations
           WHERE event_id = $1 AND status = 'registered'`,
          [eventId]
        );
        if (countResult.rows[0].count >= event.capacity) {
          const err = new Error("Event is full");
          err.statusCode = 409;
          throw err;
        }
      }

      const upsertResult = await client.query(
        `INSERT INTO event_registrations (event_id, user_id, status, registered_at)
         VALUES ($1, $2, 'registered', CURRENT_TIMESTAMP)
         ON CONFLICT (event_id, user_id) DO UPDATE
           SET status = 'registered', registered_at = CURRENT_TIMESTAMP
           WHERE event_registrations.status = 'cancelled'
         RETURNING id`,
        [eventId, userId]
      );

      if (upsertResult.rows.length === 0) {
        const err = new Error("Already registered");
        err.statusCode = 409;
        throw err;
      }

      return upsertResult.rows[0];
    });
  }

  static async cancelRegistration(eventId, userId) {
    const result = await query(
      `UPDATE event_registrations SET status = 'cancelled'
       WHERE event_id = $1 AND user_id = $2 AND status = 'registered'
       RETURNING id`,
      [eventId, userId]
    );
    return result.rows[0] || null;
  }

  static async getRegistration(eventId, userId) {
    const result = await query(
      `SELECT * FROM event_registrations
       WHERE event_id = $1 AND user_id = $2 AND status != 'cancelled'`,
      [eventId, userId]
    );
    return result.rows[0] || null;
  }

  static async listAttendees(eventId) {
    const result = await query(
      `SELECT
         u.id AS user_id, u.full_name, u.email, u.matric_no, u.department,
         r.registered_at,
         ci.checked_in_at,
         cert.status AS certificate_status,
         cert.download_url AS certificate_url
       FROM event_registrations r
       JOIN users u ON u.id = r.user_id
       LEFT JOIN event_checkins ci ON ci.event_id = r.event_id AND ci.user_id = r.user_id
       LEFT JOIN certificates cert ON cert.event_id = r.event_id AND cert.user_id = r.user_id
       WHERE r.event_id = $1 AND r.status = 'registered'
       ORDER BY r.registered_at ASC`,
      [eventId]
    );
    return result.rows;
  }

  /**
   * Record attendance and create a pending certificate row.
   * Idempotent: re-checking in an already-checked-in user is a no-op on the
   * checkin/certificate inserts and simply returns the existing certificate row
   * (this is what lets certificate issuance be retried by re-checking in).
   */
  static async checkIn(eventId, userId, adminId, certTitle) {
    return transaction(async (client) => {
      const regResult = await client.query(
        `SELECT id FROM event_registrations
         WHERE event_id = $1 AND user_id = $2 AND status = 'registered'`,
        [eventId, userId]
      );
      if (regResult.rows.length === 0) {
        const err = new Error("User is not registered for this event");
        err.statusCode = 404;
        throw err;
      }

      await client.query(
        `INSERT INTO event_checkins (event_id, user_id, checked_in_by)
         VALUES ($1, $2, $3)
         ON CONFLICT (event_id, user_id) DO NOTHING`,
        [eventId, userId, adminId]
      );

      await client.query(
        `INSERT INTO certificates (user_id, event_id, title, status)
         VALUES ($1, $2, $3, 'pending')
         ON CONFLICT (user_id, event_id) DO NOTHING`,
        [userId, eventId, certTitle]
      );

      const certResult = await client.query(
        "SELECT * FROM certificates WHERE user_id = $1 AND event_id = $2",
        [userId, eventId]
      );
      return certResult.rows[0];
    });
  }

  static async markCertificateIssued(certId, uniqueId, downloadUrl) {
    await query(
      `UPDATE certificates
       SET status = 'issued', cert_service_unique_id = $1, download_url = $2, issued_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [uniqueId, downloadUrl, certId]
    );
  }

  static async markCertificateFailed(certId) {
    await query("UPDATE certificates SET status = 'failed' WHERE id = $1", [certId]);
  }
}

module.exports = EventModel;
