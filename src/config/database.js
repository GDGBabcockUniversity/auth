const { Pool } = require("pg");

console.log(process.env.DATABASE_URL);

const config = {
  // Use DATABASE_URL if it exists, otherwise use individual variables
  connectionString: process.env.DATABASE_URL,
  // Add SSL configuration for production databases
  ...(process.env.NODE_ENV === "production" && {
    ssl: {
      rejectUnauthorized: false, // Required for many cloud DB providers
    },
  }),
  // Fallback to individual variables if DATABASE_URL is not set (for local dev)
  ...(!process.env.DATABASE_URL && {
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || "auth_db",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD,
  }),
};

// Create PostgreSQL connection pool
const pool = new Pool({
  ...config,
  max: 10, // Reduced pool size for serverless environments
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test database connection
pool.on("connect", () => {
  console.log("Database connected successfully");
});

pool.on("error", (err) => {
  console.error("Unexpected error on idle database client", err);
  process.exit(-1);
});

// Query helper function
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log("Executed query", { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error("Database query error:", error);
    throw error;
  }
};

// Transaction helper
const transaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  pool,
  query,
  transaction,
};
