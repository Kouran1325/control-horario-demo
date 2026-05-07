export const runtime = "nodejs";

import { NextResponse } from "next/server";
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
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { message: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    /*
      DEMO:
      Guardamos el avatar como data URL en base de datos para evitar depender
      del sistema de archivos de Vercel, que no es persistente.

      PRODUCCIÓN:
      Sustituir por almacenamiento externo: Cloudinary, Supabase Storage,
      S3/R2, UploadThing, etc. En ese caso avatarUrl debería guardar
      la URL pública del archivo.
    */
    const processedBuffer = await sharp(buffer)
      .resize(400, 400, {
        fit: "cover",
        position: "centre",
      })
      .webp({ quality: 82 })
      .toBuffer();

    const avatarDataUrl = `data:image/webp;base64,${processedBuffer.toString(
      "base64"
    )}`;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        avatarUrl: avatarDataUrl,
      },
      select: userPublicSelect,
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