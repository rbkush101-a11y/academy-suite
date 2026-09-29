import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(helmet());

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
});

app.use("/api", apiLimiter);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://www.parikshadrishti.com",
  "https://parikshadrishti.com",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Server-to-server / health-check requests
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);

// Student and Staff photo/document uploads are sent as base64 data.
// 10mb prevents "Payload Too Large" errors when saving or updating them.
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

app.get("/", (_req, res) => {
  res.send("Server chal raha hai");
});

// Keep-alive / health check — auth ke bina, cron isko ping karega
app.get("/api/health", (_req, res) => {
  res.status(200).json({
    ok: true,
    uptime: Math.round(process.uptime()),
    time: new Date().toISOString(),
  });
});

app.use("/api", router);

export default app;
