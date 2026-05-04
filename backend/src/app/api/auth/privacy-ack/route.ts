export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { userPublicSelect } from "@/lib/selects/user.select";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/auth";
import { createAdminAuditLog } from "@/lib/logging/audit";

const CURRENT_PRIVACY_VERSION = "v1";

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

export async function PATCH(request: Request) {
  try {
    const { userId } = requireAuth(request);

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        privacyInfoAcceptedAt: new Date(),
        privacyInfoVersion: CURRENT_PRIVACY_VERSION,
      },
      select: userPublicSelect,
    });

    await createAdminAuditLog({
      adminUserId: userId,
      action: "PRIVACY_INFO_ACKNOWLEDGED",
      targetType: "USER",
      targetId: updatedUser.id,
      metadata: {
        privacyInfoVersion: updatedUser.privacyInfoVersion,
        privacyInfoAcceptedAt: updatedUser.privacyInfoAcceptedAt,
      },
      ip: getClientIp(request),
      userAgent: getUserAgent(request),
    });

    return NextResponse.json(
      {
        ok: true,
        message: "Información de privacidad confirmada correctamente",
        user: updatedUser,
      },
      { status: 200 }
    );
  } catch (err: any) {
    const status = err?.status || 500;

    return NextResponse.json(
      { message: status === 500 ? "Error interno del servidor" : err.message },
      { status }
    );
  }
}