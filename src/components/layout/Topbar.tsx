import { Menu, Moon, Sun, LogOut, UserCircle } from "lucide-react";
import { useAuth, ROLE_LABELS } from "@/lib/auth";
import logo from "@/assets/school-withleo-logo.png.asset.json";
import { useTheme } from "@/lib/theme";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const { fullName, primaryRole, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const year = new Date().getFullYear();

  return (
    <header className="flex h-14 items-center gap-3 bg-topbar px-4 text-topbar-foreground">
      <button
        onClick={onMenu}
        className="rounded-md p-1.5 hover:bg-white/15 lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>
      <img src={logo.url} alt="School withleo" className="h-8 w-8 rounded-md bg-white/10 object-contain p-0.5" />
      <h1 className="text-lg font-bold">School withleo</h1>
      <div className="ml-auto flex items-center gap-1 sm:gap-3">
        <button
          onClick={toggle}
          className="rounded-md p-2 hover:bg-white/15"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </button>
        <span className="hidden text-sm font-medium sm:inline">{year}</span>
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-white/15">
            <UserCircle className="h-6 w-6" />
            <span className="hidden text-sm sm:inline">
              {fullName || "User"}
              {primaryRole ? ` (${ROLE_LABELS[primaryRole]})` : ""}
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>
              {fullName}
              <p className="text-xs font-normal text-muted-foreground">
                {primaryRole ? ROLE_LABELS[primaryRole] : ""}
              </p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut()}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}