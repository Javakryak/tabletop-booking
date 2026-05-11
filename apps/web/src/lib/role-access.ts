export const ADMIN_ROUTE_ROLES = ["admin", "owner"] as const;
export const OWNER_ROUTE_ROLES = ["owner"] as const;

export type AdminRouteRole = (typeof ADMIN_ROUTE_ROLES)[number];
export type OwnerRouteRole = (typeof OWNER_ROUTE_ROLES)[number];

const adminRoleSet = new Set<string>(ADMIN_ROUTE_ROLES);
const ownerRoleSet = new Set<string>(OWNER_ROUTE_ROLES);

function splitRoleTokens(value: string): string[] {
  return value
    .split(",")
    .map((token) => token.trim().toLowerCase())
    .filter((token) => token.length > 0);
}

export function extractRolesFromSearchParams(searchParams: URLSearchParams): string[] {
  const roleTokens = [
    ...searchParams.getAll("role"),
    ...searchParams.getAll("roles")
  ].flatMap(splitRoleTokens);

  return [...new Set(roleTokens)];
}

export function hasAdminRouteAccess(roles: Iterable<string>): boolean {
  for (const role of roles) {
    if (adminRoleSet.has(role.toLowerCase())) {
      return true;
    }
  }

  return false;
}

export function hasOwnerRouteAccess(roles: Iterable<string>): boolean {
  for (const role of roles) {
    if (ownerRoleSet.has(role.toLowerCase())) {
      return true;
    }
  }

  return false;
}
