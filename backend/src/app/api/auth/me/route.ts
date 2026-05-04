export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/auth";
import { userPublicSelect } from "@/lib/selects/user.select";

export async function GET(request: Request) {
  try {
    const { userId } = requireAuth(request);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: userPublicSelect,
    });

    if (!user) {
      return NextResponse.json({ message: "Usuario no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, user }, { status: 200 });
  } catch (err: any) {
    const status = err?.status || 500;
    return NextResponse.json(
      { message: status === 500 ? "Error interno del servidor" : err.message },
      { status }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const { userId } = requireAuth(request);

    const body = await request.json();
    const { name, email } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { message: "El nombre es obligatorio" },
        { status: 400 }
      );
    }

    if (!email || typeof email !== "string" || !email.trim()) {
      return NextResponse.json(
        { message: "El email es obligatorio" },
        { status: 400 }
      );
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(cleanEmail)) {
      return NextResponse.json(
        { message: "El formato del email no es válido" },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        email: cleanEmail,
        NOT: {
          id: userId,
        },
      },
      select: {
        id: true,
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { message: "Ese email ya está en uso" },
        { status: 409 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name: cleanName,
        email: cleanEmail,
      },
      select: userPublicSelect,
    });

    return NextResponse.json(
      {
        ok: true,
        message: "Perfil actualizado correctamente",
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