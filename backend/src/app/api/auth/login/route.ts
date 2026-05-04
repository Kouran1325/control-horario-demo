export const runtime = "nodejs";

import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/auth/jwt";
import { createAdminAuditLog } from "@/lib/logging/audit";
import { clearRateLimit, consumeRateLimit } from "@/lib/auth/rate-limit";
import { userPublicSelect } from "@/lib/selects/user.select";


function getClientIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    null
  );
}

function getUserAgent(request: Request) {
  return request.headers.get("user-agent") || null;
}

const LOGIN_LIMIT = 5;
const LOGIN_WINDOW_MS = 60 * 1000;

function getLoginRateLimitKey(request: Request, email: string) {
  const ip = getClientIp(request) || "unknown-ip";
  return `login:${ip}:${email}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);

    const email = body?.email?.trim()?.toLowerCase();
    const password = body?.password;

    if (!email || !password) {
      return NextResponse.json({ message: "Email y password requeridos" }, { status: 400 });
    }

    const rateLimitKey = getLoginRateLimitKey(req, email);

    const rate = consumeRateLimit({
      key: rateLimitKey,
      limit: LOGIN_LIMIT,
      windowMs: LOGIN_WINDOW_MS,
    });

    if (!rate.allowed) {
      return NextResponse.json(
        {
          message: "Demasiados intentos de login. Inténtalo de nuevo en unos segundos.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rate.retryAfterSeconds),
          },
        }
      );
    }

    // Pedimos solo lo necesario (evita devolver passwordHash por accidente)
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        ...userPublicSelect,
        passwordHash: true,
      },
    });

    // Mensaje genérico para no revelar si existe el email
    if (!user) {
      return NextResponse.json({ message: "Credenciales inválidas" }, { status: 401 });
    }

    if (!user.enabled) {
      await createAdminAuditLog({
        adminUserId: user.id,
        action: "LOGIN_DISABLED_USER",
        targetType: "USER",
        targetId: user.id,
        metadata: { email: user.email },
        ip: getClientIp(req),
        userAgent: getUserAgent(req),
      });

      return NextResponse.json({ message: "Usuario pendiente de habilitación" }, { status: 403 });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);

    if (!ok) {
      void createAdminAuditLog({
        adminUserId: user.id,
        action: "LOGIN_FAILED",
        targetType: "USER",
        targetId: user.id,
        metadata: { reason: "BAD_PASSWORD" },
        ip: getClientIp(req),
        userAgent: getUserAgent(req),
      }).catch((auditError: unknown) => {
        console.error(
          "Error creando auditoría LOGIN_FAILED:",
          auditError instanceof Error ? auditError.message : auditError
        );
      });

      return NextResponse.json({ message: "Credenciales inválidas" }, { status: 401 });
    }

    const token = signToken({ userId: user.id, role: user.role });
    clearRateLimit(rateLimitKey);

    const { passwordHash, ...safeUser } = user;

    await createAdminAuditLog({
      adminUserId: user.id,
      action: "LOGIN_SUCCESS",
      targetType: "USER",
      targetId: user.id,
      metadata: { email: user.email },
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
    });

    return NextResponse.json({ ok: true, token, user: safeUser }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ message: "Error interno del servidor" }, { status: 500 });
  }
}