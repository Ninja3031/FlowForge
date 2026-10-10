import mongoose from "mongoose";
import { env } from "../config/env";

export async function connectMongo(): Promise<void> {
  await mongoose.connect(env.mongoUrl);
}

export function checkMongo(): boolean {
  // 1 means "connected"
  return mongoose.connection.readyState === 1;
}