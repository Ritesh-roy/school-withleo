// Shared form utilities: validation, input restriction, focus navigation.
import type { KeyboardEvent } from "react";

const CURRENT_YEAR = new Date().getFullYear();

export const validators = {
  required(v: string | number | null | undefined, label = "Field"): string | null {
    if (v === null || v === undefined) return `${label} is required.`;
    const s = String(v).trim();
    return s.length ? null : `${label} is required.`;
  },
  email(v: string): string | null {
    if (!v) return null;
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim())
      ? null
      : "Please enter a valid email address.";
  },
  phone(v: string): string | null {
    if (!v) return null;
    return /^\d{10}$/.test(v.trim())
      ? null
      : "Please enter a valid 10-digit mobile number.";
  },
  pin(v: string): string | null {
    if (!v) return null;
    return /^\d{6}$/.test(v.trim()) ? null : "PIN code must be 6 digits.";
  },
  year(v: string): string | null {
    if (!v) return null;
    const n = Number(v);
    if (!/^\d{4}$/.test(v.trim())) return "Year must be a 4-digit number (YYYY).";
    if (n < 1900 || n > CURRENT_YEAR)
      return `Year must be between 1900 and ${CURRENT_YEAR}.`;
    return null;
  },
  positiveNumber(v: string, label = "Value"): string | null {
    if (v === "" || v === null || v === undefined) return null;
    const n = Number(v);
    if (Number.isNaN(n)) return `${label} must be numeric.`;
    if (n < 0) return `${label} cannot be negative.`;
    return null;
  },
  positiveInt(v: string, label = "Value"): string | null {
    if (v === "" || v === null || v === undefined) return null;
    if (!/^\d+$/.test(String(v).trim())) return `${label} must be a whole number.`;
    return null;
  },
  greaterThanZero(v: string, label = "Value"): string | null {
    const r = validators.positiveNumber(v, label);
    if (r) return r;
    if (Number(v) <= 0) return `${label} must be greater than zero.`;
    return null;
  },
  isbn(v: string): string | null {
    if (!v) return null;
    const cleaned = v.replace(/[-\s]/g, "");
    if (!/^\d{10}(\d{3})?$/.test(cleaned))
      return "ISBN must be 10 or 13 digits (hyphens allowed).";
    return null;
  },
  textOnly(v: string, label = "Field"): string | null {
    if (!v) return null;
    return /^[A-Za-z\s.,'\-&()]+$/.test(v.trim())
      ? null
      : `${label} must contain letters only.`;
  },
  url(v: string): string | null {
    if (!v) return null;
    try {
      new URL(v);
      return null;
    } catch {
      return "Please enter a valid URL.";
    }
  },
};

// Restrict input keystrokes
export const restrict = {
  // digits only (e.g. phone, pin, year, copies, pages)
  digits(e: KeyboardEvent<HTMLInputElement>) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const allowed = [
      "Backspace", "Delete", "Tab", "Enter", "Escape",
      "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End",
    ];
    if (allowed.includes(e.key)) return;
    if (!/^\d$/.test(e.key)) e.preventDefault();
  },
  // digits + one decimal (e.g. price, mrp, fine)
  decimal(e: KeyboardEvent<HTMLInputElement>) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const allowed = [
      "Backspace", "Delete", "Tab", "Enter", "Escape",
      "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End",
    ];
    if (allowed.includes(e.key)) return;
    const target = e.currentTarget;
    if (e.key === "." && !target.value.includes(".")) return;
    if (!/^\d$/.test(e.key)) e.preventDefault();
  },
  // digits + hyphen (ISBN)
  isbn(e: KeyboardEvent<HTMLInputElement>) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const allowed = [
      "Backspace", "Delete", "Tab", "Enter", "Escape",
      "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "-",
    ];
    if (allowed.includes(e.key)) return;
    if (!/^\d$/.test(e.key)) e.preventDefault();
  },
  // letters + spaces + common punctuation (author, publisher, etc.)
  text(e: KeyboardEvent<HTMLInputElement>) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const allowed = [
      "Backspace", "Delete", "Tab", "Enter", "Escape",
      "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End",
      " ", ".", ",", "'", "-", "&", "(", ")",
    ];
    if (allowed.includes(e.key)) return;
    if (!/^[A-Za-z]$/.test(e.key)) e.preventDefault();
  },
};

// Sanitize pasted/typed values to keep state consistent with restrictions
export const sanitize = {
  digits(v: string, maxLen?: number) {
    const s = v.replace(/\D/g, "");
    return maxLen ? s.slice(0, maxLen) : s;
  },
  decimal(v: string) {
    const cleaned = v.replace(/[^\d.]/g, "");
    const parts = cleaned.split(".");
    return parts.length > 1 ? `${parts[0]}.${parts.slice(1).join("")}` : cleaned;
  },
  isbn(v: string) {
    return v.replace(/[^\d-]/g, "");
  },
  text(v: string) {
    return v.replace(/[^A-Za-z\s.,'\-&()]/g, "");
  },
};

// Enter key moves focus to the next focusable form control (skips textareas
// and submit buttons so users can still submit by pressing Enter on the button).
export function handleFormKeyDown(e: KeyboardEvent<HTMLFormElement>) {
  if (e.key !== "Enter") return;
  const target = e.target as HTMLElement;
  if (target.tagName === "TEXTAREA") return;
  if (target.tagName === "BUTTON" && (target as HTMLButtonElement).type === "submit") return;
  e.preventDefault();
  const form = e.currentTarget;
  const focusables = Array.from(
    form.querySelectorAll<HTMLElement>(
      'input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]):not([type="button"]), [role="combobox"]:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((el) => el.offsetParent !== null);
  const idx = focusables.indexOf(target);
  const next = focusables[idx + 1];
  if (next) next.focus();
}

export { CURRENT_YEAR };
