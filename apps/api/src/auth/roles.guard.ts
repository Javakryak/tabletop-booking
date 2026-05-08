import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { isAppRole, uniqueAppRoles } from "@tabletop-booking/shared";
import type { AppRole } from "@tabletop-booking/shared";

import { REQUIRED_ROLES_KEY } from "./roles.decorator.js";

type RequestUserShape = {
  role?: unknown;
  roles?: unknown;
};

type RequestShape = {
  user?: RequestUserShape;
};

type RequestActor = {
  isAuthenticated: boolean;
  roles: AppRole[];
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<AppRole[] | undefined>(
      REQUIRED_ROLES_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestShape>();
    const actor = this.resolveActor(request);

    if (requiredRoles.includes("guest")) {
      return true;
    }

    if (!actor.isAuthenticated) {
      throw new UnauthorizedException("Authentication required");
    }

    if (actor.roles.includes("owner")) {
      return true;
    }

    return requiredRoles.some((role) => actor.roles.includes(role));
  }

  private resolveActor(request: RequestShape): RequestActor {
    const candidateRoles = this.extractRoles(request.user);
    const authenticatedRoles = candidateRoles.filter((role) => role !== "guest");

    if (authenticatedRoles.length === 0) {
      return {
        isAuthenticated: false,
        roles: ["guest"]
      };
    }

    return {
      isAuthenticated: true,
      roles: uniqueAppRoles(authenticatedRoles)
    };
  }

  private extractRoles(user: RequestUserShape | undefined): AppRole[] {
    if (!user) {
      return [];
    }

    const rolesFromArray = Array.isArray(user.roles) ? user.roles.filter(isAppRole) : [];
    const roleFromSingle = isAppRole(user.role) ? [user.role] : [];

    return uniqueAppRoles([...rolesFromArray, ...roleFromSingle]);
  }
}
