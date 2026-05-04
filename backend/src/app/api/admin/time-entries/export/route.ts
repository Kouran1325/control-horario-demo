export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/auth";

export async function GET(request: Request) {
    try {
        requireAdmin(request);

        const url = new URL(request.url);
        const userId = url.searchParams.get("userId");
        const from = url.searchParams.get("from");
        const to = url.searchParams.get("to");

        if (!userId) {
            return NextResponse.json(
                { message: "userId es obligatorio" },
                { status: 400 }
            );
        }

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
                createdByAdmin: true,
                editedByAdmin: true,
                voidedByAdmin: true,
                closedByAdmin: true,
            },
        });

        const headers = [
            "Fecha inicio",
            "Fecha fin",
            "Minutos",
            "Lat inicio",
            "Lon inicio",
            "Lat fin",
            "Lon fin",
            "Manual",
            "Editado",
            "Anulado",
            "Cierre admin"
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
            e.lonEnd ?? "",
            e.createdByAdmin ? "Sí" : "No",
            e.editedByAdmin ? "Sí" : "No",
            e.voidedByAdmin ? "Sí" : "No",
            e.closedByAdmin ? "Sí" : "No"
        ]);

        const csv = [
            headers.join(","),
            ...rows.map((r) => r.join(","))
        ].join("\n");

        return new NextResponse(csv, {
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition": `attachment; filename="fichajes_${userId}.csv"`,
            },
        });
    } catch (err: any) {
        const status = err?.status || 500;

        return NextResponse.json(
            { message: status === 500 ? "Error generando CSV" : err.message },
            { status }
        );
    }
}