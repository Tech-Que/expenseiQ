"use client";

import { useState } from "react";
import { Expense } from "@/types/expense";
import { printTaxReport, formatCurrency, getTotalSpending } from "@/lib/utils";
import { X, FileText, Printer, ShieldCheck } from "lucide-react";

interface Props {
  expenses: Expense[];
  onClose: () => void;
}

const CURRENT_YEAR = new Date().getFullYear();
const TAX_YEARS = [CURRENT_YEAR - 2, CURRENT_YEAR - 1, CURRENT_YEAR];

export default function TaxReport({ expenses, onClose }: Props) {
  const [businessName, setBusinessName] = useState("");
  const [taxYear, setTaxYear] = useState(CURRENT_YEAR);

  const yearExpenses = expenses.filter((e) => e.date.startsWith(String(taxYear)));
  const grandTotal = getTotalSpending(yearExpenses);
  const deductibleTotal = yearExpenses
    .filter((e) => e.taxDeductible)
    .reduce((s, e) => s + e.amount, 0);

  // Group by category for preview
  const grouped = new Map<string, number>();
  yearExpenses.forEach((e) => {
    grouped.set(e.category, (grouped.get(e.category) ?? 0) + e.amount);
  });
  const categoryList = Array.from(grouped.entries()).sort((a, b) => b[1] - a[1]);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-emerald-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center">
              <FileText size={16} className="text-emerald-600" />
            </div>
            <h2 className="text-base font-semibold text-gray-900">Tax Report Generator</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Config */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tax Year</label>
              <select
                value={taxYear}
                onChange={(e) => setTaxYear(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              >
                {TAX_YEARS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Business Name <span className="text-gray-400">(optional)</span>
              </label>
              <input
                type="text"
                placeholder="Your Business Name"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
          </div>

          {/* Preview summary */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Report Preview — {taxYear}
            </h3>

            {yearExpenses.length === 0 ? (
              <p className="text-sm text-gray-400">No expenses recorded for {taxYear}.</p>
            ) : (
              <>
                {/* Category list */}
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {categoryList.map(([cat, amount]) => (
                    <div key={cat} className="flex items-center justify-between">
                      <span className="text-xs text-gray-600 truncate">{cat}</span>
                      <span className="text-xs font-semibold tabular-nums text-gray-800 ml-2">
                        {formatCurrency(amount)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-gray-200 pt-3 space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total Expenses</span>
                    <span className="font-bold tabular-nums">{formatCurrency(grandTotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-1 text-teal-600">
                      <ShieldCheck size={12} /> Tax Deductible
                    </span>
                    <span className="font-semibold tabular-nums text-teal-700">
                      {formatCurrency(deductibleTotal)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>{yearExpenses.length} transactions</span>
                    <span>
                      {grandTotal > 0
                        ? ((deductibleTotal / grandTotal) * 100).toFixed(0)
                        : 0}
                      % deductible
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>

          <p className="text-xs text-gray-400">
            The report will open in a new browser tab. Use your browser&apos;s print dialog
            to save as PDF or send to your printer / tax preparer.
          </p>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={() => printTaxReport(expenses, businessName, taxYear)}
              disabled={yearExpenses.length === 0}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition"
            >
              <Printer size={15} /> Generate Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
