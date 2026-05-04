export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/auth";
import { generateTimeEntryHash } from "@/lib/security/time-entry-integrity";
import { createAdminAuditLog } from "@/lib/logging/audit";

function isYYYYMMDD(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export async function GET(request: Request) {
  try {
    const admin = requireAdmin(request);

    const url = new URL(request.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const userId = url.searchParams.get("userId");

    if (!from || !to) {
      return NextResponse.json(
        { message: "Parámetros obligatorios: from y to (YYYY-MM-DD)" },
        { status: 400 }
      );
    }

    if (!isYYYYMMDD(from) || !isYYYYMMDD(to)) {
      return NextResponse.json(
        { message: "Formato de fecha inválido. Usa YYYY-MM-DD (ej: 2026-03-01)" },
        { status: 400 }
      );
    }

    const start = new Date(`${from}T00:00:00.000Z`);
    const end = new Date(`${to}T23:59:59.999Z`);

    const where: any = {
      startAt: { gte: start, lte: end },
    };

    if (userId) where.userId = userId;

    const entries = await prisma.timeEntry.findMany({
      where,
      orderBy: { startAt: "desc" },
      take: 500,
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
        hash: true,
        tamperDetectedAt: true,

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

    const entriesWithDuration = await Promise.all(
      entries.map(async (e) => {
        const durationMinutes =
          e.endAt
            ? Math.max(0, Math.floor((e.endAt.getTime() - e.startAt.getTime()) / 60000))
            : null;

        const expectedHash = generateTimeEntryHash({
          id: e.id,
          userId: e.userId,
          startAt: e.startAt,
          endAt: e.endAt,
          latStart: e.latStart,
          lonStart: e.lonStart,
          accuracyStart: e.accuracyStart,
          latEnd: e.latEnd,
          lonEnd: e.lonEnd,
          accuracyEnd: e.accuracyEnd,
          createdAt: e.createdAt,
          createdByAdmin: e.createdByAdmin,
          editedByAdmin: e.editedByAdmin,
          voidedByAdmin: e.voidedByAdmin,
          closedByAdmin: e.closedByAdmin,
          entryMethod: e.entryMethod,
        });

        const isTampered = !e.hash || e.hash !== expectedHash;

        if (isTampered && !e.tamperDetectedAt) {
          const detectedAt = new Date();

          await prisma.timeEntry.update({
            where: { id: e.id },
            data: {
              tamperDetectedAt: detectedAt,
            },
          });

          await createAdminAuditLog({
            adminUserId: admin.userId,
            action: "TIME_ENTRY_TAMPERED_DETECTED",
            targetType: "TIME_ENTRY",
            targetId: e.id,
            metadata: {
              affectedUserId: e.userId,
              detectedAt: detectedAt.toISOString(),
              reason: "Hash mismatch detected during admin summary query",
            },
            ip: null,
            userAgent: "ADMIN_SUMMARY_INTEGRITY_CHECK",
          });
        }

        return {
          ...e,
          durationMinutes,
          isTampered,
          tamperDetectedAt: e.tamperDetectedAt ?? null,
        };
      })
    );

    const validEntriesForTotals = entriesWithDuration.filter((e) => !e.voidedByAdmin);

    const totalMinutes = validEntriesForTotals.reduce(
      (acc, e) => acc + (e.durationMinutes ?? 0),
      0
    );

    const totalHours = Math.round((totalMinutes / 60) * 100) / 100;

    return NextResponse.json(
      {
        ok: true,
        from,
        to,
        userId: userId ?? null,
        totalMinutes,
        totalHours,
        entries: entriesWithDuration,
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