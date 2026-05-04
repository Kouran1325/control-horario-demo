export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/auth";
import { getLastPathSegment } from "@/lib/url";
import { createAdminAuditLog } from "@/lib/logging/audit";
import { userAdminSelect } from "@/lib/selects/user.select";

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

export async function GET(request: Request) {
  try {
    requireAdmin(request);

    const id = getLastPathSegment(request);
    if (!id) return NextResponse.json({ message: "Falta id en la ruta" }, { status: 400 });

    const user = await prisma.user.findUnique({
      where: { id },
      select: userAdminSelect,
    });

    if (!user) return NextResponse.json({ message: "Usuario no encontrado" }, { status: 404 });

    return NextResponse.json({ ok: true, user }, { status: 200 });
  } catch (err: any) {
    console.error("Error interno:", err);

    return NextResponse.json(
      { message: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = requireAdmin(request);

    const id = getLastPathSegment(request);
    if (!id) return NextResponse.json({ message: "Falta id en la ruta" }, { status: 400 });

    const body = await request.json().catch(() => null);
    const enabled = body?.enabled;
    const role = body?.role;

    const data: any = {};

    if (enabled !== undefined) {
      if (typeof enabled !== "boolean") {
        return NextResponse.json({ message: "enabled debe ser boolean" }, { status: 400 });
      }
      data.enabled = enabled;
    }

    if (role !== undefined) {
      if (role !== "ADMIN" && role !== "USER") {
        return NextResponse.json({ message: 'role debe ser "ADMIN" o "USER"' }, { status: 400 });
      }
      data.role = role;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ message: "Nada que actualizar (enabled, role)" }, { status: 400 });
    }

    const previousUser = await prisma.user.findUnique({
      where: { id },
      select: userAdminSelect,
    });

    if (!previousUser) {
      return NextResponse.json({ message: "Usuario no encontrado" }, { status: 404 });
    }

    const updated = await prisma.user.update({
      where: { id },
      data,
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
      action: "ADMIN_UPDATE_USER",
      targetType: "USER",
      targetId: id,
      metadata: {
        targetEmail: updated.email,
        targetName: updated.name,
        changes: {
          enabled: previousUser.enabled !== updated.enabled
            ? { before: previousUser.enabled, after: updated.enabled }
            : null,
          role: previousUser.role !== updated.role
            ? { before: previousUser.role, after: updated.role }
            : null,
        },
      },
      ip: getClientIp(request),
      userAgent: getUserAgent(request),
    });

    return NextResponse.json({ ok: true, user: updated }, { status: 200 });
  } catch (err: any) {
    if (err?.code === "P2025") {
      return NextResponse.json({ message: "Usuario no encontrado" }, { status: 404 });
    }
    console.error("Error interno:", err);

    return NextResponse.json(
      { message: "Error interno del servidor" },
      { status: 500 }
    );
  }
}