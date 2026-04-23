"use client";

import { ModeProvider } from "@/context/ModeContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return <ModeProvider>{children}</ModeProvider>;
}
