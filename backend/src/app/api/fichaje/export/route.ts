export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/auth";

export async function GET(request: Request) {
    try {
        const { userId } = requireAuth(request);

        const url = new URL(request.url);
        const from = url.searchParams.get("from");
        const to = url.searchParams.get("to");

        const where: any = {
            userId,
        };

        if (from || to) {
            where.startAt = {};

            if (from) {
                const fromDate = new Date(from);
                fromDate.setHours(0, 0, 0, 0);
                where.startAt.gte = fromDate;
            }

            if (to) {
                const toDate = new Date(to);
                toDate.setHours(23, 59, 59, 999);
                where.startAt.lte = toDate;
            }
        }

        const entries = await prisma.timeEntry.findMany({
            where,
            orderBy: { startAt: "desc" },
            select: {
                startAt: true,
                endAt: true,
                latStart: true,
                lonStart: true,
                latEnd: true,
                lonEnd: true,
            },
        });

        const headers = [
            "Fecha inicio",
            "Fecha fin",
            "Minutos",
            "Lat inicio",
            "Lon inicio",
            "Lat fin",
            "Lon fin"
        ];

        const rows = entries.map((e) => [
            e.startAt?.toISOString() || "",
            e.endAt?.toISOString() || "",
            e.endAt
                ? Math.max(0, Math.floor((e.endAt.getTime() - e.startAt.getTime()) / 60000))
                : "",
            e.latStart ?? "",
            e.lonStart ?? "",
            e.latEnd ?? "",
            e.lonEnd ?? ""
        ]);

        const csv = [
            headers.join(","),
            ...rows.map((r) => r.join(","))
        ].join("\n");

        return new NextResponse(csv, {
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition": 'attachment; filename="fichajes.csv"',
            },
        });
    } catch {
        return NextResponse.json(
            { message: "Error generando CSV" },
            { status: 500 }
        );
    }
}