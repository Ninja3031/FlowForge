import { drizzle } from "drizzle-orm/mysql2";
import { mysqlPool } from "./mysql";
import * as schema from "./schema";

export const db = drizzle(mysqlPool, { schema, mode: "default" });