import mysql from "mysql2/promise";
import { env } from "../config/env";

export const mysqlPool = mysql.createPool({
  uri: env.mysqlUrl,
  // Only used in production, where the database requires an encrypted connection
  ssl: env.mysqlCaCert ? { ca: env.mysqlCaCert } : undefined,
  connectionLimit: 5,
});

export async function checkMysql(): Promise<boolean> {
  try {
    await mysqlPool.query("SELECT 1");
    return true;
  } catch (err) {
    console.error("MySQL check failed:", err);
    return false;
  }
}