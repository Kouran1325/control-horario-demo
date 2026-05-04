export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/auth";

export async function GET(request: Request) {
  try {
    requireAdmin(request);

    const url = new URL(request.url);
    const hoursParam = url.searchParams.get("openHours");
    const openHours = hoursParam ? Number(hoursParam) : 12;

    if (!Number.isFinite(openHours) || openHours <= 0) {
      return NextResponse.json(
        { message: 'openHours debe ser un número > 0 (ej: 12)' },
        { status: 400 }
      );
    }

    const threshold = new Date(Date.now() - openHours * 60 * 60 * 1000);

    // 1) Fichajes abiertos demasiado tiempo
    const openTooLong = await prisma.timeEntry.findMany({
      where: {
        endAt: null,
        startAt: { lt: threshold },
      },
      orderBy: { startAt: "asc" },
      take: 200,
      select: {
        id: true,
        userId: true,
        startAt: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            enabled: true,
            role: true,
          },
        },
      },
    });

    // 2) Usuarios deshabilitados con fichaje abierto
    const disabledWithOpen = await prisma.timeEntry.findMany({
      where: {
        endAt: null,
        user: { enabled: false },
      },
      orderBy: { startAt: "asc" },
      take: 200,
      select: {
        id: true,
        userId: true,
        startAt: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            enabled: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        ok: true,
        openHours,
        counts: {
          openTooLong: openTooLong.length,
          disabledWithOpen: disabledWithOpen.length,
        },
        openTooLong,
        disabledWithOpen,
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