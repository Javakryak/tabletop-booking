-- Add deferred account deletion request fields to users.
ALTER TABLE "users"
  ADD COLUMN "deletion_requested_at" TIMESTAMP(3),
  ADD COLUMN "deletion_request_reason" TEXT;

CREATE INDEX "users_deletion_requested_at_idx" ON "users"("deletion_requested_at");
