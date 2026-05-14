import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";

import { databaseClient } from "../database.js";

export type PendingDeletionRequestRecord = {
  displayName: string;
  reason: string | null;
  requestedAt: Date;
  telegramUsername: string | null;
  userId: string;
};

export type AuditLogListFilters = {
  action?: string;
  actorUserId?: string;
  entityId?: string;
  entityType?: string;
  from?: Date;
  to?: Date;
};

export type AuditLogRecord = {
  action: string;
  actorDisplayName: string | null;
  actorUserId: string | null;
  createdAt: Date;
  entityId: string | null;
  entityType: string;
  id: string;
  metadata: Prisma.JsonValue | null;
};

export type EmergencyContactUserRecord = {
  displayName: string;
  phone: string | null;
  telegramUsername: string | null;
  userId: string;
};

export type EmergencyPhoneRevealAuditInput = {
  actorUserId: string;
  reason: string;
  relatedBookingId?: string;
  targetUserId: string;
};

export type EmergencyPhoneRevealAuditRecord = {
  createdAt: Date;
  id: string;
};

@Injectable()
export class OwnerRepository {
  async listPendingDeletionRequests(): Promise<PendingDeletionRequestRecord[]> {
    const users: Array<{
      deletionRequestReason: string | null;
      deletionRequestedAt: Date | null;
      id: string;
      profile: { displayName: string } | null;
      telegramUsername: string | null;
    }> = await databaseClient.user.findMany({
      where: {
        deletionRequestedAt: {
          not: null
        },
        status: {
          not: "deleted"
        }
      },
      select: {
        deletionRequestReason: true,
        deletionRequestedAt: true,
        id: true,
        profile: {
          select: {
            displayName: true
          }
        },
        telegramUsername: true
      },
      orderBy: {
        deletionRequestedAt: "asc"
      }
    });

    return users
      .filter(
        (
          user
        ): user is typeof user & {
          deletionRequestedAt: Date;
          profile: { displayName: string };
        } => {
          return Boolean(user.deletionRequestedAt && user.profile);
        }
      )
      .map(
        (user: {
          deletionRequestReason: string | null;
          deletionRequestedAt: Date;
          id: string;
          profile: { displayName: string };
          telegramUsername: string | null;
        }) => ({
          displayName: user.profile.displayName,
          reason: user.deletionRequestReason,
          requestedAt: user.deletionRequestedAt,
          telegramUsername: user.telegramUsername,
          userId: user.id
        })
      );
  }

  async listAuditLogs(filters: AuditLogListFilters): Promise<AuditLogRecord[]> {
    const where: Prisma.AuditLogWhereInput = {};

    if (filters.actorUserId) {
      where.actorUserId = filters.actorUserId;
    }

    if (filters.action) {
      where.action = filters.action;
    }

    if (filters.entityType) {
      where.entityType = filters.entityType;
    }

    if (filters.entityId) {
      where.entityId = filters.entityId;
    }

    if (filters.from || filters.to) {
      where.createdAt = {};
      if (filters.from) {
        where.createdAt.gte = filters.from;
      }

      if (filters.to) {
        where.createdAt.lte = filters.to;
      }
    }

    const logs = await databaseClient.auditLog.findMany({
      where,
      select: {
        action: true,
        actorUser: {
          select: {
            profile: {
              select: {
                displayName: true
              }
            }
          }
        },
        actorUserId: true,
        createdAt: true,
        entityId: true,
        entityType: true,
        id: true,
        metadata: true
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 100
    });

    return logs.map((log) => ({
      action: log.action,
      actorDisplayName: log.actorUser?.profile?.displayName ?? null,
      actorUserId: log.actorUserId,
      createdAt: log.createdAt,
      entityId: log.entityId,
      entityType: log.entityType,
      id: log.id,
      metadata: log.metadata
    }));
  }

  async findEmergencyContactUser(userId: string): Promise<EmergencyContactUserRecord | null> {
    const user = await databaseClient.user.findUnique({
      where: {
        id: userId
      },
      select: {
        id: true,
        profile: {
          select: {
            displayName: true,
            phone: true
          }
        },
        telegramUsername: true
      }
    });

    if (!user || !user.profile) {
      return null;
    }

    return {
      displayName: user.profile.displayName,
      phone: user.profile.phone,
      telegramUsername: user.telegramUsername,
      userId: user.id
    };
  }

  async writeEmergencyPhoneRevealAudit(
    input: EmergencyPhoneRevealAuditInput
  ): Promise<EmergencyPhoneRevealAuditRecord> {
    const metadata: Prisma.JsonObject = {
      reason: input.reason,
      targetUserId: input.targetUserId
    };
    if (input.relatedBookingId) {
      metadata.relatedBookingId = input.relatedBookingId;
    }

    return await databaseClient.auditLog.create({
      data: {
        action: "user.emergency_phone_reveal",
        actorUserId: input.actorUserId,
        entityId: input.targetUserId,
        entityType: "user",
        metadata
      },
      select: {
        createdAt: true,
        id: true
      }
    });
  }
}
