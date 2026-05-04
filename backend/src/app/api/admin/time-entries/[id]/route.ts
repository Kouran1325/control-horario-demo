export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/auth";
import { createAdminAuditLog } from "@/lib/logging/audit";
import { generateTimeEntryHash } from "@/lib/security/time-entry-integrity";

function getTimeEntryIdFromUrl(request: Request) {
  const url = new URL(request.url);
  const parts = url.pathname.split("/").filter(Boolean);
  const idx = parts.findIndex((p) => p === "time-entries");
  return idx >= 0 ? decodeURIComponent(parts[idx + 1]) : null;
}

function parseDate(value: unknown): Date | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
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

export async function PATCH(request: Request) {
  try {
    const admin = requireAdmin(request);

    const id = getTimeEntryIdFromUrl(request);
    if (!id) {
      return NextResponse.json({ message: "Falta id en la ruta" }, { status: 400 });
    }

    const body = await request.json().catch(() => null);

    const startAt = parseDate(body?.startAt);
    const endAt =
      body?.endAt === null || body?.endAt === undefined
        ? body?.endAt
        : parseDate(body?.endAt);

    const reason = typeof body?.reason === "string" ? body.reason.trim() : "";

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
        entryMethod: true,
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
        { message: "No se puede editar un fichaje anulado" },
        { status: 409 }
      );
    }

    const newStartAt = startAt ?? entry.startAt;
    const newEndAt = body?.endAt === undefined ? entry.endAt : endAt;

    if (newEndAt && newEndAt.getTime() <= newStartAt.getTime()) {
      return NextResponse.json(
        { message: "endAt debe ser posterior a startAt" },
        { status: 400 }
      );
    }

    if (newEndAt === null) {
      const open = await prisma.timeEntry.findFirst({
        where: {
          userId: entry.userId,
          endAt: null,
          voidedByAdmin: false,
          NOT: { id },
        },
      });

      if (open) {
        return NextResponse.json(
          { message: "El usuario ya tiene otro fichaje abierto" },
          { status: 409 }
        );
      }
    }

    if (newEndAt) {
      const overlappingEntry = await prisma.timeEntry.findFirst({
        where: {
          userId: entry.userId,
          voidedByAdmin: false,
          NOT: { id },
          startAt: { lt: newEndAt },
          endAt: { gt: newStartAt },
        },
        select: {
          id: true,
          startAt: true,
          endAt: true,
        },
      });

      if (overlappingEntry) {
        return NextResponse.json(
          { message: "El rango horario se solapa con otro fichaje existente" },
          { status: 409 }
        );
      }
    }

    const updated = await prisma.timeEntry.update({
      where: { id },
      data: {
        startAt: newStartAt,
        endAt: newEndAt,
        editedByAdmin: true,
        editedByAdminId: admin.userId,
        editReason: reason,
        editedAt: new Date(),
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
        editedByAdminId: true,
        editReason: true,
        editedAt: true,

        voidedByAdmin: true,
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
      action: "ADMIN_EDIT_TIME_ENTRY",
      targetType: "TIME_ENTRY",
      targetId: updated.id,
      metadata: {
        affectedUserId: entry.userId,
        originalEntryMethod: entry.entryMethod,
        startAt: updated.startAt,
        endAt: updated.endAt,
        reason,
        editedAt: updated.editedAt,
      },
      ip: getClientIp(request),
      userAgent: getUserAgent(request),
    });

    return NextResponse.json(
      {
        ok: true,
        message: "Fichaje actualizado correctamente",
        timeEntry: updated,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Error edit time-entry:", err instanceof Error ? err.message : err);

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