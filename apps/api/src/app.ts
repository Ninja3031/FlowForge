import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/env";
import { healthRouter } from "./routes/health";
import { authRouter } from "./routes/auth";
import { usersRouter } from "./routes/users";
import { projectsRouter } from "./routes/projects";
import { tasksRouter } from "./routes/tasks";
import { aiRouter } from "./routes/ai";
import { errorHandler, notFoundHandler } from "./middleware/error";
import { adminRouter } from "./routes/admin";

export function createApp() {
  const app = express();

  // Render and Vercel sit in front of the API, so trust their forwarded headers
  app.set("trust proxy", 1);

  // credentials: true lets the browser send the refresh-token cookie
  app.use(
    cors({
      origin: env.clientOrigins,
      credentials: true,
      exposedHeaders: ["X-Cache", "X-RateLimit-Remaining", "Retry-After"],
    }),
  );
  app.use(express.json());
  app.use(cookieParser());

  app.use("/health", healthRouter);
  app.use("/auth", authRouter);
  app.use("/users", usersRouter);
  app.use("/projects", projectsRouter);
  app.use("/tasks", tasksRouter);
  app.use("/ai", aiRouter);
  app.use("/admin", adminRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}