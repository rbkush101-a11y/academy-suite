import { config } from "dotenv";
import app from "./app";
import { logger } from "./lib/logger";
import { connectMongoDB } from "./lib/mongodb";

config();
config({ path: new URL("../.env", import.meta.url) });

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function start() {
  await connectMongoDB();

  app.listen(port, "0.0.0.0", () => {
    logger.info({ port }, "Server listening");
  });
}


start().catch((err) => {
  logger.error({ err }, "Failed to start server");
  process.exit(1);
});
