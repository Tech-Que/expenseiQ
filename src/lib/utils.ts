import {
  Expense,
  Category,
  PersonalCategory,
  BusinessCategory,
  Mode,
  QuarterFilter,
} from "@/types/expense";
import {
  format,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
  parseISO,
  startOfQuarter,
  endOfQuarter,
} from "date-fns";

// ─── Categories ──────────────────────────────────────────────────────────────

export const PERSONAL_CATEGORIES: PersonalCategory[] = [
  "Food",
  "Transportation",
  "Entertainment",
  "Shopping",
  "Bills",
  "Other",
];

export const BUSINESS_CATEGORIES: BusinessCategory[] = [
  "Office Supplies",
  "Travel",
  "Meals & Entertainment",
  "Vehicle/Mileage",
  "Utilities",
  "Software/Subscriptions",
  "Professional Services",
  "Marketing/Advertising",
  "Equipment",
  "Contractor Payments",
  "Other Business",
];

export function getCategories(mode: Mode): Category[] {
  return mode === "personal" ? PERSONAL_CATEGORIES : BUSINESS_CATEGORIES;
}

// ─── Colors ───────────────────────────────────────────────────────────────────

export const PERSONAL_CATEGORY_COLORS: Record<PersonalCategory, string> = {
  Food: "#f97316",
  Transportation: "#3b82f6",
  Entertainment: "#a855f7",
  Shopping: "#ec4899",
  Bills: "#ef4444",
  Other: "#6b7280",
};

export const BUSINESS_CATEGORY_COLORS: Record<BusinessCategory, string> = {
  "Office Supplies": "#64748b",
  "Travel": "#3b82f6",
  "Meals & Entertainment": "#f97316",
  "Vehicle/Mileage": "#eab308",
  "Utilities": "#ef4444",
  "Software/Subscriptions": "#8b5cf6",
  "Professional Services": "#06b6d4",
  "Marketing/Advertising": "#ec4899",
  "Equipment": "#14b8a6",
  "Contractor Payments": "#10b981",
  "Other Business": "#6b7280",
};

export function getCategoryColor(category: Category): string {
  if (category in PERSONAL_CATEGORY_COLORS)
    return PERSONAL_CATEGORY_COLORS[category as PersonalCategory];
  return BUSINESS_CATEGORY_COLORS[category as BusinessCategory];
}

export const PERSONAL_CATEGORY_BG: Record<PersonalCategory, string> = {
  Food: "bg-orange-100 text-orange-700",
  Transportation: "bg-blue-100 text-blue-700",
  Entertainment: "bg-purple-100 text-purple-700",
  Shopping: "bg-pink-100 text-pink-700",
  Bills: "bg-red-100 text-red-700",
  Other: "bg-gray-100 text-gray-700",
};

export const BUSINESS_CATEGORY_BG: Record<BusinessCategory, string> = {
  "Office Supplies": "bg-slate-100 text-slate-700",
  "Travel": "bg-blue-100 text-blue-700",
  "Meals & Entertainment": "bg-orange-100 text-orange-700",
  "Vehicle/Mileage": "bg-yellow-100 text-yellow-700",
  "Utilities": "bg-red-100 text-red-700",
  "Software/Subscriptions": "bg-violet-100 text-violet-700",
  "Professional Services": "bg-cyan-100 text-cyan-700",
  "Marketing/Advertising": "bg-pink-100 text-pink-700",
  "Equipment": "bg-teal-100 text-teal-700",
  "Contractor Payments": "bg-emerald-100 text-emerald-700",
  "Other Business": "bg-gray-100 text-gray-700",
};

export function getCategoryBg(category: Category): string {
  if (category in PERSONAL_CATEGORY_BG)
    return PERSONAL_CATEGORY_BG[category as PersonalCategory];
  return BUSINESS_CATEGORY_BG[category as BusinessCategory];
}

// ─── Formatting ───────────────────────────────────────────────────────────────

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export function getTotalSpending(expenses: Expense[]): number {
  return expenses.reduce((sum, e) => sum + e.amount, 0);
}

export function getMonthlySpending(expenses: Expense[], date = new Date()): number {
  const start = startOfMonth(date);
  const end = endOfMonth(date);
  return expenses
    .filter((e) => {
      try {
        return isWithinInterval(parseISO(e.date), { start, end });
      } catch {
        return false;
      }
    })
    .reduce((sum, e) => sum + e.amount, 0);
}

export function getSpendingByCategory(
  expenses: Expense[]
): Partial<Record<Category, number>> {
  const result: Partial<Record<Category, number>> = {};
  expenses.forEach((e) => {
    result[e.category] = (result[e.category] ?? 0) + e.amount;
  });
  return result;
}

export function getTopCategory(expenses: Expense[]): Category | null {
  if (!expenses.length) return null;
  const by = getSpendingByCategory(expenses);
  const top = Object.entries(by).sort((a, b) => b[1] - a[1])[0];
  return top ? (top[0] as Category) : null;
}

export function getMonthlyTrend(
  expenses: Expense[],
  months = 6
): { month: string; total: number }[] {
  const result: { month: string; total: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const start = startOfMonth(d);
    const end = endOfMonth(d);
    const total = expenses
      .filter((e) => {
        try {
          return isWithinInterval(parseISO(e.date), { start, end });
        } catch {
          return false;
        }
      })
      .reduce((sum, e) => sum + e.amount, 0);
    result.push({ month: format(d, "MMM yy"), total });
  }
  return result;
}

export function getCombinedMonthlyTrend(
  personalExpenses: Expense[],
  businessExpenses: Expense[],
  months = 6
): { month: string; personal: number; business: number }[] {
  const result: { month: string; personal: number; business: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const start = startOfMonth(d);
    const end = endOfMonth(d);
    const inRange = (e: Expense) => {
      try {
        return isWithinInterval(parseISO(e.date), { start, end });
      } catch {
        return false;
      }
    };
    const personal = personalExpenses.filter(inRange).reduce((s, e) => s + e.amount, 0);
    const business = businessExpenses.filter(inRange).reduce((s, e) => s + e.amount, 0);
    result.push({ month: format(d, "MMM yy"), personal, business });
  }
  return result;
}

// ─── Quarterly helpers ────────────────────────────────────────────────────────

const QUARTER_MONTHS: Record<Exclude<QuarterFilter, "All">, [number, number]> = {
  Q1: [0, 2],
  Q2: [3, 5],
  Q3: [6, 8],
  Q4: [9, 11],
};

export function getQuarterDateRange(
  year: number,
  quarter: Exclude<QuarterFilter, "All">
): { start: Date; end: Date } {
  const [startMonth, endMonth] = QUARTER_MONTHS[quarter];
  return {
    start: new Date(year, startMonth, 1),
    end: endOfMonth(new Date(year, endMonth, 1)),
  };
}

export function filterByQuarter(
  expenses: Expense[],
  year: number,
  quarter: QuarterFilter
): Expense[] {
  const yearFiltered = expenses.filter((e) => e.date.startsWith(String(year)));
  if (quarter === "All") return yearFiltered;
  const range = getQuarterDateRange(year, quarter);
  return yearFiltered.filter((e) => {
    try {
      return isWithinInterval(parseISO(e.date), range);
    } catch {
      return false;
    }
  });
}

export function getQuarterlyBreakdown(
  personalExpenses: Expense[],
  businessExpenses: Expense[],
  year: number
): { quarter: string; personal: number; business: number }[] {
  return (["Q1", "Q2", "Q3", "Q4"] as Exclude<QuarterFilter, "All">[]).map((q) => {
    const range = getQuarterDateRange(year, q);
    const inRange = (expenses: Expense[]) =>
      expenses
        .filter((e) => {
          try {
            return isWithinInterval(parseISO(e.date), range);
          } catch {
            return false;
          }
        })
        .reduce((s, e) => s + e.amount, 0);
    return { quarter: q, personal: inRange(personalExpenses), business: inRange(businessExpenses) };
  });
}

// ─── Export ───────────────────────────────────────────────────────────────────

export function exportToCSV(expenses: Expense[], mode: Mode): void {
  const isB = mode === "business";
  const headers = isB
    ? ["Date", "Vendor", "Description", "Category", "Amount", "Payment Method", "Tax Deductible"]
    : ["Date", "Amount", "Category", "Description"];

  const rows = expenses.map((e) =>
    isB
      ? [
          e.date,
          `"${(e.vendor ?? "").replace(/"/g, '""')}"`,
          `"${e.description.replace(/"/g, '""')}"`,
          `"${e.category}"`,
          e.amount.toFixed(2),
          e.paymentMethod ?? "",
          e.taxDeductible ? "Yes" : "No",
        ]
      : [
          e.date,
          e.amount.toFixed(2),
          e.category,
          `"${e.description.replace(/"/g, '""')}"`,
        ]
  );

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${mode}-expenses-${format(new Date(), "yyyy-MM-dd")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Tax Report (popup window) ────────────────────────────────────────────────

export function printTaxReport(
  expenses: Expense[],
  businessName: string,
  taxYear: number
): void {
  const yearExpenses = expenses.filter((e) => e.date.startsWith(String(taxYear)));

  // Group by category
  const grouped = new Map<string, Expense[]>();
  yearExpenses.forEach((e) => {
    const list = grouped.get(e.category) ?? [];
    list.push(e);
    grouped.set(e.category, list);
  });

  const grandTotal = yearExpenses.reduce((s, e) => s + e.amount, 0);
  const deductibleTotal = yearExpenses
    .filter((e) => e.taxDeductible)
    .reduce((s, e) => s + e.amount, 0);
  const nonDeductibleTotal = grandTotal - deductibleTotal;

  const fmt = (n: number) =>
    n.toLocaleString("en-US", { style: "currency", currency: "USD" });

  const categoryRows = Array.from(grouped.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([cat, exps]) => {
      const subtotal = exps.reduce((s, e) => s + e.amount, 0);
      const rows = exps
        .sort((a, b) => a.date.localeCompare(b.date))
        .map(
          (e) => `
          <tr>
            <td style="padding:4px 8px;border-bottom:1px solid #f0f0f0;font-size:12px;">${e.date}</td>
            <td style="padding:4px 8px;border-bottom:1px solid #f0f0f0;font-size:12px;">${e.vendor ?? "—"}</td>
            <td style="padding:4px 8px;border-bottom:1px solid #f0f0f0;font-size:12px;">${e.description}</td>
            <td style="padding:4px 8px;border-bottom:1px solid #f0f0f0;font-size:12px;">${e.paymentMethod ?? "—"}</td>
            <td style="padding:4px 8px;border-bottom:1px solid #f0f0f0;font-size:12px;text-align:center;">${e.taxDeductible ? "✓" : "—"}</td>
            <td style="padding:4px 8px;border-bottom:1px solid #f0f0f0;font-size:12px;text-align:right;font-family:monospace;">${fmt(e.amount)}</td>
          </tr>`
        )
        .join("");

      return `
        <div style="margin-bottom:24px;">
          <div style="background:#f5f5f5;padding:6px 8px;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#555;">
            ${cat}
          </div>
          <table style="width:100%;border-collapse:collapse;">
            <thead>
              <tr>
                <th style="text-align:left;font-size:10px;color:#999;padding:4px 8px;border-bottom:1px solid #eee;">Date</th>
                <th style="text-align:left;font-size:10px;color:#999;padding:4px 8px;border-bottom:1px solid #eee;">Vendor</th>
                <th style="text-align:left;font-size:10px;color:#999;padding:4px 8px;border-bottom:1px solid #eee;">Description</th>
                <th style="text-align:left;font-size:10px;color:#999;padding:4px 8px;border-bottom:1px solid #eee;">Payment</th>
                <th style="text-align:center;font-size:10px;color:#999;padding:4px 8px;border-bottom:1px solid #eee;">Deductible</th>
                <th style="text-align:right;font-size:10px;color:#999;padding:4px 8px;border-bottom:1px solid #eee;">Amount</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
            <tfoot>
              <tr>
                <td colspan="5" style="padding:6px 8px;font-size:12px;font-weight:700;">Subtotal</td>
                <td style="padding:6px 8px;font-size:12px;font-weight:700;text-align:right;font-family:monospace;">${fmt(subtotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>`;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${businessName || "Business"} – Tax Report ${taxYear}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; max-width: 820px; margin: 0 auto; padding: 40px; color: #111; }
    @media print { .no-print { display: none !important; } body { padding: 20px; } }
  </style>
</head>
<body>
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
    <div>
      <h1 style="font-size:22px;margin:0 0 2px;">${businessName || "My Business"}</h1>
      <p style="margin:0;font-size:15px;color:#444;">Business Expense Report — Tax Year ${taxYear}</p>
      <p style="margin:4px 0 0;font-size:11px;color:#999;">Generated ${format(new Date(), "MMMM d, yyyy")} · ${yearExpenses.length} transactions</p>
    </div>
    <button class="no-print" onclick="window.print()" style="padding:8px 18px;background:#10b981;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;">
      Print / Save PDF
    </button>
  </div>
  <hr style="border:none;border-top:2px solid #111;margin:16px 0 24px;">

  ${yearExpenses.length === 0 ? `<p style="color:#999;font-style:italic;">No expenses recorded for ${taxYear}.</p>` : categoryRows}

  <div style="margin-top:32px;padding:20px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;">
    <h3 style="margin:0 0 12px;font-size:13px;text-transform:uppercase;letter-spacing:1px;color:#666;">Summary</h3>
    <table style="width:100%;border-collapse:collapse;">
      <tr>
        <td style="padding:5px 0;font-size:13px;">Total Expenses</td>
        <td style="padding:5px 0;font-size:13px;text-align:right;font-family:monospace;font-weight:600;">${fmt(grandTotal)}</td>
      </tr>
      <tr>
        <td style="padding:5px 0;font-size:13px;color:#10b981;">Tax-Deductible Expenses</td>
        <td style="padding:5px 0;font-size:13px;text-align:right;font-family:monospace;font-weight:600;color:#10b981;">${fmt(deductibleTotal)}</td>
      </tr>
      <tr>
        <td style="padding:5px 0;font-size:13px;color:#6b7280;">Non-Deductible Expenses</td>
        <td style="padding:5px 0;font-size:13px;text-align:right;font-family:monospace;color:#6b7280;">${fmt(nonDeductibleTotal)}</td>
      </tr>
    </table>
    <hr style="border:none;border-top:2px solid #111;margin:12px 0 8px;">
    <div style="display:flex;justify-content:space-between;font-size:16px;font-weight:700;">
      <span>TOTAL DEDUCTIBLE</span>
      <span style="font-family:monospace;">${fmt(deductibleTotal)}</span>
    </div>
  </div>

  <p style="margin-top:48px;font-size:11px;color:#aaa;text-align:center;">
    This report is generated for informational purposes. Please consult a qualified tax professional.
  </p>
</body>
</html>`;

  const win = window.open("", "_blank", "width=900,height=700");
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}

// ─── Spending insights ────────────────────────────────────────────────────────

export function getTopCategories(
  expenses: Expense[],
  limit = 5
): { category: Category; amount: number; pct: number }[] {
  const byCategory = getSpendingByCategory(expenses);
  const total = getTotalSpending(expenses);
  return (Object.entries(byCategory) as [Category, number][])
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([category, amount]) => ({
      category,
      amount,
      pct: total > 0 ? (amount / total) * 100 : 0,
    }));
}

export function getYearlyTotals(
  expenses: Expense[]
): { year: string; total: number }[] {
  const map = new Map<string, number>();
  expenses.forEach((e) => {
    const year = e.date.slice(0, 4);
    map.set(year, (map.get(year) ?? 0) + e.amount);
  });
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([year, total]) => ({ year, total }));
}

export function getSpendingVelocity(expenses: Expense[]): {
  currentMonthSpent: number;
  projectedMonthly: number;
  daysElapsed: number;
  daysInMonth: number;
} {
  const now = new Date();
  const daysElapsed = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const currentMonthSpent = getMonthlySpending(expenses);
  const dailyAvg = daysElapsed > 0 ? currentMonthSpent / daysElapsed : 0;
  return {
    currentMonthSpent,
    projectedMonthly: dailyAvg * daysInMonth,
    daysElapsed,
    daysInMonth,
  };
}

export function getQuarterlyTrend(
  expenses: Expense[],
  year = new Date().getFullYear()
): { quarter: string; total: number }[] {
  return (["Q1", "Q2", "Q3", "Q4"] as Exclude<QuarterFilter, "All">[]).map((q) => {
    const range = getQuarterDateRange(year, q);
    const total = expenses
      .filter((e) => {
        try {
          return isWithinInterval(parseISO(e.date), range);
        } catch {
          return false;
        }
      })
      .reduce((s, e) => s + e.amount, 0);
    return { quarter: q, total };
  });
}

// Keep legacy alias for old category color lookups
export const CATEGORY_COLORS = PERSONAL_CATEGORY_COLORS;
export const CATEGORY_BG = PERSONAL_CATEGORY_BG;
export const CATEGORIES = PERSONAL_CATEGORIES;

// Needed by old SummaryCards / CategoryBreakdown
export { startOfQuarter, endOfQuarter };
