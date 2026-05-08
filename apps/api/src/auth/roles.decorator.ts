import { SetMetadata } from "@nestjs/common";
import type { AppRole } from "@tabletop-booking/shared";

export const REQUIRED_ROLES_KEY = "requiredRoles";

export const Roles = (...roles: AppRole[]) => SetMetadata(REQUIRED_ROLES_KEY, roles);
