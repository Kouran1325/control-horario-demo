export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/auth";

export async function GET(request: Request) {
  try {
    requireAdmin(request);

    const openEntries = await prisma.timeEntry.findMany({
      where: { endAt: null },
      orderBy: { startAt: "desc" },
      take: 500,
      select: {
        id: true,
        userId: true,
        startAt: true,
        endAt: true,
        createdAt: true,
        updatedAt: true,
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

    return NextResponse.json(
      { ok: true, totalOpen: openEntries.length, openEntries },
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