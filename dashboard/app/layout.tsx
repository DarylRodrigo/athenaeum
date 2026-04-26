"use client";

import { Spectral, Inter, JetBrains_Mono } from "next/font/google";
import { useState, useEffect, createContext, useCallback } from "react";
import { usePathname } from "next/navigation";
import "./globals.css";
import "./overrides.css";
import "./focus.css";
import { Sidebar } from "@/components/shell/Sidebar";
import { Topbar } from "@/components/shell/Topbar";
import { CommandPalette } from "@/components/shell/CommandPalette";
import { TweaksPanel } from "@/components/tweaks/TweaksPanel";
import { applyTheme } from "@/lib/theme";
import { apiFetch } from "@/lib/api";
import type { Space } from "@/lib/types";

const spectral = Spectral({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-spectral",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains-mono",
});

// Command palette context
export const CmdKContext = createContext<{ open: () => void }>({ open: () => {} });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isFocusMode = pathname === "/thinking/focus";

  const [cmdOpen, setCmdOpen] = useState(false);
  const [tweaks, setTweaks] = useState({
    aesthetic: "warm",
    density: "balanced",
    accent: "oxblood",
  });
  const [counts, setCounts] = useState({ inbox: 0, thinking: 0, wiki: 0, project: 0 });
  const [spaces, setSpaces] = useState<Space[]>([]);

  const setTweak = useCallback((key: string, value: string) => {
    setTweaks(prev => ({ ...prev, [key]: value }));
  }, []);

  // Apply theme
  useEffect(() => {
    applyTheme(tweaks, isFocusMode);
  }, [tweaks, isFocusMode]);

  // Cmd+K listener
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdOpen(o => !o);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Fetch status and spaces
  useEffect(() => {
    apiFetch<{ counts: typeof counts }>("/status")
      .then(data => setCounts(data.counts))
      .catch(() => {
        // Fallback counts
        setCounts({ inbox: 4, thinking: 7, wiki: 3, project: 1 });
      });
    apiFetch<Space[]>("/spaces")
      .then(setSpaces)
      .catch(() => {
        setSpaces([
          { id: "ai-research", label: "AI Research", accent: "oklch(0.62 0.13 28)" },
          { id: "economics", label: "Economics", accent: "oklch(0.55 0.10 145)" },
          { id: "philosophy", label: "Philosophy", accent: "oklch(0.50 0.11 270)" },
        ]);
      });
  }, []);

  // Page label for topbar
  const pageLabel = pathname.startsWith("/thinking/focus") ? "02b Thinking Space \u2014 Focus"
    : pathname.startsWith("/thinking") ? "02 Thinking Space"
    : pathname.startsWith("/wiki") ? "03 Wiki"
    : pathname.startsWith("/project") ? "04 Project"
    : "01 Inbox";

  const where = pathname.startsWith("/thinking/focus") ? "Focus mode \u00b7 editing thought"
    : pathname.startsWith("/thinking") ? "Cross-space view"
    : pathname.startsWith("/wiki") ? "Concepts"
    : pathname.startsWith("/project") ? "Mechanism Spec"
    : null;

  return (
    <html lang="en" className={`${spectral.variable} ${inter.variable} ${jetbrainsMono.variable}`}>
      <body data-aesthetic="warm" data-density="balanced" data-focus="0">
        <CmdKContext.Provider value={{ open: () => setCmdOpen(true) }}>
          <div className="app">
            <Sidebar
              counts={counts}
              spaces={spaces}
              pathname={pathname}
            />
            <main className="main" data-screen-label={pageLabel}>
              <Topbar page={pageLabel} where={where} />
              {children}
            </main>
          </div>
          <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
          <TweaksPanel tweaks={tweaks} setTweak={setTweak} />
        </CmdKContext.Provider>
      </body>
    </html>
  );
}
