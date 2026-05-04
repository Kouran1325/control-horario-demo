import "dotenv/config";
import bcrypt from "bcrypt";
import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("Iniciando seed demo...");

  const adminPasswordHash = await bcrypt.hash("Admin12345", 10);
  const userPasswordHash = await bcrypt.hash("Usuario12345", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@demo.com" },
    update: {},
    create: {
      email: "admin@demo.com",
      passwordHash: adminPasswordHash,
      name: "Administrador Demo",
      role: "ADMIN",
      enabled: true,
      privacyInfoAcceptedAt: new Date(),
      privacyInfoVersion: "1.0",
    },
  });

  const user = await prisma.user.upsert({
    where: { email: "usuario@demo.com" },
    update: {},
    create: {
      email: "usuario@demo.com",
      passwordHash: userPasswordHash,
      name: "Usuario Demo",
      role: "USER",
      enabled: true,
      privacyInfoAcceptedAt: new Date(),
      privacyInfoVersion: "1.0",
    },
  });

  await prisma.user.upsert({
    where: { email: "bloqueado@demo.com" },
    update: {},
    create: {
      email: "bloqueado@demo.com",
      passwordHash: userPasswordHash,
      name: "Usuario Bloqueado",
      role: "USER",
      enabled: false,
    },
  });

  const existingEntries = await prisma.timeEntry.count({
    where: { userId: user.id },
  });

  if (existingEntries === 0) {
    const now = new Date();
    const oneDay = 1000 * 60 * 60 * 24;

    await prisma.timeEntry.createMany({
      data: [
        {
          userId: user.id,
          startAt: new Date(now.getTime() - oneDay * 5),
          endAt: new Date(now.getTime() - oneDay * 5 + 8 * 60 * 60 * 1000),
          entryMethod: "USER",
          latStart: 28.1235,
          lonStart: -15.4363,
          latEnd: 28.124,
          lonEnd: -15.437,
          accuracyStart: 25,
          accuracyEnd: 30,
        },
        {
          userId: user.id,
          startAt: new Date(now.getTime() - oneDay * 4),
          endAt: new Date(now.getTime() - oneDay * 4 + 7 * 60 * 60 * 1000),
          entryMethod: "USER",
        },
        {
          userId: user.id,
          startAt: new Date(now.getTime() - oneDay * 3),
          endAt: new Date(now.getTime() - oneDay * 3 + 6 * 60 * 60 * 1000),
          createdByAdmin: true,
          createdByAdminId: admin.id,
          createReason: "Registro creado manualmente para demo",
          entryMethod: "ADMIN",
        },
        {
          userId: user.id,
          startAt: new Date(now.getTime() - oneDay * 2),
          endAt: new Date(now.getTime() - oneDay * 2 + 5 * 60 * 60 * 1000),
          editedByAdmin: true,
          editedByAdminId: admin.id,
          editReason: "Corrección de horario para demo",
          editedAt: new Date(),
          entryMethod: "USER",
        },
        {
          userId: user.id,
          startAt: new Date(now.getTime() - oneDay),
          endAt: new Date(now.getTime() - oneDay + 4 * 60 * 60 * 1000),
          voidedByAdmin: true,
          voidedByAdminId: admin.id,
          voidReason: "Registro anulado para demo",
          voidedAt: new Date(),
          entryMethod: "USER",
        },
        {
          userId: user.id,
          startAt: new Date(),
          entryMethod: "USER",
        },
      ],
    });

    console.log("Fichajes demo creados.");
  } else {
    console.log("El usuario demo ya tiene fichajes. No se crean nuevos.");
  }

  console.log("Seed demo completado.");
}

main()
  .catch((e) => {
    console.error("Error ejecutando seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });