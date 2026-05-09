import { Injectable } from "@nestjs/common";

import { OwnerRepository } from "./owner.repository.js";

type PendingDeletionRequestsResponse = {
  data: Array<{
    displayName: string;
    reason: string | null;
    requestedAt: string;
    telegramUsername: string | null;
    userId: string;
  }>;
};

@Injectable()
export class OwnerService {
  constructor(private readonly ownerRepository: OwnerRepository) {}

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
}
