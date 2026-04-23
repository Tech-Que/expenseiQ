"use client";

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
import { Expense } from "@/types/expense";
import {
  getMonthlyTrend,
  getSpendingByCategory,
  getCategoryColor,
  getCategories,
  formatCurrency,
} from "@/lib/utils";
import { useMode } from "@/context/ModeContext";

interface Props {
  expenses: Expense[];
}

interface TooltipProps {
  active?: boolean;
  payload?: { value: number; name: string; payload: { fill: string } }[];
  label?: string;
}

function CurrencyTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-lg text-sm">
      <p className="font-semibold text-gray-700">{label}</p>
      <p style={{ color: payload[0]?.payload?.fill ?? "#6366f1" }}>
        {formatCurrency(payload[0].value)}
      </p>
    </div>
  );
}

function PieTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-lg text-sm">
      <p className="font-semibold text-gray-700">{payload[0].name}</p>
      <p style={{ color: payload[0].payload.fill }}>{formatCurrency(payload[0].value)}</p>
    </div>
  );
}

// Sample data shown when the expense list is empty
const SAMPLE_TREND = [
  { month: "Nov 24", total: 920, fill: "#c7d2fe" },
  { month: "Dec 24", total: 1540, fill: "#c7d2fe" },
  { month: "Jan 25", total: 780, fill: "#c7d2fe" },
  { month: "Feb 25", total: 1120, fill: "#c7d2fe" },
  { month: "Mar 25", total: 1380, fill: "#c7d2fe" },
  { month: "Apr 25", total: 640, fill: "#c7d2fe" },
];
const SAMPLE_PIE = [
  { name: "Food", value: 420, fill: "#fed7aa" },
  { name: "Shopping", value: 310, fill: "#fbcfe8" },
  { name: "Bills", value: 280, fill: "#fecaca" },
  { name: "Transport", value: 180, fill: "#bfdbfe" },
  { name: "Other", value: 90, fill: "#e5e7eb" },
];

export default function Charts({ expenses }: Props) {
  const { mode, theme } = useMode();
  const categories = getCategories(mode);
  const trend = getMonthlyTrend(expenses, 6);
  const byCategory = getSpendingByCategory(expenses);

  const pieData = categories
    .filter((c) => (byCategory[c] ?? 0) > 0)
    .map((c) => ({ name: c, value: byCategory[c] ?? 0, fill: getCategoryColor(c) }));

  const hasData = expenses.length > 0;

  const trendData = hasData
    ? trend.map((d) => ({ ...d, fill: theme.barColor }))
    : SAMPLE_TREND;
  const pieDataFinal = hasData ? pieData : SAMPLE_PIE;
  const trendWithFill = trendData; // alias kept for JSX below

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Monthly trend */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-700">Monthly Spending Trend</h3>
          {!hasData && <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-400 rounded-full">Sample preview</span>}
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={trendWithFill} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
            {hasData && <Tooltip content={<CurrencyTooltip />} />}
            <Bar dataKey="total" radius={[6, 6, 0, 0]} opacity={hasData ? 1 : 0.4}>
              {trendWithFill.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        {!hasData && <p className="text-center text-xs text-gray-400 mt-2">Add your first expense to see real data</p>}
      </div>

      {/* Category donut */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-700">Spending by Category</h3>
          {!hasData && <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-400 rounded-full">Sample preview</span>}
        </div>
        {true ? (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={pieDataFinal}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={3}
                dataKey="value"
                opacity={hasData ? 1 : 0.4}
              >
                {pieDataFinal.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Pie>
              {hasData && <Tooltip content={<PieTooltip />} />}
              <Legend
                iconType="circle"
                iconSize={8}
                formatter={(value) => (
                  <span className="text-xs text-gray-600">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[220px] flex items-center justify-center text-sm text-gray-400">
            Add expenses to see breakdown
          </div>
        )}
      </div>
    </div>
  );
}
