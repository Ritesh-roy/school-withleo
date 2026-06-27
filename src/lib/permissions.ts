import type { AppRole } from "./auth";

/**
 * Allowed route prefixes per role.
 * super_admin and admin → full access.
 * Other roles see only matching routes; the rest redirect to /unauthorized.
 */
export const ROLE_ROUTES: Record<AppRole, RegExp[]> = {
  super_admin: [/.*/],
  admin: [/.*/],
  librarian: [
    /^\/dashboard/,
    /^\/library-master/,
    /^\/books/,
    /^\/bulk-entry/,
    /^\/members/,
    /^\/issue/,
    /^\/return/,
    /^\/reports/,
    /^\/profile/,
  ],
  teacher: [
    /^\/dashboard/,
    /^\/books/,
    /^\/issue/,
    /^\/return/,
    /^\/profile/,
  ],
  student: [
    /^\/dashboard/,
    /^\/books/,
    /^\/issue/,
    /^\/profile/,
  ],
};

export function canAccess(role: AppRole | null, pathname: string): boolean {
  if (!role) return false;
  return ROLE_ROUTES[role].some((re) => re.test(pathname));
}
