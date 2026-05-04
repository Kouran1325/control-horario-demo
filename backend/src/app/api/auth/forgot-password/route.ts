import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  generatePasswordResetToken,
  getPasswordResetExpirationDate,
  hashPasswordResetToken
} from "@/lib/mail/password-reset";
import { sendEmail } from "@/lib/mail/mail";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = body?.email?.trim()?.toLowerCase();

    if (!email) {
      return NextResponse.json(
        {
          ok: false,
          message: "El email es obligatorio"
        },
        { status: 400 }
      );
    }

    const genericResponse = {
      ok: true,
      message: "Si el correo existe, recibirás un enlace para restablecer tu contraseña"
    };

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        enabled: true
      }
    });

    if (!user) {
      return NextResponse.json(genericResponse, { status: 200 });
    }

    const token = generatePasswordResetToken();
    const tokenHash = hashPasswordResetToken(token);
    const expiresAt = getPasswordResetExpirationDate();
    const now = new Date();

    await prisma.$transaction([
      prisma.passwordResetToken.updateMany({
        where: {
          userId: user.id,
          usedAt: null,
          expiresAt: { gt: now }
        },
        data: {
          usedAt: now
        }
      }),
      prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt
        }
      })
    ]);

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:4200";
    const resetUrl = `${frontendUrl}/reset-password?token=${encodeURIComponent(token)}`;

    try {
      await sendEmail({
        to: user.email,
        subject: "Recuperación de contraseña",
        text: `Usa este enlace para restablecer tu contraseña: ${resetUrl}`,
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.5;">
            <h2>Recuperación de contraseña</h2>
            <p>Has solicitado restablecer tu contraseña.</p>
            <p>
              <a href="${resetUrl}" style="display:inline-block;padding:10px 16px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:8px;">
                Restablecer contraseña
              </a>
            </p>
            <p>Este enlace caduca en 1 hora.</p>
            <p>Si no has solicitado este cambio, puedes ignorar este correo.</p>
          </div>
        `
      });
    } catch (mailError) {
      console.error(
        "Error enviando email de recuperación:",
        mailError instanceof Error ? mailError.message : mailError
      );
    }

    return NextResponse.json(genericResponse, { status: 200 });

  } catch (error) {
    console.error(
      "Error in forgot-password:",
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