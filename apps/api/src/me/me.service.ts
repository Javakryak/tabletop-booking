import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";

import type { UpdateMePrivacyDto, UpdateMeProfileDto } from "./dto/me.dto.js";
import { MeRepository } from "./me.repository.js";

type MeResponse = {
  data: {
    displayName: string;
    email: string | null;
    id: string;
    phone: string | null;
    privacy: {
      showPhoneToAdmins: boolean;
      showTelegramUsernameToMeetupParticipants: boolean;
    };
    telegramUsername: string | null;
  };
};

type AccountDeletionRequestResponse = {
  data: {
    status: "received";
  };
};

@Injectable()
export class MeService {
  constructor(private readonly meRepository: MeRepository) {}

  async getMe(userId: string): Promise<MeResponse> {
    const profile = await this.meRepository.findProfileByUserId(userId);
    this.ensureActiveProfile(profile);

    return mapToMeResponse(profile);
  }

  async updateProfile(userId: string, body: UpdateMeProfileDto): Promise<MeResponse> {
    if (!hasAnyDefinedValue(body, ["displayName", "phone", "email"])) {
      throw new BadRequestException("At least one profile field must be provided");
    }

    const current = await this.meRepository.findProfileByUserId(userId);
    this.ensureActiveProfile(current);

    try {
      const updated = await this.meRepository.updateProfile(userId, buildProfileUpdateInput(body));
      this.ensureActiveProfile(updated);

      return mapToMeResponse(updated);
    } catch (error: unknown) {
      throw mapPersistenceError(error);
    }
  }

  async updatePrivacy(userId: string, body: UpdateMePrivacyDto): Promise<MeResponse> {
    if (
      !hasAnyDefinedValue(body, [
        "showTelegramUsernameToMeetupParticipants",
        "showPhoneToAdmins"
      ])
    ) {
      throw new BadRequestException("At least one privacy field must be provided");
    }

    const current = await this.meRepository.findProfileByUserId(userId);
    this.ensureActiveProfile(current);

    const updated = await this.meRepository.updatePrivacy(userId, buildPrivacyUpdateInput(body));
    this.ensureActiveProfile(updated);

    return mapToMeResponse(updated);
  }

  async requestAccountDeletion(
    userId: string,
    reason: string | undefined
  ): Promise<AccountDeletionRequestResponse> {
    const current = await this.meRepository.findProfileByUserId(userId);
    this.ensureActiveProfile(current);

    if (!current.deletionRequestedAt) {
      await this.meRepository.requestDeletion(userId, reason ?? null, new Date());
    }

    return {
      data: {
        status: "received"
      }
    };
  }

  private ensureActiveProfile(
    profile: Awaited<ReturnType<MeRepository["findProfileByUserId"]>>
  ): asserts profile is NonNullable<Awaited<ReturnType<MeRepository["findProfileByUserId"]>>> {
    if (!profile) {
      throw new NotFoundException("Authenticated user profile was not found");
    }

    if (profile.status !== "active") {
      throw new ForbiddenException("User account is not active");
    }
  }
}

function hasAnyDefinedValue<T extends object>(payload: T, keys: Array<keyof T>): boolean {
  return keys.some((key) => payload[key] !== undefined);
}

function mapToMeResponse(
  profile: NonNullable<Awaited<ReturnType<MeRepository["findProfileByUserId"]>>>
): MeResponse {
  return {
    data: {
      displayName: profile.displayName,
      email: profile.email,
      id: profile.id,
      phone: profile.phone,
      privacy: {
        showPhoneToAdmins: profile.showPhoneToAdmins,
        showTelegramUsernameToMeetupParticipants:
          profile.showTelegramUsernameToMeetupParticipants
      },
      telegramUsername: profile.telegramUsername
    }
  };
}

function mapPersistenceError(error: unknown): Error {
  const knownError = asPrismaKnownRequestError(error);
  if (
    knownError?.code === "P2002" &&
    Array.isArray(knownError.meta?.target) &&
    knownError.meta.target.includes("email")
  ) {
    return new ConflictException("Email is already used by another account");
  }

  if (error instanceof Error) {
    return error;
  }

  return new Error("Unexpected persistence error");
}

function buildProfileUpdateInput(body: UpdateMeProfileDto): {
  displayName?: string;
  email?: string | null;
  phone?: string | null;
} {
  const input: {
    displayName?: string;
    email?: string | null;
    phone?: string | null;
  } = {};

  if (body.displayName !== undefined) {
    input.displayName = body.displayName;
  }
  if (body.email !== undefined) {
    input.email = body.email;
  }
  if (body.phone !== undefined) {
    input.phone = body.phone;
  }

  return input;
}

function buildPrivacyUpdateInput(body: UpdateMePrivacyDto): {
  showPhoneToAdmins?: boolean;
  showTelegramUsernameToMeetupParticipants?: boolean;
} {
  const input: {
    showPhoneToAdmins?: boolean;
    showTelegramUsernameToMeetupParticipants?: boolean;
  } = {};

  if (body.showPhoneToAdmins !== undefined) {
    input.showPhoneToAdmins = body.showPhoneToAdmins;
  }
  if (body.showTelegramUsernameToMeetupParticipants !== undefined) {
    input.showTelegramUsernameToMeetupParticipants =
      body.showTelegramUsernameToMeetupParticipants;
  }

  return input;
}

function asPrismaKnownRequestError(
  error: unknown
): {
  code?: string;
  meta?: { target?: unknown };
} | null {
  if (!error || typeof error !== "object") {
    return null;
  }

  const candidate = error as { code?: unknown; meta?: unknown };
  if (typeof candidate.code !== "string") {
    return null;
  }

  const result: {
    code?: string;
    meta?: { target?: unknown };
  } = {
    code: candidate.code
  };
  if (candidate.meta && typeof candidate.meta === "object") {
    result.meta = candidate.meta as { target?: unknown };
  }

  return result;
}
