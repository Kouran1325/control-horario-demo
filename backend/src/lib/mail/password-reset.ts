import crypto from "crypto";

const RESET_PASSWORD_TOKEN_EXPIRES_IN_MS = 60 * 60 * 1000; // 1 hora

export function generatePasswordResetToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function hashPasswordResetToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function getPasswordResetExpirationDate(): Date {
  return new Date(Date.now() + RESET_PASSWORD_TOKEN_EXPIRES_IN_MS);
}