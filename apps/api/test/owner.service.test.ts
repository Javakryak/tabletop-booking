import assert from "node:assert/strict";
import { test } from "node:test";

import { OwnerService } from "../src/owner/owner.service.js";

test("getPendingDeletionRequests returns pending requests for owner/admin visibility", async () => {
  const repository = {
    async listPendingDeletionRequests() {
      return [
        {
          displayName: "Demo User",
          reason: "Please remove my account",
          requestedAt: new Date("2026-05-09T10:00:00.000Z"),
          telegramUsername: "demo-user",
          userId: "user-1"
        }
      ];
    }
  };
  const service = new OwnerService(repository as never);

  const result = await service.getPendingDeletionRequests();

  assert.equal(result.data.length, 1);
  assert.equal(result.data[0]?.userId, "user-1");
  assert.equal(result.data[0]?.displayName, "Demo User");
  assert.equal(result.data[0]?.requestedAt, "2026-05-09T10:00:00.000Z");
});
