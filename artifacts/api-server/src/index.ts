import { config } from "dotenv";
import app from "./app";
import { logger } from "./lib/logger";
import { connectMongoDB } from "./lib/mongodb";
import { assertJwtSecret } from "./lib/jwt";
import { isAuthEmailDeliveryConfigured, processAuthEmailOutbox } from "./lib/auth-security";

config();
config({ path: new URL("../.env", import.meta.url) });

if (process.env.TRUST_PROXY_HOPS) {
  const trustProxyHops = Number(process.env.TRUST_PROXY_HOPS);
  if (!Number.isInteger(trustProxyHops) || trustProxyHops < 1 || trustProxyHops > 10) {
    throw new Error("TRUST_PROXY_HOPS must be an integer from 1 to 10 when configured.");
  }
  app.set("trust proxy", trustProxyHops);
}

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
  assertJwtSecret();
  await connectMongoDB();

  if (await isAuthEmailDeliveryConfigured()) {
    const emailWorker = setInterval(() => {
      void processAuthEmailOutbox().catch((err: unknown) => logger.error({ err }, "Auth email outbox worker failed"));
    }, 15_000);
    emailWorker.unref();
  }

  app.listen(port, "0.0.0.0", () => {
    logger.info({ port }, "Server listening");
  });
}


start().catch((err) => {
  logger.error({ err }, "Failed to start server");
  process.exit(1);
});
