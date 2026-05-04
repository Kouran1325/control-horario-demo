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

    if (openEntry) {
      return NextResponse.json(
        { message: "Ya tienes un fichaje abierto", openEntry },
        { status: 409 }
      );
    }

    const created = await prisma.timeEntry.create({
      data: {
        userId,
        startAt: new Date(),
        endAt: null,
        latStart: typeof lat === "number" ? lat : null,
        lonStart: typeof lng === "number" ? lng : null,
        accuracyStart: typeof accuracy === "number" ? accuracy : null,
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

    return NextResponse.json({ ok: true, timeEntry: created }, { status: 201 });
  } catch (err: any) {
    const status = err?.status || 500;
    return NextResponse.json(
      { message: status === 500 ? "Internal Server Error" : err.message },
      { status }
    );
  }
}