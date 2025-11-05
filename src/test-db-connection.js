// test-db-connection.js
const { Pool } = require('pg');
const path = require('path');

// Explicitly define the path to your .env.local file
require('dotenv').config({ path: path.resolve(__dirname, './.env.local') }); // CRITICAL FIX: ensure .env.local is loaded

async function testConnection() {
  const connectionString = process.env.POSTGRES_URL || `postgres://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_DATABASE}`;

  if (!connectionString || connectionString.includes('undefined')) {
    console.error("ERROR: Database connection string (POSTGRES_URL or DB_*) is not fully defined in .env.local");
    try {
      require('fs').accessSync(path.resolve(__dirname, './.env.local'));
      console.error(".env.local file exists. Please check if DB_USERNAME, DB_PASSWORD, DB_HOST, DB_PORT, DB_DATABASE are set inside.");
    } catch (e) {
      console.error(".env.local file does NOT exist at the expected path. Please create it.");
    }
    return;
  }

  const pool = new Pool({
    connectionString: connectionString,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });

  try {
    const client = await pool.connect();
    console.log("SUCCESS: Successfully connected to the database!");
    const result = await client.query('SELECT NOW()');
    console.log("Current database time:", result.rows[0].now);
    client.release();
  } catch (error) {
    console.error("ERROR: Failed to connect to the database!", error);
  } finally {
    await pool.end();
  }
}

testConnection();