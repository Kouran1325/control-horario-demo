export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/auth";
import { createAdminAuditLog } from "@/lib/logging/audit";

function getUserIdFromUrl(request: Request) {
  const url = new URL(request.url);
  const parts = url.pathname.split("/").filter(Boolean);
  // ... /api/admin/users/{id}/force-stop-open
  const idx = parts.findIndex((p) => p === "users");
  const id = idx >= 0 ? parts[idx + 1] : null;
  return id ? decodeURIComponent(id) : null;
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

const MAX_MINUTES = 16 * 60;

export async function POST(request: Request) {
  try {
    const admin = requireAdmin(request);

    const userId = getUserIdFromUrl(request);
    if (!userId) {
      return NextResponse.json({ message: "Falta id en la ruta" }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    const closeReason =
      typeof body?.reason === "string" && body.reason.trim()
        ? body.reason.trim()
        : "FORCED_BY_ADMIN";

    const openEntry = await prisma.timeEntry.findFirst({
      where: { userId, endAt: null },
      orderBy: { startAt: "desc" },
      select: {
        id: true,
        userId: true,
        startAt: true,
        endAt: true,
        createdAt: true,
        updatedAt: true,
        closedByAdmin: true,
        closedByAdminId: true,
        closeReason: true,
        closeMethod: true,
      },
    });

    if (!openEntry) {
      return NextResponse.json(
        { message: "Este usuario no tiene fichaje abierto", openEntry: null },
        { status: 409 }
      );
    }

    const now = new Date();
    const capEndAt = new Date(openEntry.startAt.getTime() + MAX_MINUTES * 60 * 1000);

    const useCap = now.getTime() > capEndAt.getTime();
    const finalEndAt = useCap ? capEndAt : now;
    const finalCloseMethod = useCap ? "CAP" : "ADMIN";

    const closed = await prisma.timeEntry.update({
      where: { id: openEntry.id },
      data: {
        endAt: finalEndAt,
        closedByAdmin: true,
        closedByAdminId: admin.userId,
        closeReason,
        closeMethod: finalCloseMethod,
      },
      select: {
        id: true,
        userId: true,
        startAt: true,
        endAt: true,
        createdAt: true,
        updatedAt: true,
        closedByAdmin: true,
        closedByAdminId: true,
        closeReason: true,
        closeMethod: true,
      },
    });

    const durationMinutes = Math.max(
      0,
      Math.floor((closed.endAt!.getTime() - closed.startAt.getTime()) / 60000)
    );

    await createAdminAuditLog({
      adminUserId: admin.userId,
      action: "ADMIN_FORCE_STOP_OPEN",
      targetType: "USER",
      targetId: userId,
      metadata: {
        timeEntryId: closed.id,
        affectedUserId: closed.userId,
        startAt: closed.startAt,
        endAt: closed.endAt,
        durationMinutes,
        closeMethod: closed.closeMethod,
        closeReason: closed.closeReason,
        cappedTo16h: useCap,
      },
      ip: getClientIp(request),
      userAgent: getUserAgent(request),
    });

    return NextResponse.json(
      {
        ok: true,
        forced: true,
        durationMinutes,
        cappedTo16h: useCap,
        timeEntry: closed,
      },
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