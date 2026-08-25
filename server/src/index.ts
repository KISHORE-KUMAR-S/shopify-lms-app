import cors from "cors";
import express from "express";

import { authenticateShop } from "./authenticate.js";
import { env } from "./env.js";
import { errorHandler, notFoundHandler } from "./errors.js";
import { prisma } from "./prisma.js";
import { coursesRouter } from "./routes/courses.js";
import { dashboardRouter } from "./routes/dashboard.js";
import { enrollmentsRouter } from "./routes/enrollments.js";
import { studentsRouter } from "./routes/students.js";

const app = express();

app.disable("x-powered-by");
app.use(express.json({ limit: "100kb" }));

// Cloudflare quick tunnels (`shopify app dev`'s default) mint a new random
// subdomain on every restart, so hardcoding one in API_CORS_ORIGINS goes
// stale immediately. In development, trust any *.trycloudflare.com origin
// instead of chasing the URL by hand; production still requires an explicit
// allowlist.
const trycloudflareOrigin = /^https:\/\/[a-z0-9-]+\.trycloudflare\.com$/;

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (env.corsOrigins.includes(origin)) return callback(null, true);
      if (!env.isProduction && trycloudflareOrigin.test(origin)) {
        return callback(null, true);
      }
      callback(new Error(`Origin ${origin} is not allowed.`));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Authorization", "Content-Type"],
    maxAge: 86400,
  }),
);

/** Unauthenticated liveness probe. Confirms the process and Postgres are up. */
app.get("/health", async (_req, res) => {
  await prisma.$queryRaw`SELECT 1`;
  res.json({ status: "ok", uptime: process.uptime() });
});

/**
 * Everything under /api requires a valid Shopify session token, so protected
 * data can never be reached without an authenticated, installed shop.
 */
const api = express.Router();
api.use(authenticateShop);

api.get("/me", (req, res) => {
  res.json({
    shop: req.shop,
    installedAt: req.store.installedAt,
    scope: req.store.scope,
  });
});

api.use("/courses", coursesRouter);
api.use("/students", studentsRouter);
api.use("/enrollments", enrollmentsRouter);
api.use("/dashboard", dashboardRouter);

app.use("/api", api);

app.use(notFoundHandler);
app.use(errorHandler);

const server = app.listen(env.API_PORT, () => {
  console.log(`[api] listening on http://localhost:${env.API_PORT}`);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    server.close(() => {
      void prisma.$disconnect().then(() => process.exit(0));
    });
  });
}
