const { Pool } = require("pg");

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable must be set.");
}

const config = {
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
};

const maskedUrl = process.env.DATABASE_URL.replace(/:([^:]+)@/, ":*****@");
console.log(
  `Attempting to connect to database using connection string: ${maskedUrl}`
);

// Create PostgreSQL connection pool
const pool = new Pool({
  ...config,
  max: 10, // Reduced pool size for serverless environments
  idleTimeoutMillis: 30000,
  // connectionTimeoutMillis: 10000,
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
