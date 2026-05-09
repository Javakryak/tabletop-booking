import { Injectable } from "@nestjs/common";

import { databaseClient } from "../database.js";

export type PendingDeletionRequestRecord = {
  displayName: string;
  reason: string | null;
  requestedAt: Date;
  telegramUsername: string | null;
  userId: string;
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
      .filter((user): user is typeof user & { deletionRequestedAt: Date; profile: { displayName: string } } => {
        return Boolean(user.deletionRequestedAt && user.profile);
      })
      .map((user: { deletionRequestReason: string | null; deletionRequestedAt: Date; id: string; profile: { displayName: string }; telegramUsername: string | null }) => ({
        displayName: user.profile.displayName,
        reason: user.deletionRequestReason,
        requestedAt: user.deletionRequestedAt,
        telegramUsername: user.telegramUsername,
        userId: user.id
      }));
  }
}
