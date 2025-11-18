require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { initializeFirebase } = require("./src/config/firebase");
const { pool } = require("./src/config/database");

// Import routes
const authRoutes = require("./src/routes/authRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Firebase & Database
try {
  initializeFirebase();
  pool.query("SELECT NOW()");
  console.log("✓ Firebase & Database initialized");
} catch (error) {
  console.error("✗ Initialization failed:", error.message);
  process.exit(1);
}

// Middleware
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json());

// Routes
app.use("/auth", authRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "healthy" });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Error:", err.stack);
  res.status(500).json({ error: "Internal server error" });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Auth Service running at http://localhost:${PORT}`);
});
