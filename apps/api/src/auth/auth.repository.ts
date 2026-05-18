import { PrismaClient } from "@prisma/client";
import type { AppRole } from "@tabletop-booking/shared";

import type { VerifiedTelegramIdentity } from "./telegram-auth-verifier.js";

type AuthUserRecord = {
  consentsCount: number;
  id: string;
  phone: string | null;
  roles: Array<Exclude<AppRole, "guest">>;
  telegramId: string | null;
  telegramUsername: string | null;
  userProfileDisplayName: string;
};

export class AuthRepository {
  private readonly prisma = new PrismaClient();

  async findByTelegramId(telegramId: string): Promise<AuthUserRecord | null> {
    const user = await this.prisma.user.findUnique({
      where: {
        telegramId
      },
      include: {
        consents: {
          select: {
            id: true
          }
        },
        profile: {
          select: {
            displayName: true,
            phone: true
          }
        },
        roles: {
          select: {
            role: true
          }
        }
      }
    });

    if (!user || !user.profile) {
      return null;
    }

    return {
      consentsCount: user.consents.length,
      id: user.id,
      phone: user.profile.phone,
      roles: user.roles.map(
        (roleAssignment: { role: string }) => roleAssignment.role as Exclude<AppRole, "guest">
      ),
      telegramId: user.telegramId,
      telegramUsername: user.telegramUsername,
      userProfileDisplayName: user.profile.displayName
    };
  }

  async createUserFromTelegramIdentity(
    identity: VerifiedTelegramIdentity
  ): Promise<AuthUserRecord> {
    const displayName = formatDisplayName(identity.firstName, identity.lastName);
    const createdUser = await this.prisma.user.create({
      data: {
        telegramId: identity.telegramId,
        telegramUsername: identity.telegramUsername,
        profile: {
          create: {
            avatarUrl: identity.photoUrl,
            displayName
          }
        },
        roles: {
          create: [{ role: "user" }]
        }
      },
      include: {
        consents: {
          select: {
            id: true
          }
        },
        profile: {
          select: {
            displayName: true,
            phone: true
          }
        },
        roles: {
          select: {
            role: true
          }
        }
      }
    });

    return {
      consentsCount: createdUser.consents.length,
      id: createdUser.id,
      phone: createdUser.profile?.phone ?? null,
      roles: createdUser.roles.map(
        (roleAssignment: { role: string }) => roleAssignment.role as Exclude<AppRole, "guest">
      ),
      telegramId: createdUser.telegramId,
      telegramUsername: createdUser.telegramUsername,
      userProfileDisplayName: createdUser.profile?.displayName ?? displayName
    };
  }

  async createUserFromTelegramBotLink(input: {
    displayName: string;
    telegramId: string;
    telegramUsername: string | null;
  }): Promise<AuthUserRecord> {
    const createdUser = await this.prisma.user.create({
      data: {
        telegramId: input.telegramId,
        telegramUsername: input.telegramUsername,
        profile: {
          create: {
            displayName: input.displayName
          }
        },
        roles: {
          create: [{ role: "user" }]
        }
      },
      include: {
        consents: {
          select: {
            id: true
          }
        },
        profile: {
          select: {
            displayName: true,
            phone: true
          }
        },
        roles: {
          select: {
            role: true
          }
        }
      }
    });

    return {
      consentsCount: createdUser.consents.length,
      id: createdUser.id,
      phone: createdUser.profile?.phone ?? null,
      roles: createdUser.roles.map(
        (roleAssignment: { role: string }) => roleAssignment.role as Exclude<AppRole, "guest">
      ),
      telegramId: createdUser.telegramId,
      telegramUsername: createdUser.telegramUsername,
      userProfileDisplayName: createdUser.profile?.displayName ?? input.displayName
    };
  }

  async updateTelegramMetadata(
    userId: string,
    telegramUsername: string | null
  ): Promise<void> {
    await this.prisma.user.update({
      where: {
        id: userId
      },
      data: {
        telegramUsername
      }
    });
  }
}

function formatDisplayName(firstName: string, lastName: string | null): string {
  if (!lastName) {
    return firstName;
  }

  return `${firstName} ${lastName}`.trim();
}
