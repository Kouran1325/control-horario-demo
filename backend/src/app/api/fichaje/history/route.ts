export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/auth";

function isYYYYMMDD(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export async function GET(request: Request) {
  try {
    const { userId } = requireAuth(request);

    const url = new URL(request.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");

    if ((from && !isYYYYMMDD(from)) || (to && !isYYYYMMDD(to))) {
      return NextResponse.json(
        { message: "Formato de fecha inválido. Usa YYYY-MM-DD (ej: 2026-03-01)" },
        { status: 400 }
      );
    }

    const where: any = { userId };
    if (from || to) {
      where.startAt = {};
      if (from) where.startAt.gte = new Date(`${from}T00:00:00.000Z`);
      if (to) where.startAt.lte = new Date(`${to}T23:59:59.999Z`);
    }

    const entries = await prisma.timeEntry.findMany({
      where,
      orderBy: { startAt: "desc" },
      take: 200,
      select: { id: true, startAt: true, endAt: true, createdAt: true, updatedAt: true },
    });

    const entriesWithDuration = entries.map((e) => {
      const durationMinutes =
        e.endAt ? Math.max(0, Math.floor((e.endAt.getTime() - e.startAt.getTime()) / 60000)) : null;
      return { ...e, durationMinutes };
    });

    const totalMinutes = entriesWithDuration.reduce((acc, e) => acc + (e.durationMinutes ?? 0), 0);
    const totalHours = Math.round((totalMinutes / 60) * 100) / 100;

    return NextResponse.json(
      { ok: true, from, to, totalMinutes, totalHours, entries: entriesWithDuration },
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