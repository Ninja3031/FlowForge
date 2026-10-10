import dotenv from "dotenv";

dotenv.config();

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  mysqlUrl: required("MYSQL_URL"),
  mongoUrl: required("MONGO_URL"),
  redisUrl: required("REDIS_URL"),
};