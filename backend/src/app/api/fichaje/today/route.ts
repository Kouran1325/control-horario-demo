export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/auth";

function toYYYYMMDD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function GET(request: Request) {
  try {
    const { userId } = requireAuth(request);

    const todayStr = toYYYYMMDD(new Date());
    const start = new Date(`${todayStr}T00:00:00.000Z`);
    const end = new Date(`${todayStr}T23:59:59.999Z`);

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
      },
    });

    const entriesToday = await prisma.timeEntry.findMany({
      where: { userId, startAt: { gte: start, lte: end } },
      orderBy: { startAt: "desc" },
      select: {
        id: true,
        startAt: true,
        endAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const totalMinutesToday = entriesToday.reduce((acc, e) => {
      if (!e.endAt) return acc;
      const mins = Math.max(0, Math.floor((e.endAt.getTime() - e.startAt.getTime()) / 60000));
      return acc + mins;
    }, 0);

    const totalHoursToday = Math.round((totalMinutesToday / 60) * 100) / 100;

    return NextResponse.json(
      {
        date: todayStr,
        status: openEntry ? "IN" : "OUT",
        openEntry: openEntry ?? null,
        totalMinutesToday,
        totalHoursToday,
        entriesToday,
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