import { env } from "./config/env";
import { createApp } from "./app";
import { connectMongo } from "./db/mongo";
import { startHealthWorker } from "./jobs/health-worker";
import { aiMode } from "./services/ai";

async function main() {
  await connectMongo();

  // For a small app the worker runs in the same process.
  // In production you could run it as its own container instead.
  startHealthWorker();

  const app = createApp();
  app.listen(env.port, () => {
    console.log(`API running on http://localhost:${env.port} (AI mode: ${aiMode})`);
  });
}

main().catch((err) => {
  console.error("Failed to start API:", err);
  process.exit(1);
});