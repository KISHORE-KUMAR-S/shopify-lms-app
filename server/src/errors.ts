import type { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

import { env } from "./env.js";

/**
 * Every error response the API emits has the same shape:
 *
 *   { "error": { "code": "NOT_FOUND", "message": "...", "details"?: [...] } }
 *
 * so the Polaris frontend can render one consistent banner/toast path.
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }

  static badRequest(message: string, details?: unknown) {
    return new ApiError(400, "BAD_REQUEST", message, details);
  }

  static unauthorized(message = "Authentication required.") {
    return new ApiError(401, "UNAUTHORIZED", message);
  }

  static forbidden(message = "You do not have access to this resource.") {
    return new ApiError(403, "FORBIDDEN", message);
  }

  static notFound(message = "The requested resource was not found.") {
    return new ApiError(404, "NOT_FOUND", message);
  }

  static conflict(message: string, details?: unknown) {
    return new ApiError(409, "CONFLICT", message, details);
  }
}

export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  next(ApiError.notFound(`No route matches ${req.method} ${req.path}.`));
}

/**
 * Translates anything thrown in a route into the standard envelope. Raw stack
 * traces and Postgres driver messages never reach the merchant.
 */
export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  if (res.headersSent) {
    return next(error);
  }

  if (error instanceof ApiError) {
    return res.status(error.status).json({
      error: { code: error.code, message: error.message, details: error.details },
    });
  }

  if (error instanceof ZodError) {
    // Flatten to `{ field: ["message"] }` so forms can map errors to inputs.
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of error.issues) {
      const key = issue.path.join(".") || "_";
      (fieldErrors[key] ??= []).push(issue.message);
    }
    return res.status(422).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Some fields are invalid. Please review and try again.",
        details: fieldErrors,
      },
    });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // P2002 = unique constraint violation. The enrollments table relies on this
    // to block duplicate (studentId, courseId) pairs at the database layer.
    if (error.code === "P2002") {
      return res.status(409).json({
        error: {
          code: "CONFLICT",
          message: "That record already exists.",
        },
      });
    }
    // P2025 = record required by the operation was not found.
    if (error.code === "P2025") {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "The requested resource was not found.",
        },
      });
    }
  }

  console.error("[api] unhandled error:", error);

  return res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "Something went wrong on our end. Please try again.",
      ...(env.isProduction
        ? {}
        : { details: error instanceof Error ? error.message : String(error) }),
    },
  });
}
