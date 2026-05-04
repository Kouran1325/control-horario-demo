export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/auth";
import { generateTimeEntryHash } from "@/lib/security/time-entry-integrity";

export async function POST(request: Request) {
  try {
    const { userId } = requireAuth(request);

    const body = await request.json().catch(() => null);

    const lat = body?.lat;
    const lng = body?.lng;
    const accuracy = body?.accuracy;

    if (lat !== undefined && typeof lat !== "number") {
      return NextResponse.json({ message: "lat debe ser number" }, { status: 400 });
    }

    if (lng !== undefined && typeof lng !== "number") {
      return NextResponse.json({ message: "lng debe ser number" }, { status: 400 });
    }

    if (accuracy !== undefined && typeof accuracy !== "number") {
      return NextResponse.json({ message: "accuracy debe ser number" }, { status: 400 });
    }

    const openEntry = await prisma.timeEntry.findFirst({
      where: {
        userId,
        endAt: null,
        voidedByAdmin: false
      },
      orderBy: { startAt: "desc" },
      select: { id: true, startAt: true },
    });

    if (!openEntry) {
      return NextResponse.json({ message: "No tienes ningún fichaje abierto" }, { status: 409 });
    }

    const closed = await prisma.timeEntry.update({
      where: { id: openEntry.id },
      data: {
        endAt: new Date(),
        latEnd: typeof lat === "number" ? lat : null,
        lonEnd: typeof lng === "number" ? lng : null,
        accuracyEnd: typeof accuracy === "number" ? accuracy : null,
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
        voidedByAdmin: true,
        closedByAdmin: true,

        entryMethod: true,
      },
    });

    const hash = generateTimeEntryHash({
      id: closed.id,
      userId: closed.userId,
      startAt: closed.startAt,
      endAt: closed.endAt,
      latStart: closed.latStart,
      lonStart: closed.lonStart,
      accuracyStart: closed.accuracyStart,
      latEnd: closed.latEnd,
      lonEnd: closed.lonEnd,
      accuracyEnd: closed.accuracyEnd,
      createdAt: closed.createdAt,
      createdByAdmin: closed.createdByAdmin,
      editedByAdmin: closed.editedByAdmin,
      voidedByAdmin: closed.voidedByAdmin,
      closedByAdmin: closed.closedByAdmin,
      entryMethod: closed.entryMethod,
    });

    await prisma.timeEntry.update({
      where: { id: closed.id },
      data: { hash },
    });

    return NextResponse.json({ ok: true, timeEntry: closed }, { status: 200 });
  } catch (err: any) {
    const status = err?.status || 500;
    return NextResponse.json(
      { message: status === 500 ? "Internal Server Error" : err.message },
      { status }
    );
  }
}