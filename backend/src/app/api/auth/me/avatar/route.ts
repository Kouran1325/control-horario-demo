export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import sharp from "sharp";
import { userPublicSelect } from "@/lib/selects/user.select";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/auth";

const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function POST(request: Request) {
  try {
    const { userId } = requireAuth(request);

    const formData = await request.formData();
    const file = formData.get("avatar");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { message: "Debes enviar un archivo en el campo 'avatar'" },
        { status: 400 }
      );
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { message: "Formato no permitido. Usa JPG, PNG o WEBP" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { message: "La imagen no puede superar 2 MB" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        avatarUrl: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { message: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const fileName = `${crypto.randomUUID()}.webp`;
    const relativeUrl = `/uploads/avatars/${fileName}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", "avatars");
    const outputPath = path.join(uploadDir, fileName);

    await fs.mkdir(uploadDir, { recursive: true });

    await sharp(buffer)
      .resize(400, 400, {
        fit: "cover",
        position: "centre",
      })
      .webp({ quality: 82 })
      .toFile(outputPath);

    if (user.avatarUrl) {
      const oldPath = path.join(process.cwd(), "public", user.avatarUrl.replace(/^\//, ""));
      try {
        await fs.unlink(oldPath);
      } catch {
        // Si no existe o falla el borrado, no bloqueamos la subida nueva
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        avatarUrl: relativeUrl,
      },
      select: userPublicSelect
    });

    return NextResponse.json(
      {
        ok: true,
        message: "Foto de perfil actualizada correctamente",
        user: updatedUser,
      },
      { status: 200 }
    );
  } catch (err: any) {
    const status = err?.status || 500;
    return NextResponse.json(
      { message: status === 500 ? "Internal Server Error" : err.message },
      { status }
    );
  }
}