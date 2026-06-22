import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://localhost:5432/trohub_db"
});

export const query = (text, params) => pool.query(text, params);

export const checkDatabase = async () => {
  const result = await query("select current_database() as database, now() as time");
  return result.rows[0];
};
