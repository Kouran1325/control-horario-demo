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

    const openEntry = await prisma.timeEntry.findFirst({
      where: { userId, endAt: null },
      orderBy: { startAt: "desc" },
      select: { id: true, startAt: true },
    });

    const closedEntries = await prisma.timeEntry.findMany({
      where: {
        userId,
        startAt: { gte: start, lte: end },
        endAt: { not: null },
      },
      select: {
        id: true,
        startAt: true,
        endAt: true,
        latStart: true,
        lonStart: true,
        latEnd: true,
        lonEnd: true,
        accuracyStart: true,
        accuracyEnd: true
      },
      orderBy: {
        startAt: "asc",
      },
    });

    const totalMinutes = closedEntries.reduce((acc, e) => {
      const mins = Math.max(
        0,
        Math.floor((e.endAt!.getTime() - e.startAt.getTime()) / 60000)
      );
      return acc + mins;
    }, 0);

    const totalHours = Math.round((totalMinutes / 60) * 100) / 100;

    const dailyMap = new Map<
      string,
      {
        date: string;
        minutes: number;
        hours: number;
        entries: {
          startAt: string;
          endAt: string;
          minutes: number;
          latStart: number | null;
          lonStart: number | null;
          latEnd: number | null;
          lonEnd: number | null;
          accuracyStart: number | null;
          accuracyEnd: number | null;
        }[];
      }
    >();

    for (const entry of closedEntries) {
      const date = entry.startAt.toISOString().slice(0, 10);

      const minutes = Math.max(
        0,
        Math.floor((entry.endAt!.getTime() - entry.startAt.getTime()) / 60000)
      );

      if (!dailyMap.has(date)) {
        dailyMap.set(date, {
          date,
          minutes: 0,
          hours: 0,
          entries: [],
        });
      }

      const current = dailyMap.get(date)!;

      current.minutes += minutes;
      current.hours = Math.round((current.minutes / 60) * 100) / 100;
      current.entries.push({
        startAt: entry.startAt.toISOString(),
        endAt: entry.endAt!.toISOString(),
        minutes,
        latStart: entry.latStart,
        lonStart: entry.lonStart,
        latEnd: entry.latEnd,
        lonEnd: entry.lonEnd,
        accuracyStart: entry.accuracyStart,
        accuracyEnd: entry.accuracyEnd
      });
    }

    const days = Array.from(dailyMap.values());
    const daysWorked = days.length;

    return NextResponse.json(
      {
        ok: true,
        from,
        to,
        status: openEntry ? "IN" : "OUT",
        openEntry: openEntry ?? null,
        totalMinutes,
        totalHours,
        daysWorked,
        days,
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