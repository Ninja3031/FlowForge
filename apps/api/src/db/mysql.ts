import mysql from "mysql2/promise";
import { env } from "../config/env";

export const mysqlPool = mysql.createPool(env.mysqlUrl);

export async function checkMysql(): Promise<boolean> {
  try {
    await mysqlPool.query("SELECT 1");
    return true;
  } catch {
    return false;
  }
}