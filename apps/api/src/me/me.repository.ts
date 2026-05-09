import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";

import { databaseClient } from "../database.js";

export type MeProfileRecord = {
  deletionRequestedAt: Date | null;
  displayName: string;
  email: string | null;
  id: string;
  phone: string | null;
  showPhoneToAdmins: boolean;
  showTelegramUsernameToMeetupParticipants: boolean;
  status: "active" | "blocked" | "deleted";
  telegramUsername: string | null;
};

export type UpdateMeProfileInput = {
  displayName?: string;
  email?: string | null;
  phone?: string | null;
};

export type UpdateMePrivacyInput = {
  showPhoneToAdmins?: boolean;
  showTelegramUsernameToMeetupParticipants?: boolean;
};

@Injectable()
export class MeRepository {
  async findProfileByUserId(userId: string): Promise<MeProfileRecord | null> {
    const user = await databaseClient.user.findUnique({
      where: {
        id: userId
      },
      select: {
        deletionRequestedAt: true,
        email: true,
        id: true,
        profile: {
          select: {
            displayName: true,
            phone: true,
            phoneVisibleToAdmin: true,
            showTelegramToMeetupParticipants: true
          }
        },
        status: true,
        telegramUsername: true
      }
    });

    if (!user || !user.profile) {
      return null;
    }

    return {
      displayName: user.profile.displayName,
      deletionRequestedAt: user.deletionRequestedAt,
      email: user.email,
      id: user.id,
      phone: user.profile.phone,
      showPhoneToAdmins: user.profile.phoneVisibleToAdmin,
      showTelegramUsernameToMeetupParticipants: user.profile.showTelegramToMeetupParticipants,
      status: user.status,
      telegramUsername: user.telegramUsername
    };
  }

  async updateProfile(userId: string, input: UpdateMeProfileInput): Promise<MeProfileRecord | null> {
    await databaseClient.$transaction(async (tx: Prisma.TransactionClient) => {
      const profileData = buildProfileUpdateData(input);
      const userData = buildUserUpdateData(input);

      if (Object.keys(userData).length > 0) {
        await tx.user.update({
          where: {
            id: userId
          },
          data: userData
        });
      }

      if (Object.keys(profileData).length > 0) {
        await tx.userProfile.update({
          where: {
            userId
          },
          data: profileData
        });
      }
    });

    return await this.findProfileByUserId(userId);
  }

  async updatePrivacy(userId: string, input: UpdateMePrivacyInput): Promise<MeProfileRecord | null> {
    const profileData = buildPrivacyUpdateData(input);
    if (Object.keys(profileData).length > 0) {
      await databaseClient.userProfile.update({
        where: {
          userId
        },
        data: profileData
      });
    }

    return await this.findProfileByUserId(userId);
  }

  async requestDeletion(userId: string, reason: string | null, requestedAt: Date): Promise<void> {
    await databaseClient.user.update({
      where: {
        id: userId
      },
      data: {
        deletionRequestReason: reason,
        deletionRequestedAt: requestedAt
      }
    });
  }
}

function buildProfileUpdateData(
  input: UpdateMeProfileInput
): {
  displayName?: string;
  phone?: string | null;
} {
  const data: {
    displayName?: string;
    phone?: string | null;
  } = {};

  if (input.displayName !== undefined) {
    data.displayName = input.displayName;
  }
  if (input.phone !== undefined) {
    data.phone = input.phone;
  }

  return data;
}

function buildUserUpdateData(
  input: UpdateMeProfileInput
): {
  email?: string | null;
} {
  const data: {
    email?: string | null;
  } = {};

  if (input.email !== undefined) {
    data.email = input.email;
  }

  return data;
}

function buildPrivacyUpdateData(
  input: UpdateMePrivacyInput
): {
  phoneVisibleToAdmin?: boolean;
  showTelegramToMeetupParticipants?: boolean;
} {
  const data: {
    phoneVisibleToAdmin?: boolean;
    showTelegramToMeetupParticipants?: boolean;
  } = {};

  if (input.showPhoneToAdmins !== undefined) {
    data.phoneVisibleToAdmin = input.showPhoneToAdmins;
  }
  if (input.showTelegramUsernameToMeetupParticipants !== undefined) {
    data.showTelegramToMeetupParticipants = input.showTelegramUsernameToMeetupParticipants;
  }

  return data;
}
