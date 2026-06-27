import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronDown, BookOpen, LogOut } from "lucide-react";
import { NAV } from "./nav-config";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { isAdmin, signOut } = useAuth();
  const [open, setOpen] = useState<Record<string, boolean>>({
    "System Setting": false,
    Library: true,
  });

  const isActive = (to: string) => pathname === to;

  return (
    <aside className="flex h-full w-64 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <BookOpen className="h-4 w-4" />
        </div>
        <span className="font-bold text-sidebar-foreground">Smart School ERP</span>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {NAV.map((entry) => {
          if (entry.type === "link") {
            const { item } = entry;
            const Icon = item.icon!;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive(item.to)
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          }
          const { group } = entry;
          const items = group.items.filter((i) => !i.adminOnly || isAdmin);
          if (items.length === 0) return null;
          const GroupIcon = group.icon;
          const isOpen = open[group.label];
          return (
            <div key={group.label}>
              <button
                onClick={() =>
                  setOpen((o) => ({ ...o, [group.label]: !o[group.label] }))
                }
                className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                <GroupIcon className="h-4 w-4" />
                <span className="flex-1 text-left">{group.label}</span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform",
                    isOpen && "rotate-180",
                  )}
                />
              </button>
              {isOpen && (
                <div className="mt-1 space-y-1 pl-4">
                  {items.map((item) => (
                    <Link
                      key={item.label + item.to}
                      to={item.to}
                      onClick={onNavigate}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                        isActive(item.to)
                          ? "bg-sidebar-primary text-sidebar-primary-foreground"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      )}
                    >
                      {item.icon && <item.icon className="h-4 w-4" />}
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <button
        onClick={() => signOut()}
        className="flex items-center gap-3 border-t border-sidebar-border px-5 py-3 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
      >
        <LogOut className="h-4 w-4" />
        Logout
      </button>
    </aside>
  );
}