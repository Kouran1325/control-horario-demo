export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/auth";
import { createAdminAuditLog } from "@/lib/logging/audit";
import { generateTimeEntryHash } from "@/lib/security/time-entry-integrity";

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

function parseDate(value: unknown): Date | null {
  if (typeof value !== "string" || !value.trim()) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function POST(request: Request) {
  try {
    const admin = requireAdmin(request);

    const body = await request.json().catch(() => null);

    const userId = typeof body?.userId === "string" ? body.userId.trim() : "";
    const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
    const startAt = parseDate(body?.startAt);
    const endAt =
      body?.endAt === null || body?.endAt === undefined
        ? null
        : parseDate(body?.endAt);

    if (!userId) {
      return NextResponse.json(
        { message: "userId es obligatorio" },
        { status: 400 }
      );
    }

    if (!reason) {
      return NextResponse.json(
        { message: "El motivo es obligatorio" },
        { status: 400 }
      );
    }

    if (!startAt) {
      return NextResponse.json(
        { message: "startAt es obligatorio y debe ser una fecha válida" },
        { status: 400 }
      );
    }

    if (body?.endAt !== null && body?.endAt !== undefined && !endAt) {
      return NextResponse.json(
        { message: "endAt debe ser una fecha válida o null" },
        { status: 400 }
      );
    }

    if (endAt && endAt.getTime() <= startAt.getTime()) {
      return NextResponse.json(
        { message: "endAt debe ser posterior a startAt" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        enabled: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { message: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    if (!endAt) {
      const openEntry = await prisma.timeEntry.findFirst({
        where: {
          userId,
          endAt: null,
          voidedByAdmin: false
        },
        select: {
          id: true,
          startAt: true,
        },
      });

      if (openEntry) {
        return NextResponse.json(
          { message: "Ese usuario ya tiene un fichaje abierto" },
          { status: 409 }
        );
      }
    }

    if (endAt) {
      const overlappingEntry = await prisma.timeEntry.findFirst({
        where: {
          userId,
          voidedByAdmin: false,
          startAt: { lt: endAt },
          endAt: { gt: startAt },
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

    const created = await prisma.timeEntry.create({
      data: {
        userId,
        startAt,
        endAt,
        createdByAdmin: true,
        createdByAdminId: admin.userId,
        createReason: reason,
        entryMethod: "ADMIN_MANUAL",
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
        createdByAdminId: true,
        createReason: true,

        editedByAdmin: true,
        editedByAdminId: true,
        editReason: true,
        editedAt: true,

        voidedByAdmin: true,
        voidedByAdminId: true,
        voidReason: true,
        voidedAt: true,

        closedByAdmin: true,
        closedByAdminId: true,
        closeReason: true,
        closeMethod: true,

        entryMethod: true,

        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            enabled: true,
          },
        },
      },
    });

    const hash = generateTimeEntryHash({
      id: created.id,
      userId: created.userId,
      startAt: created.startAt,
      endAt: created.endAt,
      latStart: created.latStart,
      lonStart: created.lonStart,
      accuracyStart: created.accuracyStart,
      latEnd: created.latEnd,
      lonEnd: created.lonEnd,
      accuracyEnd: created.accuracyEnd,
      createdAt: created.createdAt,
      createdByAdmin: created.createdByAdmin,
      editedByAdmin: created.editedByAdmin,
      voidedByAdmin: created.voidedByAdmin,
      closedByAdmin: created.closedByAdmin,
      entryMethod: created.entryMethod,
    });

    await prisma.timeEntry.update({
      where: { id: created.id },
      data: { hash },
    });

    await createAdminAuditLog({
      adminUserId: admin.userId,
      action: "ADMIN_CREATE_MANUAL_TIME_ENTRY",
      targetType: "TIME_ENTRY",
      targetId: created.id,
      metadata: {
        affectedUserId: created.userId,
        affectedUserEmail: created.user.email,
        affectedUserName: created.user.name,
        startAt: created.startAt,
        endAt: created.endAt,
        reason,
        entryMethod: created.entryMethod,
        openedOnly: created.endAt === null,
      },
      ip: getClientIp(request),
      userAgent: getUserAgent(request),
    });

    return NextResponse.json(
      {
        ok: true,
        message: created.endAt
          ? "Fichaje manual creado correctamente"
          : "Fichaje manual abierto correctamente",
        timeEntry: created,
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error(
      "Error en POST /api/admin/time-entries/manual:",
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