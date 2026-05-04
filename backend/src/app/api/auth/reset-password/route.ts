import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import { getPasswordValidationMessage, isValidPassword } from "@/lib/security/password";
import { hashPasswordResetToken } from "@/lib/mail/password-reset";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const token = body?.token?.trim();
    const newPassword = body?.newPassword?.trim();

    if (!token || !newPassword) {
      return NextResponse.json(
        {
          ok: false,
          message: "El token y la nueva contraseña son obligatorios"
        },
        { status: 400 }
      );
    }

    if (!isValidPassword(newPassword)) {
      return NextResponse.json(
        {
          ok: false,
          message: getPasswordValidationMessage()
        },
        { status: 400 }
      );
    }

    const tokenHash = hashPasswordResetToken(token);
    const now = new Date();

    const resetToken = await prisma.passwordResetToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: {
          gt: now
        }
      },
      include: {
        user: {
          select: {
            id: true,
            passwordHash: true
          }
        }
      }
    });

    if (!resetToken) {
      return NextResponse.json(
        {
          ok: false,
          message: "El enlace de recuperación no es válido o ha expirado"
        },
        { status: 400 }
      );
    }

    const isSamePassword = await bcrypt.compare(
      newPassword,
      resetToken.user.passwordHash
    );

    if (isSamePassword) {
      return NextResponse.json(
        {
          ok: false,
          message: "La nueva contraseña no puede ser igual a la actual"
        },
        { status: 409 }
      );
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.user.id },
        data: {
          passwordHash: newPasswordHash
        }
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: {
          usedAt: now
        }
      })
    ]);

    return NextResponse.json(
      {
        ok: true,
        message: "Contraseña restablecida correctamente"
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      "Error in reset-password:",
      error instanceof Error ? error.message : error
    );

    return NextResponse.json(
      {
        ok: false,
        message: "Error interno del servidor"
      },
      { status: 500 }
    );
  }
}