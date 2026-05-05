import jwt, { type SignOptions } from "jsonwebtoken";

const JWT_EXPIRES_IN = "8h" as const;

function requireSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET no está definido en backend/.env");
  return secret;
}

export function signToken(payload: object) {
  return jwt.sign(payload, requireSecret(), {
    expiresIn: JWT_EXPIRES_IN,
  });
}

export function verifyToken(token: string) {
  try {
    return jwt.verify(token, requireSecret()) as any;
  } catch {
    return null;
  }
}