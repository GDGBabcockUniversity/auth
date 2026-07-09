const express = require("express");
const EventController = require("../controllers/eventController");
const { authenticateToken, requireRole } = require("../middleware/authMiddleware");

const router = express.Router();

/**
 * @route   GET /events
 * @desc    List published events
 * @access  Public
 */
router.get("/", EventController.list);

/**
 * @route   GET /events/admin/all
 * @desc    List events in any status (draft/published/ended/cancelled)
 * @access  Admin
 */
router.get("/admin/all", authenticateToken, requireRole(["admin"]), EventController.adminList);

/**
 * @route   GET /events/:slug
 * @desc    Event detail by slug (404 unless published/ended)
 * @access  Public
 */
router.get("/:slug", EventController.getBySlug);

/**
 * @route   POST /events
 * @desc    Create an event
 * @access  Admin
 */
router.post("/", authenticateToken, requireRole(["admin"]), EventController.create);

/**
 * @route   PUT /events/:id
 * @desc    Update an event
 * @access  Admin
 */
router.put("/:id", authenticateToken, requireRole(["admin"]), EventController.update);

/**
 * @route   GET /events/:id/registration
 * @desc    The caller's own registration for this event, or null
 * @access  Protected
 */
router.get("/:id/registration", authenticateToken, EventController.myRegistration);

/**
 * @route   POST /events/:id/register
 * @desc    RSVP to an event
 * @access  Protected
 */
router.post("/:id/register", authenticateToken, EventController.register);

/**
 * @route   DELETE /events/:id/register
 * @desc    Cancel RSVP
 * @access  Protected
 */
router.delete("/:id/register", authenticateToken, EventController.cancelRegistration);

/**
 * @route   POST /events/:id/checkin
 * @desc    Mark attendance (triggers certificate issuance), body { user_id }
 * @access  Admin
 */
router.post("/:id/checkin", authenticateToken, requireRole(["admin"]), EventController.checkIn);

/**
 * @route   GET /events/:id/attendees
 * @desc    Attendee roster with check-in + certificate state
 * @access  Admin
 */
router.get("/:id/attendees", authenticateToken, requireRole(["admin"]), EventController.attendees);

module.exports = router;
