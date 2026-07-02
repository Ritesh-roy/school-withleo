import { LOGO_URL, APP_NAME } from "@/lib/branding";
import { cn } from "@/lib/utils";

interface AppLogoProps {
  className?: string;
  alt?: string;
}

// Centralized logo image. Uses object-contain so the mark scales cleanly
// on any surface (topbar, sidebar, auth). Falls back to first-letter tile
// if the CDN image ever fails to load.
export function AppLogo({ className, alt = APP_NAME }: AppLogoProps) {
  return (
    <img
      src={LOGO_URL}
      alt={alt}
      loading="eager"
      decoding="async"
      className={cn("object-contain", className)}
      onError={(e) => {
        const img = e.currentTarget;
        img.onerror = null;
        img.style.display = "none";
        const parent = img.parentElement;
        if (parent && !parent.querySelector("[data-logo-fallback]")) {
          const span = document.createElement("span");
          span.dataset.logoFallback = "true";
          span.textContent = APP_NAME.charAt(0);
          span.className =
            "flex h-full w-full items-center justify-center rounded-md bg-primary text-primary-foreground text-sm font-bold";
          parent.appendChild(span);
        }
      }}
    />
  );
}
