globalThis.process.env.PRISMA_CLIENT_ENGINE_TYPE = "binary";

const { PrismaClient } = await import("@prisma/client");

const prisma = new PrismaClient();

const seedTimestamp = new Date("2026-01-01T10:00:00.000Z");

const ids = {
  users: {
    owner: "11111111-1111-4111-8111-111111111111",
    admin: "22222222-2222-4222-8222-222222222222",
    user: "33333333-3333-4333-8333-333333333333",
  },
  profiles: {
    owner: "44444444-4444-4444-8444-444444444444",
    admin: "55555555-5555-4555-8555-555555555555",
    user: "66666666-6666-4666-8666-666666666666",
  },
  roleAssignments: {
    owner: "77777777-7777-4777-8777-777777777777",
    admin: "88888888-8888-4888-8888-888888888888",
    user: "99999999-9999-4999-8999-999999999999",
  },
  rooms: {
    mainHall: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
    wargameRoom: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2",
    smallRoom: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3",
  },
  tables: {
    main1: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1",
    main2: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2",
    main3: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3",
    war1: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb4",
    war2: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb5",
    small1: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb6",
  },
  bookingRule: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  workingHours: {
    monday: "dddddddd-dddd-4ddd-8ddd-ddddddddddd1",
    tuesday: "dddddddd-dddd-4ddd-8ddd-ddddddddddd2",
    wednesday: "dddddddd-dddd-4ddd-8ddd-ddddddddddd3",
    thursday: "dddddddd-dddd-4ddd-8ddd-ddddddddddd4",
    friday: "dddddddd-dddd-4ddd-8ddd-ddddddddddd5",
    saturday: "dddddddd-dddd-4ddd-8ddd-ddddddddddd6",
    sunday: "dddddddd-dddd-4ddd-8ddd-ddddddddddd7",
  },
  bookings: {
    pending: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1",
    confirmed: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2",
    cancelled: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee3",
    completed: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee4",
  },
  bookingStatusHistory: {
    pendingCreated: "ffffffff-ffff-4fff-8fff-fffffffffff1",
    confirmedCreated: "ffffffff-ffff-4fff-8fff-fffffffffff2",
    confirmedApproved: "ffffffff-ffff-4fff-8fff-fffffffffff3",
    cancelledCreated: "ffffffff-ffff-4fff-8fff-fffffffffff4",
    cancelledByUser: "ffffffff-ffff-4fff-8fff-fffffffffff5",
    completedCreated: "ffffffff-ffff-4fff-8fff-fffffffffff6",
    completedApproved: "ffffffff-ffff-4fff-8fff-fffffffffff7",
    completedFinished: "ffffffff-ffff-4fff-8fff-fffffffffff8",
  },
};

const time = (value) => new Date(`1970-01-01T${value}:00.000Z`);

const bookingTimes = {
  pending: {
    startAt: new Date("2030-03-15T18:00:00.000Z"),
    endAt: new Date("2030-03-15T21:00:00.000Z"),
  },
  confirmed: {
    startAt: new Date("2030-03-16T12:00:00.000Z"),
    endAt: new Date("2030-03-16T16:00:00.000Z"),
  },
  cancelled: {
    startAt: new Date("2030-03-17T15:00:00.000Z"),
    endAt: new Date("2030-03-17T18:00:00.000Z"),
  },
  completed: {
    startAt: new Date("2025-11-10T10:00:00.000Z"),
    endAt: new Date("2025-11-10T13:00:00.000Z"),
  },
};

async function resetData() {
  await prisma.$transaction([
    prisma.bookingStatusHistory.deleteMany(),
    prisma.booking.deleteMany(),
    prisma.tableClosure.deleteMany(),
    prisma.roomClosure.deleteMany(),
    prisma.bookingRule.deleteMany(),
    prisma.scheduleException.deleteMany(),
    prisma.clubWorkingHour.deleteMany(),
    prisma.userRoleAssignment.deleteMany(),
    prisma.userProfile.deleteMany(),
    prisma.clubTable.deleteMany(),
    prisma.room.deleteMany(),
    prisma.consent.deleteMany(),
    prisma.legalDocument.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}

async function createUsers() {
  await prisma.user.createMany({
    data: [
      {
        id: ids.users.owner,
        telegramId: "900000000001",
        telegramUsername: "demo-owner",
        email: "demo-owner@example.com",
        status: "active",
        createdAt: seedTimestamp,
        updatedAt: seedTimestamp,
      },
      {
        id: ids.users.admin,
        telegramId: "900000000002",
        telegramUsername: "demo-admin",
        email: "demo-admin@example.com",
        status: "active",
        createdAt: seedTimestamp,
        updatedAt: seedTimestamp,
      },
      {
        id: ids.users.user,
        telegramId: "900000000003",
        telegramUsername: "demo-user",
        email: "demo-user@example.com",
        status: "active",
        createdAt: seedTimestamp,
        updatedAt: seedTimestamp,
      },
    ],
  });

  await prisma.userProfile.createMany({
    data: [
      {
        id: ids.profiles.owner,
        userId: ids.users.owner,
        displayName: "Demo Owner",
        phone: "+7 000 000 00 01",
        phoneVisibleToAdmin: true,
        showTelegramToMeetupParticipants: true,
        showPhoneToMeetupParticipants: false,
        bio: "Portfolio demo owner account.",
        createdAt: seedTimestamp,
        updatedAt: seedTimestamp,
      },
      {
        id: ids.profiles.admin,
        userId: ids.users.admin,
        displayName: "Demo Admin",
        phone: "+7 000 000 00 02",
        phoneVisibleToAdmin: true,
        showTelegramToMeetupParticipants: true,
        showPhoneToMeetupParticipants: false,
        bio: "Portfolio demo administrator account.",
        createdAt: seedTimestamp,
        updatedAt: seedTimestamp,
      },
      {
        id: ids.profiles.user,
        userId: ids.users.user,
        displayName: "Demo User",
        phone: "+7 000 000 00 03",
        phoneVisibleToAdmin: false,
        showTelegramToMeetupParticipants: true,
        showPhoneToMeetupParticipants: false,
        bio: "Portfolio demo member account.",
        createdAt: seedTimestamp,
        updatedAt: seedTimestamp,
      },
    ],
  });

  await prisma.userRoleAssignment.createMany({
    data: [
      {
        id: ids.roleAssignments.owner,
        userId: ids.users.owner,
        role: "owner",
        createdAt: seedTimestamp,
      },
      {
        id: ids.roleAssignments.admin,
        userId: ids.users.admin,
        role: "admin",
        createdAt: seedTimestamp,
      },
      {
        id: ids.roleAssignments.user,
        userId: ids.users.user,
        role: "user",
        createdAt: seedTimestamp,
      },
    ],
  });
}

async function createResources() {
  await prisma.room.createMany({
    data: [
      {
        id: ids.rooms.mainHall,
        name: "Main Hall",
        description: "Main shared room for board games.",
        sortOrder: 1,
        isActive: true,
        createdAt: seedTimestamp,
        updatedAt: seedTimestamp,
      },
      {
        id: ids.rooms.wargameRoom,
        name: "Wargame Room",
        description: "Dedicated room for larger war-game setups.",
        sortOrder: 2,
        isActive: true,
        createdAt: seedTimestamp,
        updatedAt: seedTimestamp,
      },
      {
        id: ids.rooms.smallRoom,
        name: "Small Room",
        description: "Quiet room for smaller groups.",
        sortOrder: 3,
        isActive: true,
        createdAt: seedTimestamp,
        updatedAt: seedTimestamp,
      },
    ],
  });

  await prisma.clubTable.createMany({
    data: [
      {
        id: ids.tables.main1,
        roomId: ids.rooms.mainHall,
        number: "Table 1",
        capacity: 4,
        isActive: true,
        sortOrder: 1,
        createdAt: seedTimestamp,
        updatedAt: seedTimestamp,
      },
      {
        id: ids.tables.main2,
        roomId: ids.rooms.mainHall,
        number: "Table 2",
        capacity: 6,
        isActive: true,
        sortOrder: 2,
        createdAt: seedTimestamp,
        updatedAt: seedTimestamp,
      },
      {
        id: ids.tables.main3,
        roomId: ids.rooms.mainHall,
        number: "Table 3",
        capacity: 8,
        isActive: true,
        sortOrder: 3,
        createdAt: seedTimestamp,
        updatedAt: seedTimestamp,
      },
      {
        id: ids.tables.war1,
        roomId: ids.rooms.wargameRoom,
        number: "Table W1",
        capacity: 6,
        isActive: true,
        sortOrder: 1,
        createdAt: seedTimestamp,
        updatedAt: seedTimestamp,
      },
      {
        id: ids.tables.war2,
        roomId: ids.rooms.wargameRoom,
        number: "Table W2",
        capacity: 8,
        isActive: true,
        sortOrder: 2,
        createdAt: seedTimestamp,
        updatedAt: seedTimestamp,
      },
      {
        id: ids.tables.small1,
        roomId: ids.rooms.smallRoom,
        number: "Table S1",
        capacity: 4,
        isActive: true,
        sortOrder: 1,
        createdAt: seedTimestamp,
        updatedAt: seedTimestamp,
      },
    ],
  });

  await prisma.clubWorkingHour.createMany({
    data: [
      {
        id: ids.workingHours.monday,
        dayOfWeek: 1,
        opensAt: time("12:00"),
        closesAt: time("22:00"),
        isClosed: false,
        createdAt: seedTimestamp,
        updatedAt: seedTimestamp,
      },
      {
        id: ids.workingHours.tuesday,
        dayOfWeek: 2,
        opensAt: time("12:00"),
        closesAt: time("22:00"),
        isClosed: false,
        createdAt: seedTimestamp,
        updatedAt: seedTimestamp,
      },
      {
        id: ids.workingHours.wednesday,
        dayOfWeek: 3,
        opensAt: time("12:00"),
        closesAt: time("22:00"),
        isClosed: false,
        createdAt: seedTimestamp,
        updatedAt: seedTimestamp,
      },
      {
        id: ids.workingHours.thursday,
        dayOfWeek: 4,
        opensAt: time("12:00"),
        closesAt: time("22:00"),
        isClosed: false,
        createdAt: seedTimestamp,
        updatedAt: seedTimestamp,
      },
      {
        id: ids.workingHours.friday,
        dayOfWeek: 5,
        opensAt: time("12:00"),
        closesAt: time("23:00"),
        isClosed: false,
        createdAt: seedTimestamp,
        updatedAt: seedTimestamp,
      },
      {
        id: ids.workingHours.saturday,
        dayOfWeek: 6,
        opensAt: time("10:00"),
        closesAt: time("23:00"),
        isClosed: false,
        createdAt: seedTimestamp,
        updatedAt: seedTimestamp,
      },
      {
        id: ids.workingHours.sunday,
        dayOfWeek: 7,
        opensAt: time("10:00"),
        closesAt: time("20:00"),
        isClosed: false,
        createdAt: seedTimestamp,
        updatedAt: seedTimestamp,
      },
    ],
  });

  await prisma.bookingRule.create({
    data: {
      id: ids.bookingRule,
      slotStepMinutes: 30,
      minBookingDurationMinutes: 30,
      maxBookingDurationMinutes: 360,
      allowFullDayBooking: true,
      minCancelBeforeMinutes: 120,
      maxActiveBookingsPerUser: 3,
      requiresAdminConfirmation: true,
      isActive: true,
      createdAt: seedTimestamp,
      updatedAt: seedTimestamp,
    },
  });
}

async function createBookings() {
  await prisma.booking.createMany({
    data: [
      {
        id: ids.bookings.pending,
        userId: ids.users.user,
        tableId: ids.tables.main1,
        startAt: bookingTimes.pending.startAt,
        endAt: bookingTimes.pending.endAt,
        status: "pending",
        guestCount: 4,
        comment: "Demo pending booking request.",
        createdAt: seedTimestamp,
        updatedAt: seedTimestamp,
      },
      {
        id: ids.bookings.confirmed,
        userId: ids.users.admin,
        tableId: ids.tables.war1,
        startAt: bookingTimes.confirmed.startAt,
        endAt: bookingTimes.confirmed.endAt,
        status: "confirmed",
        guestCount: 6,
        comment: "Demo confirmed booking.",
        adminComment: "Approved for local demo.",
        confirmedByUserId: ids.users.owner,
        confirmedAt: new Date("2026-01-02T09:00:00.000Z"),
        createdAt: seedTimestamp,
        updatedAt: new Date("2026-01-02T09:00:00.000Z"),
      },
      {
        id: ids.bookings.cancelled,
        userId: ids.users.user,
        tableId: ids.tables.small1,
        startAt: bookingTimes.cancelled.startAt,
        endAt: bookingTimes.cancelled.endAt,
        status: "cancelled_by_user",
        guestCount: 2,
        comment: "Demo cancelled booking.",
        cancelledByUserId: ids.users.user,
        cancelledAt: new Date("2026-01-03T08:30:00.000Z"),
        cancellationReason: "Demo cancellation before confirmation.",
        createdAt: seedTimestamp,
        updatedAt: new Date("2026-01-03T08:30:00.000Z"),
      },
      {
        id: ids.bookings.completed,
        userId: ids.users.owner,
        tableId: ids.tables.main2,
        startAt: bookingTimes.completed.startAt,
        endAt: bookingTimes.completed.endAt,
        status: "completed",
        guestCount: 5,
        comment: "Demo past completed booking.",
        adminComment: "Finished successfully.",
        confirmedByUserId: ids.users.admin,
        confirmedAt: new Date("2025-11-01T12:00:00.000Z"),
        createdAt: new Date("2025-11-01T10:00:00.000Z"),
        updatedAt: new Date("2025-11-10T14:00:00.000Z"),
      },
    ],
  });

  await prisma.bookingStatusHistory.createMany({
    data: [
      {
        id: ids.bookingStatusHistory.pendingCreated,
        bookingId: ids.bookings.pending,
        fromStatus: null,
        toStatus: "pending",
        changedByUserId: ids.users.user,
        reason: "Demo booking created.",
        createdAt: seedTimestamp,
      },
      {
        id: ids.bookingStatusHistory.confirmedCreated,
        bookingId: ids.bookings.confirmed,
        fromStatus: null,
        toStatus: "pending",
        changedByUserId: ids.users.admin,
        reason: "Initial pending state before approval.",
        createdAt: seedTimestamp,
      },
      {
        id: ids.bookingStatusHistory.confirmedApproved,
        bookingId: ids.bookings.confirmed,
        fromStatus: "pending",
        toStatus: "confirmed",
        changedByUserId: ids.users.owner,
        reason: "Owner approved the request.",
        createdAt: new Date("2026-01-02T09:00:00.000Z"),
      },
      {
        id: ids.bookingStatusHistory.cancelledCreated,
        bookingId: ids.bookings.cancelled,
        fromStatus: null,
        toStatus: "pending",
        changedByUserId: ids.users.user,
        reason: "Initial pending state before cancellation.",
        createdAt: seedTimestamp,
      },
      {
        id: ids.bookingStatusHistory.cancelledByUser,
        bookingId: ids.bookings.cancelled,
        fromStatus: "pending",
        toStatus: "cancelled_by_user",
        changedByUserId: ids.users.user,
        reason: "User cancelled the demo booking.",
        createdAt: new Date("2026-01-03T08:30:00.000Z"),
      },
      {
        id: ids.bookingStatusHistory.completedCreated,
        bookingId: ids.bookings.completed,
        fromStatus: null,
        toStatus: "pending",
        changedByUserId: ids.users.owner,
        reason: "Initial booking request.",
        createdAt: new Date("2025-11-01T10:00:00.000Z"),
      },
      {
        id: ids.bookingStatusHistory.completedApproved,
        bookingId: ids.bookings.completed,
        fromStatus: "pending",
        toStatus: "confirmed",
        changedByUserId: ids.users.admin,
        reason: "Admin confirmed the booking.",
        createdAt: new Date("2025-11-01T12:00:00.000Z"),
      },
      {
        id: ids.bookingStatusHistory.completedFinished,
        bookingId: ids.bookings.completed,
        fromStatus: "confirmed",
        toStatus: "completed",
        changedByUserId: ids.users.admin,
        reason: "Booking finished in the past.",
        createdAt: new Date("2025-11-10T14:00:00.000Z"),
      },
    ],
  });
}

async function main() {
  await resetData();
  await createUsers();
  await createResources();
  await createBookings();

  globalThis.console.log("Demo seed data created successfully.");
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
