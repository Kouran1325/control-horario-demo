export const runtime = "nodejs";

import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/auth";
import { createAdminAuditLog } from "@/lib/logging/audit";

function getUserIdFromUrl(request: Request) {
  const url = new URL(request.url);
  const parts = url.pathname.split("/").filter(Boolean);
  // ... /api/admin/users/{id}/reset-password
  // id = penúltimo del "reset-password" -> en realidad está 2 posiciones antes del final
  const idx = parts.findIndex((p) => p === "users");
  const id = idx >= 0 ? parts[idx + 1] : null;
  return id ? decodeURIComponent(id) : null;
}

function validatePassword(pw: string) {
  if (pw.length < 8) return "La contraseña debe tener al menos 8 caracteres.";
  if (!/[a-z]/.test(pw)) return "La contraseña debe incluir al menos una minúscula.";
  if (!/[A-Z]/.test(pw)) return "La contraseña debe incluir al menos una mayúscula.";
  if (!/\d/.test(pw)) return "La contraseña debe incluir al menos un número.";
  return null;
}

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

export async function POST(request: Request) {
  try {
    const admin = requireAdmin(request);

    const userId = getUserIdFromUrl(request);
    if (!userId) {
      return NextResponse.json({ message: "Falta id en la ruta" }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    const newPassword = body?.password;

    if (typeof newPassword !== "string" || !newPassword) {
      return NextResponse.json({ message: "password es obligatorio" }, { status: 400 });
    }

    const pwError = validatePassword(newPassword);
    if (pwError) {
      return NextResponse.json({ message: pwError }, { status: 400 });
    }

    // comprobar que existe (para dar 404 claro)
    const exists = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!exists) {
      return NextResponse.json({ message: "Usuario no encontrado" }, { status: 404 });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        enabled: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await createAdminAuditLog({
      adminUserId: admin.userId,
      action: "ADMIN_RESET_PASSWORD",
      targetType: "USER",
      targetId: userId,
      metadata: {
        targetEmail: updated.email,
        targetName: updated.name,
      },
      ip: getClientIp(request),
      userAgent: getUserAgent(request),
    });

    return NextResponse.json(
      { ok: true, message: "Contraseña actualizada", user: updated },
      { status: 200 }
    );
  } catch (err: any) {
    const status = err?.status || 500;
    return NextResponse.json(
      { message: status === 500 ? "Internal Server Error" : err.message },
      { status }
    );
  }
}