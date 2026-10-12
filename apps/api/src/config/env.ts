import dotenv from "dotenv";

dotenv.config();

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

export const env = {
  isProd: process.env.NODE_ENV === "production",
  port: Number(process.env.PORT ?? 4000),
  mysqlUrl: required("MYSQL_URL"),
  // Hosted MySQL (like Aiven) needs SSL. Paste the CA certificate here in production.
  mysqlCaCert: process.env.MYSQL_CA_CERT ?? "",
  mongoUrl: required("MONGO_URL"),
  redisUrl: required("REDIS_URL"),
  jwtAccessSecret: required("JWT_ACCESS_SECRET"),
  jwtRefreshSecret: required("JWT_REFRESH_SECRET"),
    // Leave empty to run AI features in demo mode (canned answers, no API calls)
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
  aiModel: process.env.AI_MODEL ?? "claude-haiku-5-5",
  clientOrigins: (process.env.CLIENT_ORIGINS ?? "http://localhost:3000,http://localhost:4200")
    .split(",")
    .map((origin) => origin.trim()),
};