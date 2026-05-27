import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException
} from "@nestjs/common";

import { OwnerRepository, type AuditLogListFilters } from "./owner.repository.js";

type PendingDeletionRequestsResponse = {
  data: Array<{
    displayName: string;
    reason: string | null;
    requestedAt: string;
    telegramUsername: string | null;
    userId: string;
  }>;
};

type AuditLogQueryInput = {
  action?: string;
  actorUserId?: string;
  entityId?: string;
  entityType?: string;
  from?: string;
  to?: string;
};

type AuditLogsResponse = {
  data: Array<{
    action: string;
    actorDisplayName: string | null;
    actorUserId: string | null;
    createdAt: string;
    entityId: string | null;
    entityType: string;
    id: string;
    metadata: unknown;
  }>;
};

type AdminUsersResponse = {
  data: Array<{
    blockedReason: string | null;
    displayName: string;
    id: string;
    status: string;
    telegramUsername: string | null;
  }>;
};

type UserModerationInput = {
  actorUserId: string;
  reason?: string;
  targetUserId: string;
};

type UserModerationResponse = {
  data: {
    auditLogId: string;
    blockedReason: string | null;
    displayName: string;
    id: string;
    status: string;
    telegramUsername: string | null;
    updatedAt: string;
  };
};

type RevealEmergencyContactInput = {
  actorUserId: string;
  reason: string;
  relatedBookingId?: string;
  targetUserId: string;
};

type EmergencyContactAccessResponse = {
  data: {
    auditLogId: string;
    displayName: string;
    phone: string;
    revealedAt: string;
    telegramUsername: string | null;
    userId: string;
  };
};

@Injectable()
export class OwnerService {
  constructor(private readonly ownerRepository: OwnerRepository) {}

  async listAdminUsers(): Promise<AdminUsersResponse> {
    const users = await this.ownerRepository.listAdminUsers();

    return {
      data: users.map((user) => ({
        blockedReason: user.blockedReason,
        displayName: user.displayName,
        id: user.userId,
        status: user.status,
        telegramUsername: user.telegramUsername
      }))
    };
  }

  async getPendingDeletionRequests(): Promise<PendingDeletionRequestsResponse> {
    const requests = await this.ownerRepository.listPendingDeletionRequests();

    return {
      data: requests.map((request) => ({
        displayName: request.displayName,
        reason: request.reason,
        requestedAt: request.requestedAt.toISOString(),
        telegramUsername: request.telegramUsername,
        userId: request.userId
      }))
    };
  }

  async getAuditLogs(query: AuditLogQueryInput): Promise<AuditLogsResponse> {
    const logs = await this.ownerRepository.listAuditLogs(parseAuditLogFilters(query));

    return {
      data: logs.map((log) => ({
        action: log.action,
        actorDisplayName: log.actorDisplayName,
        actorUserId: log.actorUserId,
        createdAt: log.createdAt.toISOString(),
        entityId: log.entityId,
        entityType: log.entityType,
        id: log.id,
        metadata: redactSensitiveMetadata(log.metadata)
      }))
    };
  }

  async revealEmergencyContact(
    input: RevealEmergencyContactInput
  ): Promise<EmergencyContactAccessResponse> {
    const reason = input.reason.trim();
    if (reason.length < 5) {
      throw new BadRequestException("A break-glass reason is required");
    }

    const user = await this.ownerRepository.findEmergencyContactUser(input.targetUserId);
    if (!user) {
      throw new NotFoundException("User was not found");
    }

    if (!user.phone) {
      throw new ConflictException("Emergency contact phone is not available");
    }

    const auditInput: {
      actorUserId: string;
      reason: string;
      relatedBookingId?: string;
      targetUserId: string;
    } = {
      actorUserId: input.actorUserId,
      reason,
      targetUserId: input.targetUserId
    };
    if (input.relatedBookingId) {
      auditInput.relatedBookingId = input.relatedBookingId;
    }

    const auditLog = await this.ownerRepository.writeEmergencyPhoneRevealAudit(auditInput);

    return {
      data: {
        auditLogId: auditLog.id,
        displayName: user.displayName,
        phone: user.phone,
        revealedAt: auditLog.createdAt.toISOString(),
        telegramUsername: user.telegramUsername,
        userId: user.userId
      }
    };
  }

  async blockUser(input: UserModerationInput): Promise<UserModerationResponse> {
    const reason = input.reason?.trim() ?? "";
    if (reason.length < 3) {
      throw new BadRequestException("A block reason is required");
    }

    const user = await this.ownerRepository.blockUser({
      reason,
      targetUserId: input.targetUserId
    });
    if (!user) {
      throw new NotFoundException("User was not found");
    }

    const auditLog = await this.ownerRepository.writeUserModerationAudit({
      action: "user.block",
      actorUserId: input.actorUserId,
      metadata: {
        reason,
        targetUserId: input.targetUserId
      },
      targetUserId: input.targetUserId
    });

    return formatUserModerationResponse(user, auditLog.id, auditLog.createdAt);
  }

  async unblockUser(input: UserModerationInput): Promise<UserModerationResponse> {
    const user = await this.ownerRepository.unblockUser({
      targetUserId: input.targetUserId
    });
    if (!user) {
      throw new NotFoundException("User was not found");
    }

    const auditLog = await this.ownerRepository.writeUserModerationAudit({
      action: "user.unblock",
      actorUserId: input.actorUserId,
      metadata: {
        targetUserId: input.targetUserId
      },
      targetUserId: input.targetUserId
    });

    return formatUserModerationResponse(user, auditLog.id, auditLog.createdAt);
  }
}

function formatUserModerationResponse(
  user: {
    blockedReason: string | null;
    displayName: string;
    status: string;
    telegramUsername: string | null;
    userId: string;
  },
  auditLogId: string,
  updatedAt: Date
): UserModerationResponse {
  return {
    data: {
      auditLogId,
      blockedReason: user.blockedReason,
      displayName: user.displayName,
      id: user.userId,
      status: user.status,
      telegramUsername: user.telegramUsername,
      updatedAt: updatedAt.toISOString()
    }
  };
}

function parseAuditLogFilters(query: AuditLogQueryInput): AuditLogListFilters {
  const filters: AuditLogListFilters = {};

  if (query.action) {
    filters.action = query.action;
  }

  if (query.actorUserId) {
    filters.actorUserId = query.actorUserId;
  }

  if (query.entityId) {
    filters.entityId = query.entityId;
  }

  if (query.entityType) {
    filters.entityType = query.entityType;
  }

  if (query.from) {
    filters.from = parseDateTimeFilter(query.from, "from");
  }

  if (query.to) {
    filters.to = parseDateTimeFilter(query.to, "to");
  }

  if (filters.from && filters.to && filters.from > filters.to) {
    throw new BadRequestException("from must be before to");
  }

  return filters;
}

function parseDateTimeFilter(value: string, fieldName: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException(`${fieldName} must be a valid ISO date-time`);
  }

  return date;
}

function redactSensitiveMetadata(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redactSensitiveMetadata(item));
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => [
      key,
      isSensitiveMetadataKey(key) ? "[REDACTED]" : redactSensitiveMetadata(nestedValue)
    ])
  );
}

function isSensitiveMetadataKey(key: string): boolean {
  const normalized = key.toLowerCase();
  return [
    "authorization",
    "cookie",
    "email",
    "initdata",
    "password",
    "phone",
    "secret",
    "telegramauthdata",
    "token"
  ].some((sensitiveKey) => normalized.includes(sensitiveKey));
}
