import { env } from "./config/env";
import { createApp } from "./app";
import { connectMongo } from "./db/mongo";

async function main() {
  await connectMongo();

  const app = createApp();
  app.listen(env.port, () => {
    console.log(`API running on http://localhost:${env.port}`);
  });
}

main().catch((err) => {
  console.error("Failed to start API:", err);
  process.exit(1);
});