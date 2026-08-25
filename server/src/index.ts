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

// Auth here is a bearer token attached per-request (not an ambient cookie),
// so an open CORS policy doesn't expose anything a stolen/leaked token
// wouldn't already expose. Simplifies away tunnel-URL churn and per-deploy
// allowlist maintenance.
app.use(
  cors({
    origin: true,
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

const server = app.listen(env.PORT, () => {
  console.log(`[api] listening on http://localhost:${env.PORT}`);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    server.close(() => {
      void prisma.$disconnect().then(() => process.exit(0));
    });
  });
}
