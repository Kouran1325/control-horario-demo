import { verifyToken } from "@/lib/auth/jwt";

export type AuthPayload = {
  userId: string;
  role?: string;
  iat?: number;
  exp?: number;
};

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function getBearerToken(request: Request) {
  const auth = request.headers.get("authorization") || "";
  const [type, token] = auth.split(" ");
  if (type !== "Bearer" || !token) return null;
  return token;
}

export function requireAuth(request: Request): AuthPayload {
  const token = getBearerToken(request);
  if (!token) throw new HttpError(401, "Falta Authorization Bearer token");

  const payload = verifyToken(token);
  if (!payload) throw new HttpError(401, "Token inválido o expirado");

  const userId = (payload as any).userId as string | undefined;
  if (!userId) throw new HttpError(401, "Token sin userId");

  return payload as AuthPayload;
}

export function requireAdmin(request: Request): AuthPayload {
  const payload = requireAuth(request);
  if (payload.role !== "ADMIN") throw new HttpError(403, "No autorizado (ADMIN requerido)");
  return payload;
}