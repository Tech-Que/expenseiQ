"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Expense, AppSettings } from "@/types/expense";
import {
  formatCurrency,
  getTotalSpending,
  getMonthlySpending,
  getCombinedMonthlyTrend,
  getQuarterlyBreakdown,
} from "@/lib/utils";
import { User, Briefcase, DollarSign, TrendingDown, Pencil, Check } from "lucide-react";

interface Props {
  personalExpenses: Expense[];
  businessExpenses: Expense[];
  settings: AppSettings;
  onSettingsChange: (s: AppSettings) => void;
}

interface TooltipProps {
  active?: boolean;
  payload?: { value: number; name: string; color: string; dataKey: string }[];
  label?: string;
}

const PERSONAL_COLOR = "#6366f1";
const BUSINESS_COLOR = "#10b981";

function DualTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-lg text-sm space-y-1">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-gray-600 capitalize">{p.name}:</span>
          <span className="font-semibold" style={{ color: p.color }}>
            {formatCurrency(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function OverviewDashboard({ personalExpenses, businessExpenses, settings, onSettingsChange }: Props) {
  const currentYear = new Date().getFullYear();
  const [editingIncome, setEditingIncome] = useState(false);
  const [incomeStr, setIncomeStr] = useState(String(settings.monthlyIncome || ""));

  const personalTotal = getTotalSpending(personalExpenses);
  const businessTotal = getTotalSpending(businessExpenses);
  const combined = personalTotal + businessTotal;

  const personalMonthly = getMonthlySpending(personalExpenses);
  const businessMonthly = getMonthlySpending(businessExpenses);
  const combinedMonthly = personalMonthly + businessMonthly;

  const monthlyTrend = getCombinedMonthlyTrend(personalExpenses, businessExpenses, 6);
  const quarterlyData = getQuarterlyBreakdown(personalExpenses, businessExpenses, currentYear);

  const income = settings.monthlyIncome;
  const savingsRate = income > 0 ? Math.max(0, ((income - combinedMonthly) / income) * 100) : null;
  const spendingPct = income > 0 ? Math.min(100, (combinedMonthly / income) * 100) : 0;

  const ratioPieData = [
    { name: "Personal", value: personalTotal, fill: PERSONAL_COLOR },
    { name: "Business", value: businessTotal, fill: BUSINESS_COLOR },
  ].filter((d) => d.value > 0);

  function saveIncome() {
    const val = parseFloat(incomeStr);
    if (!isNaN(val) && val >= 0) {
      onSettingsChange({ ...settings, monthlyIncome: val });
    }
    setEditingIncome(false);
  }

  return (
    <div className="space-y-6">
      {/* Side-by-side totals */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Personal */}
        <div className="bg-white rounded-2xl border border-indigo-100 p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <User size={13} className="text-indigo-500" />
                <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">Personal</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(personalTotal)}</p>
              <p className="text-xs text-gray-400 mt-0.5">{personalExpenses.length} transactions</p>
            </div>
            <div className="w-8 h-8 bg-indigo-100 rounded-xl flex items-center justify-center">
              <DollarSign size={16} className="text-indigo-600" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">This month: <span className="font-semibold text-gray-700">{formatCurrency(personalMonthly)}</span></p>
          </div>
        </div>

        {/* Business */}
        <div className="bg-white rounded-2xl border border-emerald-100 p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Briefcase size={13} className="text-emerald-500" />
                <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">Business</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(businessTotal)}</p>
              <p className="text-xs text-gray-400 mt-0.5">{businessExpenses.length} transactions</p>
            </div>
            <div className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center">
              <DollarSign size={16} className="text-emerald-600" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">This month: <span className="font-semibold text-gray-700">{formatCurrency(businessMonthly)}</span></p>
          </div>
        </div>

        {/* Combined */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Combined Total</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(combined)}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {personalExpenses.length + businessExpenses.length} total transactions
              </p>
            </div>
            <div className="w-8 h-8 bg-gray-100 rounded-xl flex items-center justify-center">
              <TrendingDown size={16} className="text-gray-500" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">This month: <span className="font-semibold text-gray-700">{formatCurrency(combinedMonthly)}</span></p>
          </div>
        </div>
      </div>

      {/* Combined monthly trend + Ratio donut */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Combined Monthly Trend</h3>
          {monthlyTrend.some((m) => m.personal + m.business > 0) ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyTrend} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip content={<DualTooltip />} />
                <Bar dataKey="personal" name="Personal" stackId="a" fill={PERSONAL_COLOR} radius={[0, 0, 0, 0]} />
                <Bar dataKey="business" name="Business" stackId="a" fill={BUSINESS_COLOR} radius={[6, 6, 0, 0]} />
                <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs text-gray-600 capitalize">{v}</span>} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-sm text-gray-400">
              Add expenses in either mode to see trends
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Personal vs Business Split</h3>
          {ratioPieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={ratioPieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value">
                  {ratioPieData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) =>
                    typeof value === "number" ? formatCurrency(value) : value
                  }
                />
                <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs text-gray-600">{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-sm text-gray-400">
              Add expenses to see the split
            </div>
          )}
        </div>
      </div>

      {/* Quarterly breakdown */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Quarterly Breakdown — {currentYear}</h3>
        {quarterlyData.some((q) => q.personal + q.business > 0) ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={quarterlyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="quarter" tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
              <Tooltip content={<DualTooltip />} />
              <Bar dataKey="personal" name="Personal" fill={PERSONAL_COLOR} radius={[4, 4, 0, 0]} />
              <Bar dataKey="business" name="Business" fill={BUSINESS_COLOR} radius={[4, 4, 0, 0]} />
              <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs text-gray-600 capitalize">{v}</span>} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[200px] flex items-center justify-center text-sm text-gray-400">
            Add expenses for {currentYear} to see quarterly data
          </div>
        )}
      </div>

      {/* Financial Health */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-700">Financial Health</h3>
          <span className="text-xs text-gray-400">Current month</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
          {/* Income */}
          <div className="p-4 bg-green-50 rounded-xl">
            <p className="text-xs font-medium text-green-600 uppercase tracking-wide mb-1">Monthly Income</p>
            {editingIncome ? (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-gray-600">$</span>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={incomeStr}
                  onChange={(e) => setIncomeStr(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveIncome()}
                  autoFocus
                  className="w-full text-lg font-bold text-gray-900 bg-transparent border-b border-green-400 focus:outline-none"
                />
                <button onClick={saveIncome} className="text-green-600 hover:text-green-800 transition shrink-0">
                  <Check size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-1">
                <p className="text-xl font-bold text-gray-900">
                  {income > 0 ? formatCurrency(income) : "—"}
                </p>
                <button
                  onClick={() => { setIncomeStr(String(income || "")); setEditingIncome(true); }}
                  className="text-gray-400 hover:text-gray-600 transition"
                >
                  <Pencil size={13} />
                </button>
              </div>
            )}
            {income === 0 && !editingIncome && (
              <p className="text-xs text-green-600 mt-1">Click ✏ to set income</p>
            )}
          </div>

          {/* Monthly spending */}
          <div className="p-4 bg-rose-50 rounded-xl">
            <p className="text-xs font-medium text-rose-600 uppercase tracking-wide mb-1">Monthly Spending</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(combinedMonthly)}</p>
            <p className="text-xs text-rose-500 mt-1">
              Personal {formatCurrency(personalMonthly)} + Business {formatCurrency(businessMonthly)}
            </p>
          </div>

          {/* Savings */}
          <div className="p-4 bg-blue-50 rounded-xl">
            <p className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-1">Est. Monthly Savings</p>
            {income > 0 ? (
              <>
                <p className={`text-xl font-bold mt-1 ${income - combinedMonthly >= 0 ? "text-gray-900" : "text-red-600"}`}>
                  {formatCurrency(Math.max(0, income - combinedMonthly))}
                </p>
                <p className="text-xs text-blue-500 mt-1">
                  {savingsRate !== null ? `${savingsRate.toFixed(0)}% savings rate` : ""}
                </p>
              </>
            ) : (
              <p className="text-gray-400 text-sm mt-1">Set income to calculate</p>
            )}
          </div>
        </div>

        {/* Spending bar */}
        {income > 0 && (
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1.5">
              <span>Spending vs Income</span>
              <span>{spendingPct.toFixed(0)}% of {formatCurrency(income)}</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(spendingPct, 100)}%`,
                  backgroundColor: spendingPct > 90 ? "#ef4444" : spendingPct > 70 ? "#f97316" : "#10b981",
                }}
              />
            </div>
            <div className="flex justify-between text-xs mt-1">
              <span className="text-gray-400">$0</span>
              <span className="text-gray-400">{formatCurrency(income)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
