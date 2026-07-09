const EventModel = require("../models/eventModel");

const VALID_STATUSES = ["draft", "published", "ended", "cancelled"];
const VALID_CERT_TYPES = ["participation", "completion"];

function badRequest(message) {
  const err = new Error(message);
  err.statusCode = 400;
  return err;
}

function notFound(message) {
  const err = new Error(message);
  err.statusCode = 404;
  return err;
}

/**
 * Event Service - Business logic for events, registrations, checkins
 */
class EventService {
  static slugify(title) {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  static async generateUniqueSlug(title) {
    const base = this.slugify(title) || "event";
    let slug = base;
    let suffix = 2;
    while (await EventModel.findBySlug(slug)) {
      slug = `${base}-${suffix}`;
      suffix++;
    }
    return slug;
  }

  static validateEventInput(data, { partial = false } = {}) {
    if (!partial || data.title !== undefined) {
      if (!data.title || typeof data.title !== "string" || !data.title.trim()) {
        throw badRequest("title is required");
      }
    }
    if (!partial || data.starts_at !== undefined) {
      if (!data.starts_at || isNaN(Date.parse(data.starts_at))) {
        throw badRequest("starts_at must be a valid ISO date");
      }
    }
    if (
      data.ends_at !== undefined &&
      data.ends_at !== null &&
      isNaN(Date.parse(data.ends_at))
    ) {
      throw badRequest("ends_at must be a valid ISO date");
    }
    if (data.capacity !== undefined && data.capacity !== null) {
      if (!Number.isInteger(data.capacity) || data.capacity < 1) {
        throw badRequest("capacity must be a positive integer or null");
      }
    }
    if (data.status !== undefined && !VALID_STATUSES.includes(data.status)) {
      throw badRequest(`status must be one of: ${VALID_STATUSES.join(", ")}`);
    }
    if (
      data.certificate_type !== undefined &&
      !VALID_CERT_TYPES.includes(data.certificate_type)
    ) {
      throw badRequest(
        `certificate_type must be one of: ${VALID_CERT_TYPES.join(", ")}`
      );
    }
  }

  static async createEvent(data, createdBy) {
    this.validateEventInput(data);
    const slug = await this.generateUniqueSlug(data.title);
    return EventModel.create({ ...data, slug, created_by: createdBy });
  }

  static async updateEvent(id, data) {
    this.validateEventInput(data, { partial: true });
    const updated = await EventModel.update(id, data);
    if (!updated) {
      throw notFound("Event not found");
    }
    return updated;
  }

  static async listPublished({ upcoming } = {}) {
    return EventModel.list({ upcoming });
  }

  static async listForAdmin({ status } = {}) {
    return EventModel.adminList({ status });
  }

  /**
   * Public event lookup by slug. Always 404s for anything not published/ended
   * — admins browse drafts through the /events/admin/all listing instead.
   */
  static async getBySlug(slug) {
    const event = await EventModel.findBySlug(slug);
    if (!event || !["published", "ended"].includes(event.status)) {
      return null;
    }
    return event;
  }

  static async register(eventId, userId) {
    return EventModel.register(eventId, userId);
  }

  static async cancelRegistration(eventId, userId) {
    const cancelled = await EventModel.cancelRegistration(eventId, userId);
    if (!cancelled) {
      throw notFound("No active registration to cancel");
    }
    return cancelled;
  }

  static async getMyRegistration(eventId, userId) {
    return EventModel.getRegistration(eventId, userId);
  }

  static async listAttendees(eventId) {
    return EventModel.listAttendees(eventId);
  }

  /**
   * Records attendance and creates/returns the certificate row.
   * Certificate issuance (calling the cert service) is wired in on top of
   * this by certificateService.js — see the try/catch there for the
   * non-blocking, retry-on-recheck-in behavior.
   */
  static async checkIn(eventId, userId, adminId) {
    const event = await EventModel.findById(eventId);
    if (!event) {
      throw notFound("Event not found");
    }

    const certTitle = `Certificate of ${
      event.certificate_type === "completion" ? "Completion" : "Participation"
    } — ${event.title}`;

    const certificate = await EventModel.checkIn(eventId, userId, adminId, certTitle);
    return { certificate, event };
  }
}

module.exports = EventService;
