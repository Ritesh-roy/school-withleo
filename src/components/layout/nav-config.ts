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

export interface NavItem {
  label: string;
  to: string;
  icon?: LucideIcon;
  adminOnly?: boolean;
}

export interface NavGroup {
  label: string;
  icon: LucideIcon;
  items: NavItem[];
}

export type NavEntry =
  | { type: "link"; item: NavItem }
  | { type: "group"; group: NavGroup };

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
      items: [
        { label: "Users & Roles", to: "/users", icon: Users, adminOnly: true },
        { label: "App Settings", to: "/settings", icon: Settings, adminOnly: true },
        { label: "Activity Logs", to: "/activity", icon: ScrollText },
      ],
    },
  },
  {
    type: "group",
    group: {
      label: "Library",
      icon: Library,
      items: [
        { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
        { label: "Library Master", to: "/library-master", icon: BookMarked },
        { label: "Book Master", to: "/books", icon: BookOpen },
        { label: "Bulk Entry", to: "/bulk-entry", icon: Boxes },
        { label: "Membership", to: "/members", icon: UserSquare2 },
        { label: "Issue", to: "/issue", icon: ArrowUpRight },
        { label: "Return", to: "/return", icon: ArrowDownLeft },
        { label: "Report", to: "/reports", icon: FileBarChart },
      ],
    },
  },
];