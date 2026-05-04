export const runtime = "nodejs";

import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import { userPublicSelect } from "@/lib/selects/user.select";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function validatePassword(pw: string) {
  const minLen = pw.length >= 8;
  const hasLower = /[a-z]/.test(pw);
  const hasUpper = /[A-Z]/.test(pw);
  const hasNumber = /\d/.test(pw);
  // Si quieres símbolo, descomenta:
  // const hasSymbol = /[^A-Za-z0-9]/.test(pw);

  if (!minLen) return "La contraseña debe tener al menos 8 caracteres.";
  if (!hasLower) return "La contraseña debe incluir al menos una minúscula.";
  if (!hasUpper) return "La contraseña debe incluir al menos una mayúscula.";
  if (!hasNumber) return "La contraseña debe incluir al menos un número.";
  // if (!hasSymbol) return "La contraseña debe incluir al menos un símbolo.";
  return null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);

    const emailRaw = body?.email;
    const password = body?.password;
    const name = body?.name ?? null;

    if (typeof emailRaw !== "string" || typeof password !== "string") {
      return NextResponse.json(
        { message: "email y password son obligatorios" },
        { status: 400 }
      );
    }

    const email = normalizeEmail(emailRaw);

    const pwError = validatePassword(password);
    if (pwError) {
      return NextResponse.json({ message: pwError }, { status: 400 });
    }

    // ¿ya existe?
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
        role: "USER",
        enabled: false, // pendiente
      },
      select: userPublicSelect,
    });

    return NextResponse.json(
      {
        ok: true,
        message: "Registro creado. Pendiente de habilitación por un administrador.",
        user: created,
      },
      { status: 201 }
    );
  } catch (err: any) {
    // Si tienes unique constraint en email, Prisma puede lanzar error aquí también
    console.error("Error interno:", err);

    return NextResponse.json(
      { message: "Error interno del servidor" },
      { status: 500 }
    );
  }
}