import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import { requireAuth, HttpError } from "@/lib/auth/auth";
import { isValidPassword, getPasswordValidationMessage } from "@/lib/security/password";

export async function PATCH(req: NextRequest) {
  try {
    const payload = requireAuth(req);

    const body = await req.json();
    const currentPassword = body?.currentPassword?.trim();
    const newPassword = body?.newPassword?.trim();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        {
          ok: false,
          message: "La contraseña actual y la nueva contraseña son obligatorias",
        },
        { status: 400 }
      );
    }

    if (!isValidPassword(newPassword)) {
      return NextResponse.json(
        {
          ok: false,
          message: getPasswordValidationMessage(),
        },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        passwordHash: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { ok: false, message: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    const isCurrentPasswordCorrect = await bcrypt.compare(
      currentPassword,
      user.passwordHash
    );

    if (!isCurrentPasswordCorrect) {
      return NextResponse.json(
        { ok: false, message: "La contraseña actual es incorrecta" },
        { status: 401 }
      );
    }

    const isSamePassword = await bcrypt.compare(newPassword, user.passwordHash);

    if (isSamePassword) {
      return NextResponse.json(
        {
          ok: false,
          message: "La nueva contraseña no puede ser igual a la actual",
        },
        { status: 409 }
      );
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newPasswordHash,
      },
    });

    return NextResponse.json(
      {
        ok: true,
        message: "Contraseña actualizada correctamente",
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json(
        { ok: false, message: error.message },
        { status: error.status }
      );
    }

    console.error(
      "Error changing password:",
      error instanceof Error ? error.message : error
    );

    return NextResponse.json(
      { ok: false, message: "Error interno del servidor" },
      { status: 500 }
    );
  }
}