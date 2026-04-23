"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Expense } from "@/types/expense";
import {
  formatCurrency,
  getTopCategories,
  getYearlyTotals,
  getSpendingVelocity,
  getQuarterlyTrend,
  getCategoryColor,
  getCategoryBg,
} from "@/lib/utils";
import { useMode } from "@/context/ModeContext";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface Props {
  expenses: Expense[];
  monthlyBudget?: number; // monthly income, used for velocity gauge
}

interface TooltipProps {
  active?: boolean;
  payload?: { value: number; payload: { fill?: string } }[];
  label?: string;
}

function CurrencyTip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-lg text-sm">
      <p className="font-semibold text-gray-700">{label}</p>
      <p className="text-indigo-600">{formatCurrency(payload[0].value)}</p>
    </div>
  );
}

// Sample data shown when expenses array is empty
const SAMPLE_QUARTERLY = [
  { quarter: "Q1", total: 2400 },
  { quarter: "Q2", total: 3100 },
  { quarter: "Q3", total: 2750 },
  { quarter: "Q4", total: 3800 },
];
const SAMPLE_YEARLY = [
  { year: "2023", total: 11200 },
  { year: "2024", total: 13400 },
  { year: "2025", total: 8600 },
];

export default function SpendingInsights({ expenses, monthlyBudget = 0 }: Props) {
  const { theme } = useMode();
  const isEmpty = expenses.length === 0;

  const topCats = isEmpty ? [] : getTopCategories(expenses, 5);
  const yearly = isEmpty ? SAMPLE_YEARLY : getYearlyTotals(expenses);
  const quarterly = isEmpty ? SAMPLE_QUARTERLY : getQuarterlyTrend(expenses);
  const velocity = isEmpty ? null : getSpendingVelocity(expenses);

  const showYoY = yearly.length >= 2;

  return (
    <div className="space-y-6">
      {/* Top 5 Categories */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Top Spending Categories</h3>
        {isEmpty ? (
          <div className="text-center py-6 space-y-1">
            <p className="text-sm text-gray-400">No expenses yet</p>
            <p className="text-xs text-gray-300">Your top 5 categories with % of spend will appear here</p>
          </div>
        ) : topCats.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">No data</p>
        ) : (
          <div className="space-y-3">
            {topCats.map(({ category, amount, pct }, i) => (
              <div key={category}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-400 w-4">{i + 1}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getCategoryBg(category)}`}>
                      {category}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400">{pct.toFixed(1)}%</span>
                    <span className="text-sm font-semibold text-gray-900 tabular-nums">
                      {formatCurrency(amount)}
                    </span>
                  </div>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden ml-6">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, backgroundColor: getCategoryColor(category) }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Spending Velocity */}
      {(velocity || isEmpty) && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Spending Velocity</h3>
          {isEmpty ? (
            <div className="text-center py-4 space-y-1">
              <p className="text-sm text-gray-400">Add expenses to see your monthly spending pace</p>
              <p className="text-xs text-gray-300">Shows whether you&apos;re on track based on your daily average</p>
            </div>
          ) : velocity && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-1">Spent so far</p>
                  <p className="text-base font-bold text-gray-900">{formatCurrency(velocity.currentMonthSpent)}</p>
                  <p className="text-xs text-gray-400">{velocity.daysElapsed} of {velocity.daysInMonth} days</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-1">Daily avg</p>
                  <p className="text-base font-bold text-gray-900">
                    {formatCurrency(velocity.daysElapsed > 0 ? velocity.currentMonthSpent / velocity.daysElapsed : 0)}
                  </p>
                  <p className="text-xs text-gray-400">per day</p>
                </div>
                <div className={`rounded-xl p-3 ${
                  monthlyBudget > 0 && velocity.projectedMonthly > monthlyBudget
                    ? "bg-red-50"
                    : "bg-emerald-50"
                }`}>
                  <p className="text-xs text-gray-500 mb-1">Projected</p>
                  <p className={`text-base font-bold ${
                    monthlyBudget > 0 && velocity.projectedMonthly > monthlyBudget
                      ? "text-red-600"
                      : "text-emerald-700"
                  }`}>
                    {formatCurrency(velocity.projectedMonthly)}
                  </p>
                  <p className="text-xs text-gray-400">this month</p>
                </div>
              </div>

              {/* Progress bar */}
              <div>
                <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                  <span>Month progress</span>
                  <span>{((velocity.daysElapsed / velocity.daysInMonth) * 100).toFixed(0)}% of month elapsed</span>
                </div>
                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden relative">
                  {/* Spending bar */}
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min((velocity.currentMonthSpent / Math.max(velocity.projectedMonthly, 1)) * (velocity.daysElapsed / velocity.daysInMonth) * 100, 100)}%`,
                      backgroundColor: theme.barColor,
                    }}
                  />
                </div>
                {monthlyBudget > 0 && (
                  <div className="flex items-center gap-1.5 mt-2">
                    {velocity.projectedMonthly > monthlyBudget ? (
                      <>
                        <TrendingDown size={13} className="text-red-500" />
                        <p className="text-xs text-red-600">
                          On track to exceed budget by {formatCurrency(velocity.projectedMonthly - monthlyBudget)}
                        </p>
                      </>
                    ) : velocity.projectedMonthly > monthlyBudget * 0.85 ? (
                      <>
                        <Minus size={13} className="text-amber-500" />
                        <p className="text-xs text-amber-600">
                          Approaching budget — {formatCurrency(monthlyBudget - velocity.projectedMonthly)} remaining
                        </p>
                      </>
                    ) : (
                      <>
                        <TrendingUp size={13} className="text-emerald-500" />
                        <p className="text-xs text-emerald-600">
                          On track — projected {formatCurrency(velocity.projectedMonthly)} vs {formatCurrency(monthlyBudget)} budget
                        </p>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quarterly Trend */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-700">
            Quarterly Trend — {new Date().getFullYear()}
          </h3>
          {isEmpty && (
            <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-400 rounded-full">Sample preview</span>
          )}
        </div>
        <ResponsiveContainer width="100%" height={190}>
          <BarChart data={quarterly} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis dataKey="quarter" tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
            <Tooltip content={<CurrencyTip />} />
            <Bar dataKey="total" radius={[6, 6, 0, 0]} opacity={isEmpty ? 0.25 : 1}>
              {quarterly.map((_, i) => (
                <Cell key={i} fill={theme.barColor} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Year-over-Year */}
      {(showYoY || isEmpty) && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700">Year-over-Year</h3>
            {isEmpty && (
              <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-400 rounded-full">Sample preview</span>
            )}
            {!isEmpty && !showYoY && (
              <span className="text-xs text-gray-400">Add data from multiple years to compare</span>
            )}
          </div>
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={yearly} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="year" tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v / 1000}k`} />
              <Tooltip content={<CurrencyTip />} />
              <Bar dataKey="total" radius={[6, 6, 0, 0]} opacity={isEmpty ? 0.25 : 1}>
                {yearly.map((_, i) => (
                  <Cell key={i} fill={theme.barColor} opacity={isEmpty ? 0.6 : 1 - i * 0.15} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
