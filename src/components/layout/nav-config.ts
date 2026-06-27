import {
  LayoutDashboard,
  Settings,
  Users,
  ScrollText,
  BookOpen,
  Library,
  BookMarked,
  Boxes,
  UserSquare2,
  ArrowUpRight,
  ArrowDownLeft,
  FileBarChart,
  type LucideIcon,
} from "lucide-react";
import type { AppRole } from "@/lib/auth";

export interface NavItem {
  label: string;
  to: string;
  icon?: LucideIcon;
  adminOnly?: boolean;
  /** Roles that may see this item. Omit to allow everyone signed in. */
  roles?: AppRole[];
}

export interface NavGroup {
  label: string;
  icon: LucideIcon;
  items: NavItem[];
  roles?: AppRole[];
}

export type NavEntry =
  | { type: "link"; item: NavItem }
  | { type: "group"; group: NavGroup };

const ADMIN_ROLES: AppRole[] = ["super_admin", "admin"];
const STAFF_ROLES: AppRole[] = ["super_admin", "admin", "librarian"];
const LIBRARY_VIEW_ROLES: AppRole[] = [
  "super_admin",
  "admin",
  "librarian",
  "teacher",
  "student",
];

export const NAV: NavEntry[] = [
  {
    type: "link",
    item: { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  },
  {
    type: "group",
    group: {
      label: "System Setting",
      icon: Settings,
      roles: ADMIN_ROLES,
      items: [
        { label: "Users & Roles", to: "/users", icon: Users, roles: ADMIN_ROLES },
        { label: "App Settings", to: "/settings", icon: Settings, roles: ADMIN_ROLES },
        { label: "Activity Logs", to: "/activity", icon: ScrollText, roles: ADMIN_ROLES },
      ],
    },
  },
  {
    type: "group",
    group: {
      label: "Library",
      icon: Library,
      roles: LIBRARY_VIEW_ROLES,
      items: [
        { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard, roles: LIBRARY_VIEW_ROLES },
        { label: "Library Master", to: "/library-master", icon: BookMarked, roles: STAFF_ROLES },
        { label: "Book Master", to: "/books", icon: BookOpen, roles: LIBRARY_VIEW_ROLES },
        { label: "Bulk Entry", to: "/bulk-entry", icon: Boxes, roles: STAFF_ROLES },
        { label: "Membership", to: "/members", icon: UserSquare2, roles: STAFF_ROLES },
        { label: "Issue", to: "/issue", icon: ArrowUpRight, roles: LIBRARY_VIEW_ROLES },
        { label: "Return", to: "/return", icon: ArrowDownLeft, roles: [...STAFF_ROLES, "teacher"] },
        { label: "Report", to: "/reports", icon: FileBarChart, roles: STAFF_ROLES },
      ],
    },
  },
];

export function filterNavForRole(role: AppRole | null): NavEntry[] {
  if (!role) return [];
  const allow = (roles?: AppRole[]) => !roles || roles.includes(role);
  return NAV.flatMap<NavEntry>((entry) => {
    if (entry.type === "link") return allow(entry.item.roles) ? [entry] : [];
    if (!allow(entry.group.roles)) return [];
    const items = entry.group.items.filter((i) => allow(i.roles));
    if (items.length === 0) return [];
    return [{ type: "group", group: { ...entry.group, items } }];
  });
}
