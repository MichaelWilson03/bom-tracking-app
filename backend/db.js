// backend/db.js
const { Pool } = require('pg');

const pool = new Pool({
  user: 'michaelwilson', // Your PostgreSQL username
  host: 'localhost',
  database: 'bom_tracking', // Your database name
  password: 'Kaiden0304!', // Your PostgreSQL password
  port: 5432,
});

module.exports = pool;
