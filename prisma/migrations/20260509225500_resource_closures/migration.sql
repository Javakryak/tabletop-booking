-- CreateTable
CREATE TABLE "room_closures" (
    "id" UUID NOT NULL,
    "room_id" UUID NOT NULL,
    "start_at" TIMESTAMP(3) NOT NULL,
    "end_at" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "created_by_user_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "room_closures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "table_closures" (
    "id" UUID NOT NULL,
    "table_id" UUID NOT NULL,
    "start_at" TIMESTAMP(3) NOT NULL,
    "end_at" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "created_by_user_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "table_closures_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "room_closures_room_id_idx" ON "room_closures"("room_id");

-- CreateIndex
CREATE INDEX "room_closures_start_at_idx" ON "room_closures"("start_at");

-- CreateIndex
CREATE INDEX "room_closures_end_at_idx" ON "room_closures"("end_at");

-- CreateIndex
CREATE INDEX "table_closures_table_id_idx" ON "table_closures"("table_id");

-- CreateIndex
CREATE INDEX "table_closures_start_at_idx" ON "table_closures"("start_at");

-- CreateIndex
CREATE INDEX "table_closures_end_at_idx" ON "table_closures"("end_at");

-- AddForeignKey
ALTER TABLE "room_closures" ADD CONSTRAINT "room_closures_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_closures" ADD CONSTRAINT "room_closures_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "table_closures" ADD CONSTRAINT "table_closures_table_id_fkey" FOREIGN KEY ("table_id") REFERENCES "tables"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "table_closures" ADD CONSTRAINT "table_closures_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
