require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { initializeFirebase } = require("./src/config/firebase");
const { pool } = require("./src/config/database");

// Import routes
const authRoutes = require("./src/routes/authRoutes");
const adminRoutes = require("./src/routes/adminRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Firebase
try {
  initializeFirebase();
  console.log("✓ Firebase initialized");
} catch (error) {
  console.error("✗ Failed to initialize Firebase:", error.message);
  process.exit(1);
}

// Test database connection
pool
  .query("SELECT NOW()")
  .then(() => console.log("✓ Database connected"))
  .catch((err) => {
    console.error("✗ Database connection failed:", err.message);
    process.exit(1);
  });

// Middleware
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    success: true,
    service: "auth-service",
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    service: "Auth Service",
    version: "1.0.0",
    description: "Central authentication service with Firebase integration",
    endpoints: {
      auth: "/auth/*",
      admin: "/admin/*",
      health: "/health",
    },
    documentation: "See README.md for API documentation",
  });
});

// Routes
app.use("/auth", authRoutes);
app.use("/admin", adminRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Not found",
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Error:", err);

  res.status(err.status || 500).json({
    success: false,
    error: err.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, closing server gracefully...");
  await pool.end();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("\nSIGINT received, closing server gracefully...");
  await pool.end();
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════╗
║         Auth Service - Firebase SSO            ║
║                                                ║
║  Server running at http://localhost:${PORT}     ║
║  Environment: ${process.env.NODE_ENV || "development"}                      ║
║                                                ║
║  Endpoints:                                    ║
║  • POST /auth/login       - Login with Firebase║
║  • POST /auth/refresh     - Refresh token      ║
║  • POST /auth/logout      - Logout             ║
║  • GET  /auth/me          - Get profile        ║
║  • GET  /auth/verify      - Verify token       ║
║  • PUT  /auth/profile     - Update profile     ║
║                                                ║
║  Admin:                                        ║
║  • /admin/users/*         - User management    ║
║                                                ║
╚════════════════════════════════════════════════╝
  `);
});
