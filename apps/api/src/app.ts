import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/env";
import { healthRouter } from "./routes/health";
import { authRouter } from "./routes/auth";
import { usersRouter } from "./routes/users";
import { projectsRouter } from "./routes/projects";
import { tasksRouter } from "./routes/tasks";
import { errorHandler, notFoundHandler } from "./middleware/error";

export function createApp() {
  const app = express();

  // credentials: true lets the browser send the refresh-token cookie
  app.use(cors({ origin: env.clientOrigins, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());

  app.use("/health", healthRouter);
  app.use("/auth", authRouter);
  app.use("/users", usersRouter);
  app.use("/projects", projectsRouter);
  app.use("/tasks", tasksRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}