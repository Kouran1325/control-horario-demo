export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/auth";

export async function GET(request: Request) {
  try {
    requireAdmin(request);

    const url = new URL(request.url);

    const action = url.searchParams.get("action");
    const adminUserId = url.searchParams.get("adminUserId");
    const targetId = url.searchParams.get("targetId");
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");

    const where: any = {};

    if (action) {
      where.action = action;
    }

    if (adminUserId) {
      where.adminUserId = adminUserId;
    }

    if (targetId) {
      where.targetId = targetId;
    }

    if (from || to) {
      where.createdAt = {};

      if (from) {
        const fromDate = new Date(from);
        fromDate.setHours(0, 0, 0, 0);
        where.createdAt.gte = fromDate;
      }

      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = toDate;
      }
    }

    const logs = await prisma.adminAuditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        admin: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({ ok: true, logs }, { status: 200 });

  } catch (err: any) {
    const status = err?.status || 500;

    return NextResponse.json(
      { message: status === 500 ? "Error interno del servidor" : err.message },
      { status }
    );
  }
}