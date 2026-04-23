import { Expense, Mode, AppSettings } from "@/types/expense";

const KEYS = {
  personal: "personal_expenses",
  business: "business_expenses",
  settings: "app_settings",
  mode: "current_mode",
};

export function loadExpenses(mode: Mode): Expense[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEYS[mode]);
    return raw ? (JSON.parse(raw) as Expense[]) : [];
  } catch {
    return [];
  }
}

export function saveExpenses(mode: Mode, expenses: Expense[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEYS[mode], JSON.stringify(expenses));
}

export function loadSettings(): AppSettings {
  if (typeof window === "undefined") return { monthlyIncome: 0, businessName: "" };
  try {
    const raw = localStorage.getItem(KEYS.settings);
    return raw ? (JSON.parse(raw) as AppSettings) : { monthlyIncome: 0, businessName: "" };
  } catch {
    return { monthlyIncome: 0, businessName: "" };
  }
}

export function saveSettings(settings: AppSettings): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEYS.settings, JSON.stringify(settings));
}

export function loadMode(): Mode {
  if (typeof window === "undefined") return "personal";
  return (localStorage.getItem(KEYS.mode) as Mode) ?? "personal";
}

export function saveMode(mode: Mode): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEYS.mode, mode);
}
