export const runtime = "nodejs";

import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { userAdminSelect } from "@/lib/selects/user.select";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/auth";
import { createAdminAuditLog } from "@/lib/logging/audit";

function getClientIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    null
  );
}

function getUserAgent(request: Request) {
  return request.headers.get("user-agent") || null;
}

export async function GET(request: Request) {
  try {
    requireAdmin(request);

    const url = new URL(request.url);

    const enabledParam = url.searchParams.get("enabled");
    const roleParam = url.searchParams.get("role");
    const searchParam = url.searchParams.get("search");

    const where: any = {};

    if (searchParam) {
      where.OR = [
        {
          email: {
            contains: searchParam,
            mode: "insensitive",
          },
        },
        {
          name: {
            contains: searchParam,
            mode: "insensitive",
          },
        },
      ];
    }

    if (enabledParam !== null) {
      if (enabledParam !== "true" && enabledParam !== "false") {
        return NextResponse.json(
          { message: 'enabled debe ser "true" o "false"' },
          { status: 400 }
        );
      }

      where.enabled = enabledParam === "true";
    }

    if (roleParam !== null) {
      if (roleParam !== "ADMIN" && roleParam !== "USER") {
        return NextResponse.json(
          { message: 'role debe ser "ADMIN" o "USER"' },
          { status: 400 }
        );
      }

      where.role = roleParam;
    }

    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: userAdminSelect,
      take: 200,
    });

    return NextResponse.json({ ok: true, users }, { status: 200 });
  } catch (err: any) {
    const status = err?.status || 500;

    return NextResponse.json(
      { message: status === 500 ? "Error interno del servidor" : err.message },
      { status }
    );
  }
}

export async function POST(request: Request) {
  try {
    const admin = requireAdmin(request);

    const body = await request.json().catch(() => null);

    const email = body?.email?.trim()?.toLowerCase();
    const password = body?.password;
    const name = body?.name ?? null;
    const role = body?.role ?? "USER";
    const enabled = body?.enabled ?? true;

    if (!email || !password) {
      return NextResponse.json(
        { message: "email y password son obligatorios" },
        { status: 400 }
      );
    }

    if (role !== "ADMIN" && role !== "USER") {
      return NextResponse.json(
        { message: 'role debe ser "ADMIN" o "USER"' },
        { status: 400 }
      );
    }

    const exists = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (exists) {
      return NextResponse.json(
        { message: "Ya existe un usuario con ese email" },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const created = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        role,
        enabled,
      },
      select: userAdminSelect,
    });

    await createAdminAuditLog({
      adminUserId: admin.userId,
      action: "ADMIN_CREATE_USER",
      targetType: "USER",
      targetId: created.id,
      metadata: {
        email: created.email,
        name: created.name,
        role: created.role,
        enabled: created.enabled,
      },
      ip: getClientIp(request),
      userAgent: getUserAgent(request),
    });

    return NextResponse.json({ ok: true, user: created }, { status: 201 });
  } catch (err: any) {
    const status = err?.status || 500;

    return NextResponse.json(
      { message: status === 500 ? "Error interno del servidor" : err.message },
      { status }
    );
  }
}