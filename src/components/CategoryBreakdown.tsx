"use client";

import { Expense } from "@/types/expense";
import {
  getCategories,
  getCategoryColor,
  getCategoryBg,
  getSpendingByCategory,
  getTotalSpending,
  formatCurrency,
} from "@/lib/utils";
import { useMode } from "@/context/ModeContext";

interface Props {
  expenses: Expense[];
}

// Placeholder data shown when there are no real expenses yet.
const SAMPLE_BREAKDOWN = [
  { cat: "Food", amount: 420, pct: 32, color: "#fed7aa", bg: "bg-orange-100 text-orange-700" },
  { cat: "Shopping", amount: 310, pct: 24, color: "#fbcfe8", bg: "bg-pink-100 text-pink-700" },
  { cat: "Bills", amount: 280, pct: 21, color: "#fecaca", bg: "bg-red-100 text-red-700" },
  { cat: "Transportation", amount: 180, pct: 14, color: "#bfdbfe", bg: "bg-blue-100 text-blue-700" },
  { cat: "Other", amount: 120, pct: 9, color: "#e5e7eb", bg: "bg-gray-100 text-gray-700" },
];

export default function CategoryBreakdown({ expenses }: Props) {
  const { mode } = useMode();
  const categories = getCategories(mode);
  const byCategory = getSpendingByCategory(expenses);
  const total = getTotalSpending(expenses);

  const sorted = categories
    .filter((c) => (byCategory[c] ?? 0) > 0)
    .sort((a, b) => (byCategory[b] ?? 0) - (byCategory[a] ?? 0));

  const isEmpty = sorted.length === 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700">Category Breakdown</h3>
        {isEmpty && (
          <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-400 rounded-full">
            Sample preview
          </span>
        )}
      </div>

      {isEmpty ? (
        <>
          <div className="space-y-3 opacity-50 pointer-events-none">
            {SAMPLE_BREAKDOWN.map((s) => (
              <div key={s.cat}>
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.bg}`}>
                    {s.cat}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{s.pct.toFixed(1)}%</span>
                    <span className="text-sm font-semibold text-gray-900 tabular-nums">
                      {formatCurrency(s.amount)}
                    </span>
                  </div>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${s.pct}%`, backgroundColor: s.color }}
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-gray-400 mt-4">
            Add your first expense to see a real breakdown
          </p>
        </>
      ) : (
        <div className="space-y-3">
          {sorted.map((cat) => {
            const amount = byCategory[cat] ?? 0;
            const pct = total > 0 ? (amount / total) * 100 : 0;
            return (
              <div key={cat}>
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getCategoryBg(cat)}`}>
                    {cat}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{pct.toFixed(1)}%</span>
                    <span className="text-sm font-semibold text-gray-900 tabular-nums">
                      {formatCurrency(amount)}
                    </span>
                  </div>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: getCategoryColor(cat) }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
