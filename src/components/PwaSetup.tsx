"use client";

import { useEffect } from "react";

export function PwaSetup() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // SW registration is a progressive enhancement — failure is silent
      });
    }
  }, []);
  return null;
}
