import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const VARIANTS: Record<string, string> = {
  blue: "[background:var(--gradient-blue)]",
  green: "[background:var(--gradient-green)]",
  orange: "[background:var(--gradient-orange)]",
  red: "[background:var(--gradient-red)]",
};

export function StatCard({
  label,
  value,
  icon: Icon,
  variant = "blue",
}: {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  variant?: keyof typeof VARIANTS;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl p-5 text-white shadow-[var(--shadow-card)]",
        VARIANTS[variant],
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-white/90">{label}</p>
          <p className="mt-2 text-3xl font-bold">{value}</p>
        </div>
        {Icon && (
          <Icon className="h-9 w-9 text-white/40" strokeWidth={1.5} />
        )}
      </div>
    </div>
  );
}