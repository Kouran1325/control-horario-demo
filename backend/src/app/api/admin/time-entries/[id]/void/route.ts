export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/auth";
import { createAdminAuditLog } from "@/lib/logging/audit";
import { generateTimeEntryHash } from "@/lib/security/time-entry-integrity";

function getTimeEntryIdFromUrl(request: Request) {
  const url = new URL(request.url);
  const parts = url.pathname.split("/").filter(Boolean);
  // ... /api/admin/time-entries/{id}/void
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

export async function POST(request: Request) {
  try {
    const admin = requireAdmin(request);

    const id = getTimeEntryIdFromUrl(request);
    if (!id) {
      return NextResponse.json(
        { message: "Falta id en la ruta" },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => null);
    const reason =
      typeof body?.reason === "string" && body.reason.trim()
        ? body.reason.trim()
        : "";

    if (!reason) {
      return NextResponse.json(
        { message: "El motivo es obligatorio" },
        { status: 400 }
      );
    }

    const entry = await prisma.timeEntry.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        startAt: true,
        endAt: true,
        voidedByAdmin: true,
        voidedByAdminId: true,
        voidReason: true,
        voidedAt: true,
      },
    });

    if (!entry) {
      return NextResponse.json(
        { message: "Fichaje no encontrado" },
        { status: 404 }
      );
    }

    if (entry.voidedByAdmin) {
      return NextResponse.json(
        { message: "Ese fichaje ya está anulado" },
        { status: 409 }
      );
    }

    const updated = await prisma.timeEntry.update({
      where: { id },
      data: {
        voidedByAdmin: true,
        voidedByAdminId: admin.userId,
        voidReason: reason,
        voidedAt: new Date(),
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
        voidedByAdminId: true,
        voidReason: true,
        voidedAt: true,

        closedByAdmin: true,

        entryMethod: true,
      },
    });

    const hash = generateTimeEntryHash({
      id: updated.id,
      userId: updated.userId,
      startAt: updated.startAt,
      endAt: updated.endAt,
      latStart: updated.latStart,
      lonStart: updated.lonStart,
      accuracyStart: updated.accuracyStart,
      latEnd: updated.latEnd,
      lonEnd: updated.lonEnd,
      accuracyEnd: updated.accuracyEnd,
      createdAt: updated.createdAt,
      createdByAdmin: updated.createdByAdmin,
      editedByAdmin: updated.editedByAdmin,
      voidedByAdmin: updated.voidedByAdmin,
      closedByAdmin: updated.closedByAdmin,
      entryMethod: updated.entryMethod,
    });

    await prisma.timeEntry.update({
      where: { id: updated.id },
      data: { hash },
    });

    await createAdminAuditLog({
      adminUserId: admin.userId,
      action: "ADMIN_VOID_TIME_ENTRY",
      targetType: "TIME_ENTRY",
      targetId: updated.id,
      metadata: {
        affectedUserId: updated.userId,
        startAt: updated.startAt,
        endAt: updated.endAt,
        reason: updated.voidReason,
        voidedAt: updated.voidedAt,
      },
      ip: getClientIp(request),
      userAgent: getUserAgent(request),
    });

    return NextResponse.json(
      {
        ok: true,
        message: "Fichaje anulado correctamente",
        timeEntry: updated,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error(
      "Error en POST /api/admin/time-entries/[id]/void:",
      err instanceof Error ? err.message : err
    );

    const status = err?.status || 500;

    return NextResponse.json(
      {
        message:
          status === 500
            ? "Error interno del servidor"
            : err?.message || "Error en la petición",
      },
      { status }
    );
  }
}