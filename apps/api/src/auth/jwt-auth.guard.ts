import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { isAppRole, uniqueAppRoles } from "@tabletop-booking/shared";
import jwt from "jsonwebtoken";
import type { JwtPayload } from "jsonwebtoken";

type RequestShape = {
  headers?: Record<string, string | string[] | undefined>;
  user?: {
    id: string;
    roles: string[];
  };
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestShape>();
    const token = resolveBearerToken(request.headers);
    if (!token) {
      throw new UnauthorizedException("Authentication required");
    }

    const secret = this.configService.get<string>("JWT_SECRET");
    if (!secret) {
      throw new ServiceUnavailableException("JWT secret is not configured");
    }

    let decoded: string | JwtPayload;
    try {
      decoded = jwt.verify(token, secret, {
        algorithms: ["HS256"]
      });
    } catch {
      throw new UnauthorizedException("Invalid access token");
    }
    if (!decoded || typeof decoded === "string") {
      throw new UnauthorizedException("Invalid access token");
    }

    const userId = resolveUserId(decoded);
    const roles = resolveRoles(decoded);
    if (!userId || roles.length === 0) {
      throw new UnauthorizedException("Invalid access token");
    }

    request.user = {
      id: userId,
      roles
    };

    return true;
  }
}

function resolveBearerToken(
  headers: Record<string, string | string[] | undefined> | undefined
): string | null {
  const rawAuthorization = headers?.authorization;
  const authorization = Array.isArray(rawAuthorization) ? rawAuthorization[0] : rawAuthorization;
  if (!authorization) {
    return null;
  }

  const match = /^Bearer\s+(.+)$/i.exec(authorization.trim());
  if (!match) {
    return null;
  }

  return match[1] ?? null;
}

function resolveUserId(payload: JwtPayload): string | null {
  if (typeof payload.sub !== "string" || payload.sub.trim().length === 0) {
    return null;
  }

  return payload.sub;
}

function resolveRoles(payload: JwtPayload): string[] {
  const roleCandidates = [
    ...(Array.isArray(payload.roles) ? payload.roles : []),
    payload.role
  ].filter(isAppRole);
  const normalized = uniqueAppRoles(roleCandidates.filter((role) => role !== "guest"));

  return normalized;
}
