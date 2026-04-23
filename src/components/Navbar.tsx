"use client";

import { Wallet, User, Briefcase, Upload, Images, LogOut } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { useMode } from "@/context/ModeContext";
import { Mode } from "@/types/expense";

export type AppTab = "overview" | "dashboard" | "expenses";

interface Props {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  onImport: () => void;
  onGallery: () => void;
}

export default function Navbar({ activeTab, onTabChange, onImport, onGallery }: Props) {
  const { mode, setMode, theme } = useMode();
  const { data: session } = useSession();

  function handleModeToggle(newMode: Mode) {
    if (newMode !== mode) {
      setMode(newMode);
      if (activeTab !== "overview") onTabChange("dashboard");
    }
  }

  const displayName =
    session?.user?.name ||
    session?.user?.email?.split("@")[0] ||
    "";
  const initial = displayName ? displayName.charAt(0).toUpperCase() : "?";

  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
        {/* Logo */}
        <div className="flex items-center gap-2 shrink-0">
          <div className={`w-8 h-8 ${theme.primaryBg} rounded-xl flex items-center justify-center transition-colors duration-300`}>
            <Wallet size={16} className="text-white" />
          </div>
          <span className="font-bold text-gray-900 text-base hidden sm:block">ExpenseIQ</span>
        </div>

        {/* Mode Toggle */}
        <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-0.5">
          <button
            onClick={() => handleModeToggle("personal")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
              mode === "personal"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <User size={12} />
            <span>Personal</span>
          </button>
          <button
            onClick={() => handleModeToggle("business")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
              mode === "business"
                ? "bg-white text-emerald-700 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Briefcase size={12} />
            <span>Business</span>
          </button>
        </div>

        {/* Quick actions + tabs + account */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={onImport}
            title="Import bank statement"
            aria-label="Import bank statement"
            className="flex items-center gap-1 px-2 py-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-50 rounded-lg text-xs font-medium transition"
          >
            <Upload size={13} />
            <span className="hidden md:inline">Import</span>
          </button>
          <button
            onClick={onGallery}
            title="Receipt cabinet"
            aria-label="Receipt cabinet"
            className="flex items-center gap-1 px-2 py-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-50 rounded-lg text-xs font-medium transition"
          >
            <Images size={13} />
            <span className="hidden md:inline">Receipts</span>
          </button>

          <div className="w-px h-5 bg-gray-200 mx-1.5" />

          {/* Tab Navigation */}
          <nav className="flex items-center gap-0.5">
            {(["overview", "dashboard", "expenses"] as AppTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => onTabChange(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all duration-200 ${
                  activeTab === tab
                    ? theme.activeTab
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>

          {/* Account */}
          {session?.user && (
            <>
              <div className="w-px h-5 bg-gray-200 mx-1.5" />
              <div className="flex items-center gap-2 px-1">
                <div
                  className={`w-7 h-7 rounded-full ${theme.primaryBg} text-white flex items-center justify-center text-xs font-semibold`}
                  title={displayName}
                >
                  {initial}
                </div>
                <span className="text-xs font-medium text-gray-700 hidden lg:block max-w-[120px] truncate">
                  {displayName}
                </span>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  title="Sign out"
                  aria-label="Sign out"
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
                >
                  <LogOut size={14} />
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Mode indicator bar */}
      <div
        className="h-0.5 transition-colors duration-300"
        style={{ backgroundColor: theme.primary }}
      />
    </header>
  );
}
