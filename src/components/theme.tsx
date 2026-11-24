import type { CSSProperties, ReactNode } from "react";
import type { ShopTheme } from "@/db/schema";

export function themeStyle(t: ShopTheme): CSSProperties {
  return {
    "--c-primary": t.primary, "--c-accent": t.accent, "--c-bg": t.bg,
    "--c-surface": t.surface, "--c-text": t.text,
    "--font-display-active": t.font === "classic" ? "var(--font-classic)" : "var(--font-modern)",
  } as CSSProperties;
}

export function ThemeScope({ theme, children }: { theme: ShopTheme; children: ReactNode }) {
  return <div style={themeStyle(theme)} className="min-h-dvh bg-paper text-ink">{children}</div>;
}
