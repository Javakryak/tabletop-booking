export const APP_ROLES = ["guest", "user", "admin", "owner"] as const;

export type AppRole = (typeof APP_ROLES)[number];

const appRoleSet = new Set<string>(APP_ROLES);

export function isAppRole(value: unknown): value is AppRole {
  return typeof value === "string" && appRoleSet.has(value);
}

export function uniqueAppRoles(roles: Iterable<AppRole>): AppRole[] {
  return [...new Set(roles)];
}
