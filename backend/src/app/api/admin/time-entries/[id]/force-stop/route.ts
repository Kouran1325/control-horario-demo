export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/auth";
import { createAdminAuditLog } from "@/lib/logging/audit";
import { generateTimeEntryHash } from "@/lib/security/time-entry-integrity";

function getTimeEntryIdFromUrl(request: Request) {
  const url = new URL(request.url);
  const parts = url.pathname.split("/").filter(Boolean);
  // ... /api/admin/time-entries/{id}/force-stop
  const idx = parts.findIndex((p) => p === "time-entries");
  if (idx === -1) return null;
  const id = parts[idx + 1];
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

    const id = getTimeEntryIdFromUrl(request);
    if (!id) {
      return NextResponse.json({ message: "Falta id en la ruta" }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    const closeReason =
      typeof body?.reason === "string" && body.reason.trim()
        ? body.reason.trim()
        : "FORCED_BY_ADMIN";

    const entry = await prisma.timeEntry.findUnique({
      where: { id },
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
        voidedByAdmin: true,
      },
    });

    if (!entry) {
      return NextResponse.json({ message: "TimeEntry no encontrado" }, { status: 404 });
    }

    if (entry.voidedByAdmin) {
      return NextResponse.json(
        { message: "No se puede cerrar un fichaje anulado" },
        { status: 409 }
      );
    }

    if (entry.endAt) {
      return NextResponse.json(
        { message: "Ese fichaje ya está cerrado", timeEntry: entry },
        { status: 409 }
      );
    }

    const now = new Date();
    const capEndAt = new Date(entry.startAt.getTime() + MAX_MINUTES * 60 * 1000);

    const useCap = now.getTime() > capEndAt.getTime();
    const finalEndAt = useCap ? capEndAt : now;
    const finalCloseMethod = useCap ? "AUTO_CAP_16H" : "FORCE_STOP";

    const closed = await prisma.timeEntry.update({
      where: { id },
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

        latStart: true,
        lonStart: true,
        accuracyStart: true,
        latEnd: true,
        lonEnd: true,
        accuracyEnd: true,

        createdByAdmin: true,
        editedByAdmin: true,
        voidedByAdmin: true,
        closedByAdmin: true,
        closedByAdminId: true,
        closeReason: true,
        closeMethod: true,

        entryMethod: true,
      },
    });

    const hash = generateTimeEntryHash({
      id: closed.id,
      userId: closed.userId,
      startAt: closed.startAt,
      endAt: closed.endAt,
      latStart: closed.latStart,
      lonStart: closed.lonStart,
      accuracyStart: closed.accuracyStart,
      latEnd: closed.latEnd,
      lonEnd: closed.lonEnd,
      accuracyEnd: closed.accuracyEnd,
      createdAt: closed.createdAt,
      createdByAdmin: closed.createdByAdmin,
      editedByAdmin: closed.editedByAdmin,
      voidedByAdmin: closed.voidedByAdmin,
      closedByAdmin: closed.closedByAdmin,
      entryMethod: closed.entryMethod,
    });

    await prisma.timeEntry.update({
      where: { id: closed.id },
      data: { hash },
    });

    const durationMinutes = Math.max(
      0,
      Math.floor((closed.endAt!.getTime() - closed.startAt.getTime()) / 60000)
    );

    await createAdminAuditLog({
      adminUserId: admin.userId,
      action: "ADMIN_FORCE_STOP_ENTRY",
      targetType: "TIME_ENTRY",
      targetId: closed.id,
      metadata: {
        affectedUserId: closed.userId,
        startAt: closed.startAt,
        endAt: closed.endAt,
        durationMinutes,
        closeMethod: closed.closeMethod,
        closeReason: closed.closeReason,
        cappedTo16h: useCap,
        forcedByAdminId: admin.userId,
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