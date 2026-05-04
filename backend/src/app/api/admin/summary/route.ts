export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/auth";

function todayRange() {
  const now = new Date();

  const start = new Date(now);
  start.setUTCHours(0, 0, 0, 0);

  const end = new Date(now);
  end.setUTCHours(23, 59, 59, 999);

  return { start, end };
}

export async function GET(request: Request) {
  try {
    requireAdmin(request);

    const { start, end } = todayRange();

    const totalUsers = await prisma.user.count();

    const activeUsers = await prisma.user.count({
      where: { enabled: true },
    });

    const entriesToday = await prisma.timeEntry.findMany({
      where: {
        startAt: { gte: start, lte: end },
      },
      select: {
        startAt: true,
        endAt: true,
      },
    });

    let totalMinutesToday = 0;

    for (const e of entriesToday) {
      if (!e.endAt) continue;

      const mins = Math.max(
        0,
        Math.floor((e.endAt.getTime() - e.startAt.getTime()) / 60000)
      );

      totalMinutesToday += mins;
    }

    const totalHoursToday = Math.round((totalMinutesToday / 60) * 100) / 100;

    return NextResponse.json(
      {
        ok: true,
        totalUsers,
        activeUsers,
        entriesToday: entriesToday.length,
        totalMinutesToday,
        totalHoursToday,
      },
      { status: 200 }
    );
  } catch (err: any) {
    const status = err?.status || 500;

    return NextResponse.json(
      {
        message: status === 500 ? "Internal Server Error" : err.message,
      },
      { status }
    );
  }
}