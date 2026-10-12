import "dotenv/config";
import { defineConfig } from "drizzle-kit";

// Split the URL into parts so we can add SSL for hosted MySQL
const url = new URL(process.env.MYSQL_URL!);
const caCert = process.env.MYSQL_CA_CERT;

export default defineConfig({
  dialect: "mysql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.slice(1),
    ssl: caCert ? { ca: caCert } : undefined,
  },
});