"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "./theme-provider";

export function ThemeToggle({
  toDark = "Noche",
  toLight = "Día",
}: {
  toDark?: string;
  toLight?: string;
}) {
  const { theme, setTheme } = useTheme();
  const dark = theme === "dark";

  return (
    <div
      role="group"
      aria-label="Modo de color"
      className="inline-flex h-11 shrink-0 items-center rounded-full border border-border bg-card p-1"
    >
      <button
        type="button"
        onClick={() => setTheme("light")}
        aria-pressed={!dark}
        aria-label={toLight}
        title={toLight}
        className={`inline-flex h-9 items-center gap-1.5 rounded-full px-2.5 font-mono text-[10px] font-semibold tracking-[0.12em] ${
          dark ? "text-muted-foreground" : "bg-foreground text-background"
        }`}
      >
        <Sun className="size-3.5" aria-hidden="true" />
        <span className="hidden sm:inline">{toLight}</span>
      </button>
      <button
        type="button"
        onClick={() => setTheme("dark")}
        aria-pressed={dark}
        aria-label={toDark}
        title={toDark}
        className={`inline-flex h-9 items-center gap-1.5 rounded-full px-2.5 font-mono text-[10px] font-semibold tracking-[0.12em] ${
          dark ? "bg-foreground text-background" : "text-muted-foreground"
        }`}
      >
        <Moon className="size-3.5" aria-hidden="true" />
        <span className="hidden sm:inline">{toDark}</span>
      </button>
    </div>
  );
}
