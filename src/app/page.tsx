"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Expense, AppSettings } from "@/types/expense";
import { useExpenses } from "@/hooks/useExpenses";
import { useMode } from "@/context/ModeContext";
import { exportToCSV } from "@/lib/utils";
import { loadSettings, saveSettings } from "@/lib/storage";
import Navbar, { AppTab } from "@/components/Navbar";
import SummaryCards from "@/components/SummaryCards";
import Charts from "@/components/Charts";
import CategoryBreakdown from "@/components/CategoryBreakdown";
import SpendingInsights from "@/components/SpendingInsights";
import ExpenseList from "@/components/ExpenseList";
import ExpenseForm from "@/components/ExpenseForm";
import OverviewDashboard from "@/components/OverviewDashboard";
import TaxReport from "@/components/TaxReport";
import ImportWizard from "@/components/ImportWizard";
import ReceiptGallery from "@/components/ReceiptGallery";
import { Plus, Download, FileText, AlertTriangle, X } from "lucide-react";

export default function Home() {
  const { mode, theme } = useMode();
  const { data: session, status } = useSession();
  const router = useRouter();

  const userId = session?.user?.id;

  const personal = useExpenses(userId, "personal");
  const business = useExpenses(userId, "business");

  const activeHook = mode === "personal" ? personal : business;
  const { expenses, addExpense, updateExpense, deleteExpense, bulkAddExpenses } = activeHook;

  const [tab, setTab] = useState<AppTab>("dashboard");
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [showTaxReport, setShowTaxReport] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [settings, setSettings] = useState<AppSettings>({ monthlyIncome: 0, businessName: "" });

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  // Belt-and-braces redirect: the middleware already gates this route, but if a
  // client-side session becomes unauthenticated mid-use (logout, token expiry)
  // we push the user to /login rather than leaving them in a broken state.
  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  function handleSettingsChange(s: AppSettings) {
    setSettings(s);
    saveSettings(s);
  }

  function openAdd() {
    setEditingExpense(null);
    setShowForm(true);
  }

  function openEdit(expense: Expense) {
    setEditingExpense(expense);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingExpense(null);
  }

  function handleFormSubmit(input: Parameters<typeof addExpense>[0]) {
    if (editingExpense) updateExpense(editingExpense.id, input);
    else addExpense(input);
    closeForm();
  }

  const bothHydrated = personal.hydrated && business.hydrated;
  const storageError = activeHook.storageError ?? personal.storageError ?? business.storageError;

  function dismissStorageError() {
    personal.dismissStorageError();
    business.dismissStorageError();
  }

  if (status === "loading" || !bothHydrated || !userId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: `${theme.primary}40`, borderTopColor: theme.primary }}
          />
          <p className="text-sm text-gray-400">Loading your data…</p>
        </div>
      </div>
    );
  }

  const pageTitle: Record<AppTab, string> = {
    overview: "Overview",
    dashboard: mode === "personal" ? "Personal Dashboard" : "Business Dashboard",
    expenses: mode === "personal" ? "Personal Expenses" : "Business Expenses",
  };

  const pageSubtitle: Record<AppTab, string> = {
    overview: "All accounts — personal & business",
    dashboard: "Spending summary & analytics",
    expenses: `${expenses.length} total transactions`,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar
        activeTab={tab}
        onTabChange={setTab}
        onImport={() => setShowImport(true)}
        onGallery={() => setShowGallery(true)}
      />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Storage error banner */}
        {storageError && (
          <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-xl">
            <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-red-800">Storage issue</p>
              <p className="text-xs text-red-700 mt-0.5">{storageError}</p>
            </div>
            <button
              onClick={dismissStorageError}
              className="text-red-400 hover:text-red-600 transition shrink-0"
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Action bar */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{pageTitle[tab]}</h1>
            <p className="text-sm text-gray-400">{pageSubtitle[tab]}</p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {tab === "expenses" && mode === "business" && (
              <button
                onClick={() => setShowTaxReport(true)}
                className="flex items-center gap-1.5 px-3 py-2 border border-emerald-200 text-emerald-700 bg-emerald-50 rounded-lg text-sm font-medium hover:bg-emerald-100 transition"
              >
                <FileText size={14} />
                <span className="hidden sm:inline">Tax Report</span>
              </button>
            )}

            {tab === "expenses" && expenses.length > 0 && (
              <button
                onClick={() => exportToCSV(expenses, mode)}
                className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
              >
                <Download size={14} />
                <span className="hidden sm:inline">Export CSV</span>
              </button>
            )}

            {tab !== "overview" && (
              <button
                onClick={openAdd}
                className={`flex items-center gap-1.5 px-4 py-2 ${theme.primaryBg} ${theme.primaryHover} text-white rounded-lg text-sm font-medium transition shadow-sm`}
              >
                <Plus size={15} />
                Add Expense
              </button>
            )}
          </div>
        </div>

        {tab === "overview" && (
          <OverviewDashboard
            personalExpenses={personal.expenses}
            businessExpenses={business.expenses}
            settings={settings}
            onSettingsChange={handleSettingsChange}
          />
        )}

        {tab === "dashboard" && (
          <>
            <SummaryCards expenses={expenses} />
            <Charts expenses={expenses} />
            <CategoryBreakdown expenses={expenses} />
            <SpendingInsights expenses={expenses} monthlyBudget={settings.monthlyIncome} />
          </>
        )}

        {tab === "expenses" && (
          <ExpenseList expenses={expenses} onEdit={openEdit} onDelete={deleteExpense} />
        )}
      </main>

      {showForm && (
        <ExpenseForm
          onSubmit={handleFormSubmit}
          onCancel={closeForm}
          editingExpense={editingExpense}
        />
      )}

      {showTaxReport && (
        <TaxReport expenses={business.expenses} onClose={() => setShowTaxReport(false)} />
      )}

      {showImport && (
        <ImportWizard
          existingExpenses={expenses}
          onBulkImport={bulkAddExpenses}
          onClose={() => setShowImport(false)}
        />
      )}

      {showGallery && (
        <ReceiptGallery expenses={expenses} onClose={() => setShowGallery(false)} />
      )}
    </div>
  );
}
