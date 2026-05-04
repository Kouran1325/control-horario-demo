import { prisma } from "@/lib/prisma";

type AuditAction =
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILED"
  | "LOGIN_DISABLED_USER"
  | "ADMIN_CREATE_USER"
  | "ADMIN_UPDATE_USER"
  | "ADMIN_RESET_PASSWORD"
  | "ADMIN_EDIT_TIME_ENTRY"
  | "ADMIN_VOID_TIME_ENTRY"
  | "ADMIN_FORCE_STOP_ENTRY"
  | "ADMIN_FORCE_STOP_OPEN"
  | "TIME_ENTRY_TAMPERED_DETECTED"
  | "PRIVACY_INFO_ACKNOWLEDGED";

type AuditTargetType =
  | "USER"
  | "TIME_ENTRY"
  | "AUTH"
  | "PRIVACY";

type CreateAdminAuditLogParams = {
  adminUserId: string;
  action: AuditAction | string;
  targetType: AuditTargetType | string;
  targetId: string;
  metadata?: unknown;
  ip?: string | null;
  userAgent?: string | null;
};

export async function createAdminAuditLog({
  adminUserId,
  action,
  targetType,
  targetId,
  metadata,
  ip,
  userAgent,
}: CreateAdminAuditLogParams) {
  return prisma.adminAuditLog.create({
    data: {
      adminUserId,
      action,
      targetType,
      targetId,
      metadata: metadata ?? undefined,
      ip: ip ?? null,
      userAgent: userAgent ?? null,
    },
  });
}