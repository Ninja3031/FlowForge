import express from "express";
import cors from "cors";
import { healthRouter } from "./routes/health";

export function createApp() {
  const app = express();

  app.use(cors({ origin: ["http://localhost:3000", "http://localhost:4200"] }));
  app.use(express.json());

  app.use("/health", healthRouter);

  return app;
}