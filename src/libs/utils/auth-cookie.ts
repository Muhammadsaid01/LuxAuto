import { CookieOptions } from "express";

export function authCookieOptions(): CookieOptions {
  const secure = process.env.COOKIE_SECURE === undefined
    ? process.env.NODE_ENV === "production"
    : process.env.COOKIE_SECURE === "true";
  const sameSite = process.env.COOKIE_SAME_SITE || "lax";
  if (!["lax", "strict", "none"].includes(sameSite) || (sameSite === "none" && !secure)) {
    throw new Error("Invalid authentication cookie configuration");
  }
  return { httpOnly: true, secure, sameSite: sameSite as "lax" | "strict" | "none", path: "/" };
}
