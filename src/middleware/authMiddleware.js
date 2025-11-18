const { verifyToken } = require("../utils/jwt");

/**
 * Middleware to authenticate JWT token
 * Extracts and verifies JWT from Authorization header
 * Attaches user data to req.user
 */
const authenticateToken = (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
        message: "No token provided",
      });
    }

    // Verify token
    const decoded = verifyToken(token);

    // Attach user data to request
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      error: "Invalid or expired token",
      message: error.message,
    });
  }
};

/**
 * Middleware to check if user has required role
 * @param {string|string[]} roles - Required role(s)
 */
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
      });
    }

    const userRoles = req.user.roles || [];
    const requiredRoles = Array.isArray(roles) ? roles : [roles];

    // Check if user has any of the required roles
    const hasRole = requiredRoles.some((role) => userRoles.includes(role));

    if (!hasRole) {
      return res.status(403).json({
        success: false,
        error: "Insufficient permissions",
        message: `Required role(s): ${requiredRoles.join(", ")}`,
      });
    }

    next();
  };
};

/**
 * Middleware to check if user is a GDG member
 */
const requireGDGMember = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: "Authentication required",
    });
  }

  if (!req.user.gdg_member) {
    return res.status(403).json({
      success: false,
      error: "GDG membership required",
      message: "This resource is only available to GDG Babcock members",
    });
  }

  next();
};

/**
 * Optional authentication middleware
 * Attaches user if token is valid, but doesn't fail if no token
 */
const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (token) {
      const decoded = verifyToken(token);
      req.user = decoded;
    }
  } catch (error) {
    // Silently fail for optional auth
    console.log("Optional auth failed:", error.message);
  }
  next();
};

/**
 * Middleware to check if user has agreed to TOS
 * Use this for endpoints that require TOS agreement
 */
const requireTOSAgreement = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: "Authentication required",
    });
  }

  try {
    const UserModel = require("../models/userModel");
    const hasAgreed = await UserModel.hasTOSAgreed(req.user.user_id);

    if (!hasAgreed) {
      return res.status(403).json({
        success: false,
        error: "TOS agreement required",
        message:
          "You must agree to the Terms of Service to access this resource",
        redirect: "/tos/agree",
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Failed to verify TOS agreement",
      message: error.message,
    });
  }
};

module.exports = {
  authenticateToken,
  requireRole,
  requireGDGMember,
  requireTOSAgreement,
  optionalAuth,
};
