const EventService = require("../services/eventService");

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
 * Event Controller - Handle HTTP requests for events, registrations, checkins
 */
class EventController {
  /**
   * GET /events
   * Public listing of published events
   */
  static async list(req, res) {
    try {
      const upcoming =
        req.query.upcoming === "true"
          ? true
          : req.query.upcoming === "false"
          ? false
          : undefined;
      const events = await EventService.listPublished({ upcoming });
      res.json({ success: true, events });
    } catch (error) {
      handleError(res, error, "Failed to list events");
    }
  }

  /**
   * GET /events/admin/all
   * Admin listing of events in any status
   */
  static async adminList(req, res) {
    try {
      const { status } = req.query;
      const events = await EventService.listForAdmin({ status });
      res.json({ success: true, events });
    } catch (error) {
      handleError(res, error, "Failed to list events");
    }
  }

  /**
   * GET /events/:slug
   * Public event detail
   */
  static async getBySlug(req, res) {
    try {
      const event = await EventService.getBySlug(req.params.slug);
      if (!event) {
        return res.status(404).json({ success: false, error: "Event not found" });
      }
      res.json({ success: true, event });
    } catch (error) {
      handleError(res, error, "Failed to fetch event");
    }
  }

  /**
   * POST /events
   * Admin: create event
   */
  static async create(req, res) {
    try {
      const event = await EventService.createEvent(req.body, req.user.user_id);
      res.status(201).json({ success: true, event });
    } catch (error) {
      handleError(res, error, "Failed to create event");
    }
  }

  /**
   * PUT /events/:id
   * Admin: update event
   */
  static async update(req, res) {
    try {
      const event = await EventService.updateEvent(req.params.id, req.body);
      res.json({ success: true, event });
    } catch (error) {
      handleError(res, error, "Failed to update event");
    }
  }

  /**
   * GET /events/:id/registration
   * The caller's own registration for this event, or null
   */
  static async myRegistration(req, res) {
    try {
      const registration = await EventService.getMyRegistration(
        req.params.id,
        req.user.user_id
      );
      res.json({ success: true, registration });
    } catch (error) {
      handleError(res, error, "Failed to fetch registration");
    }
  }

  /**
   * POST /events/:id/register
   */
  static async register(req, res) {
    try {
      const registration = await EventService.register(req.params.id, req.user.user_id);
      res.json({ success: true, registration });
    } catch (error) {
      handleError(res, error, "Failed to register");
    }
  }

  /**
   * DELETE /events/:id/register
   */
  static async cancelRegistration(req, res) {
    try {
      await EventService.cancelRegistration(req.params.id, req.user.user_id);
      res.json({ success: true });
    } catch (error) {
      handleError(res, error, "Failed to cancel registration");
    }
  }

  /**
   * POST /events/:id/checkin
   * Admin: mark attendance, body { user_id }
   */
  static async checkIn(req, res) {
    try {
      const { user_id } = req.body;
      if (!user_id) {
        return res.status(400).json({ success: false, error: "user_id is required" });
      }
      const result = await EventService.checkIn(req.params.id, user_id, req.user.user_id);
      res.json({
        success: true,
        certificate_status: result.certificate.status,
        certificate: result.certificate,
      });
    } catch (error) {
      handleError(res, error, "Failed to check in attendee");
    }
  }

  /**
   * GET /events/:id/attendees
   * Admin: roster with check-in + certificate state
   */
  static async attendees(req, res) {
    try {
      const attendees = await EventService.listAttendees(req.params.id);
      res.json({ success: true, attendees });
    } catch (error) {
      handleError(res, error, "Failed to fetch attendees");
    }
  }
}

module.exports = EventController;
