"use client";

import { Expense } from "@/types/expense";
import {
  formatCurrency,
  getTotalSpending,
  getMonthlySpending,
  getTopCategory,
  getCategoryColor,
} from "@/lib/utils";
import { useMode } from "@/context/ModeContext";
import { DollarSign, TrendingUp, Tag, Receipt, ShieldCheck } from "lucide-react";
import { format } from "date-fns";

interface Props {
  expenses: Expense[];
}

export default function SummaryCards({ expenses }: Props) {
  const { mode, theme } = useMode();

  const total = getTotalSpending(expenses);
  const monthly = getMonthlySpending(expenses);
  const topCat = getTopCategory(expenses);
  const count = expenses.length;
  const deductibleTotal = mode === "business"
    ? expenses.filter((e) => e.taxDeductible).reduce((s, e) => s + e.amount, 0)
    : null;

  const cards = [
    {
      label: "Total Spending",
      value: formatCurrency(total),
      sub: "All time",
      icon: DollarSign,
      color: `${theme.primaryLight} ${theme.primaryText}`,
    },
    {
      label: "This Month",
      value: formatCurrency(monthly),
      sub: format(new Date(), "MMMM yyyy"),
      icon: TrendingUp,
      color: "bg-emerald-50 text-emerald-600",
    },
    ...(deductibleTotal !== null
      ? [
          {
            label: "Tax Deductible",
            value: formatCurrency(deductibleTotal),
            sub: `${total > 0 ? ((deductibleTotal / total) * 100).toFixed(0) : 0}% of total`,
            icon: ShieldCheck,
            color: "bg-teal-50 text-teal-600",
            dot: undefined as string | undefined,
          },
        ]
      : [
          {
            label: "Top Category",
            value: topCat ?? "—",
            sub: topCat
              ? formatCurrency(
                  expenses.filter((e) => e.category === topCat).reduce((s, e) => s + e.amount, 0)
                )
              : "No data",
            icon: Tag,
            color: "bg-amber-50 text-amber-600",
            dot: topCat ? getCategoryColor(topCat) : undefined,
          },
        ]),
    {
      label: "Transactions",
      value: count.toString(),
      sub: count === 1 ? "expense recorded" : "expenses recorded",
      icon: Receipt,
      color: "bg-rose-50 text-rose-600",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm"
        >
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                {card.label}
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                {"dot" in card && card.dot && (
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: card.dot }}
                  />
                )}
                <p className="text-xl font-bold text-gray-900 truncate">{card.value}</p>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">{card.sub}</p>
            </div>
            <div className={`p-2.5 rounded-xl ${card.color} shrink-0`}>
              <card.icon size={18} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
