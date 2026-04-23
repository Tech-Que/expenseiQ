"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Mode } from "@/types/expense";
import { loadMode, saveMode } from "@/lib/storage";

export interface Theme {
  primary: string;
  primaryBg: string;
  primaryHover: string;
  primaryText: string;
  primaryLight: string;
  primaryBorder: string;
  primaryRing: string;
  activeTab: string;
  badge: string;
  modeLabel: string;
  barColor: string;
}

export const THEMES: Record<Mode, Theme> = {
  personal: {
    primary: "#6366f1",
    primaryBg: "bg-indigo-600",
    primaryHover: "hover:bg-indigo-700",
    primaryText: "text-indigo-600",
    primaryLight: "bg-indigo-50",
    primaryBorder: "border-indigo-200",
    primaryRing: "focus:ring-indigo-400",
    activeTab: "bg-indigo-50 text-indigo-700",
    badge: "bg-indigo-100 text-indigo-700",
    modeLabel: "Personal",
    barColor: "#6366f1",
  },
  business: {
    primary: "#10b981",
    primaryBg: "bg-emerald-600",
    primaryHover: "hover:bg-emerald-700",
    primaryText: "text-emerald-600",
    primaryLight: "bg-emerald-50",
    primaryBorder: "border-emerald-200",
    primaryRing: "focus:ring-emerald-400",
    activeTab: "bg-emerald-50 text-emerald-700",
    badge: "bg-emerald-100 text-emerald-700",
    modeLabel: "Business",
    barColor: "#10b981",
  },
};

interface ModeContextValue {
  mode: Mode;
  setMode: (mode: Mode) => void;
  theme: Theme;
}

const ModeContext = createContext<ModeContextValue>({
  mode: "personal",
  setMode: () => {},
  theme: THEMES.personal,
});

export function ModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<Mode>("personal");

  useEffect(() => {
    setModeState(loadMode());
  }, []);

  function setMode(newMode: Mode) {
    setModeState(newMode);
    saveMode(newMode);
  }

  return (
    <ModeContext.Provider value={{ mode, setMode, theme: THEMES[mode] }}>
      {children}
    </ModeContext.Provider>
  );
}

export function useMode() {
  return useContext(ModeContext);
}
