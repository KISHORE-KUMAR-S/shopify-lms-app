import type { NextFunction, Request, Response } from "express";
import type { Store } from "@prisma/client";
import { jwtVerify, errors as joseErrors } from "jose";

import { env } from "./env.js";
import { ApiError } from "./errors.js";
import { prisma } from "./prisma.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Populated by `authenticateShop` — the installed store making the call. */
      store: Store;
      /** Convenience alias for `store.shop`, e.g. "my-store.myshopify.com". */
      shop: string;
    }
  }
}

const secret = new TextEncoder().encode(env.SHOPIFY_API_SECRET);

function readBearerToken(req: Request): string {
  const header = req.get("authorization");
  if (!header) {
    throw ApiError.unauthorized("Missing Authorization header.");
  }
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    throw ApiError.unauthorized("Expected an `Authorization: Bearer` header.");
  }
  return token;
}

/**
 * Because the API runs as its own service it cannot reach into the embedded
 * app's Shopify session. Instead the frontend attaches an App Bridge session
 * token (a short-lived JWT signed with the app's client secret) to every
 * request, and we verify it here.
 *
 * See https://shopify.dev/docs/api/app-bridge-library/reference/session-tokens
 */
export async function authenticateShop(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  const token = readBearerToken(req);

  let payload;
  try {
    ({ payload } = await jwtVerify(token, secret, {
      algorithms: ["HS256"],
      audience: env.SHOPIFY_API_KEY,
      // Shopify allows a small amount of drift between the merchant's browser
      // and the app server.
      clockTolerance: 10,
    }));
  } catch (error) {
    if (error instanceof joseErrors.JWTExpired) {
      // A distinct code lets the frontend silently fetch a fresh token and
      // retry instead of showing the merchant an error.
      throw new ApiError(
        401,
        "SESSION_TOKEN_EXPIRED",
        "Your session expired. Please retry.",
      );
    }
    throw ApiError.unauthorized("Invalid session token.");
  }

  const dest = typeof payload.dest === "string" ? payload.dest : "";
  const iss = typeof payload.iss === "string" ? payload.iss : "";

  // Shopify requires that the issuer and destination refer to the same shop;
  // checking this prevents a token minted for one shop being replayed at
  // another.
  if (!dest || !iss || !iss.startsWith(dest)) {
    throw ApiError.unauthorized("Session token issuer mismatch.");
  }

  let shop: string;
  try {
    shop = new URL(dest).hostname;
  } catch {
    throw ApiError.unauthorized("Session token has an invalid destination.");
  }

  const store = await prisma.store.findUnique({ where: { shop } });

  if (!store || store.uninstalledAt) {
    throw ApiError.forbidden(
      "This store does not have the app installed. Please reinstall the app.",
    );
  }

  req.store = store;
  req.shop = store.shop;

  next();
}
