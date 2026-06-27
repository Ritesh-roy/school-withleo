import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string | null;
  hint?: string;
  children: ReactNode;
  className?: string;
}

// Reusable labeled wrapper with required asterisk and inline validation message.
export function FormField({ label, required, error, hint, children, className }: FormFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      <div className={cn(error && "[&_input]:border-destructive [&_textarea]:border-destructive [&_[role=combobox]]:border-destructive")}>
        {children}
      </div>
      {error ? (
        <p className="text-[0.7rem] font-medium text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-[0.7rem] text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
