export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/auth";

export async function GET(request: Request) {
  try {
    const { userId } = requireAuth(request);

    const openEntry = await prisma.timeEntry.findFirst({
      where: {
        userId,
        endAt: null,
        voidedByAdmin: false,
      },
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

    return NextResponse.json(
      { status: openEntry ? "IN" : "OUT", openEntry: openEntry ?? null },
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