"use client";

import { useState, useMemo } from "react";
import { Expense, Category, SortField, SortDirection, Filters, QuarterFilter, Receipt } from "@/types/expense";
import { getCategories, getCategoryBg, formatCurrency, filterByQuarter } from "@/lib/utils";
import { getExpenseReceipts } from "@/lib/receiptExport";
import { useMode } from "@/context/ModeContext";
import { format, parseISO } from "date-fns";
import ReceiptViewer from "./ReceiptViewer";
import {
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  Search,
  X,
  Paperclip,
  ShieldCheck,
} from "lucide-react";

interface Props {
  expenses: Expense[];
  onEdit: (expense: Expense) => void;
  onDelete: (id: string) => void;
}

const CURRENT_YEAR = new Date().getFullYear();
const TAX_YEARS = [CURRENT_YEAR - 2, CURRENT_YEAR - 1, CURRENT_YEAR];
const QUARTERS: QuarterFilter[] = ["All", "Q1", "Q2", "Q3", "Q4"];

const EMPTY_FILTERS: Filters = {
  search: "",
  category: "All",
  dateFrom: "",
  dateTo: "",
  quarter: "All",
  taxYear: CURRENT_YEAR,
  taxDeductibleOnly: false,
};

// Removed legacy viewReceipt — replaced by ReceiptViewer modal below

export default function ExpenseList({ expenses, onEdit, onDelete }: Props) {
  const { mode, theme } = useMode();
  const categories = getCategories(mode);

  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewerReceipts, setViewerReceipts] = useState<Receipt[] | null>(null);
  const [viewerIndex, setViewerIndex] = useState(0);

  function setFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((f) => ({ ...f, [key]: value }));
  }

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("desc"); }
  }

  const filtered = useMemo(() => {
    let result = [...expenses];

    // Quarterly filter (business mode)
    if (mode === "business") {
      result = filterByQuarter(result, filters.taxYear, filters.quarter);
      if (filters.taxDeductibleOnly) result = result.filter((e) => e.taxDeductible);
    }

    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (e) =>
          e.description.toLowerCase().includes(q) ||
          e.category.toLowerCase().includes(q) ||
          (e.vendor ?? "").toLowerCase().includes(q)
      );
    }
    if (filters.category !== "All") result = result.filter((e) => e.category === filters.category);
    if (filters.dateFrom) result = result.filter((e) => e.date >= filters.dateFrom);
    if (filters.dateTo) result = result.filter((e) => e.date <= filters.dateTo);

    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === "date") cmp = a.date.localeCompare(b.date);
      else if (sortField === "amount") cmp = a.amount - b.amount;
      else if (sortField === "category") cmp = a.category.localeCompare(b.category);
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [expenses, filters, sortField, sortDir, mode]);

  const filteredTotal = filtered.reduce((s, e) => s + e.amount, 0);
  const hasFilters =
    filters.search ||
    filters.category !== "All" ||
    filters.dateFrom ||
    filters.dateTo ||
    (mode === "business" && (filters.quarter !== "All" || filters.taxDeductibleOnly));

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ChevronUp size={13} className="text-gray-300" />;
    return sortDir === "asc" ? (
      <ChevronUp size={13} style={{ color: theme.primary }} />
    ) : (
      <ChevronDown size={13} style={{ color: theme.primary }} />
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
      {/* Filters */}
      <div className="p-4 border-b border-gray-100 space-y-3">
        {/* Search + Category */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search expenses…"
              value={filters.search}
              onChange={(e) => setFilter("search", e.target.value)}
              className={`w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 ${theme.primaryRing}`}
            />
          </div>
          <select
            value={filters.category}
            onChange={(e) => setFilter("category", e.target.value as Category | "All")}
            className={`px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 ${theme.primaryRing} bg-white`}
          >
            <option value="All">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Business-specific: Tax Year + Quarter + Deductible */}
        {mode === "business" && (
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500 whitespace-nowrap">Tax Year</label>
              <select
                value={filters.taxYear}
                onChange={(e) => setFilter("taxYear", Number(e.target.value))}
                className={`px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 ${theme.primaryRing} bg-white`}
              >
                {TAX_YEARS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-1">
              {QUARTERS.map((q) => (
                <button
                  key={q}
                  onClick={() => setFilter("quarter", q)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                    filters.quarter === q
                      ? `${theme.primaryBg} text-white`
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
            <button
              onClick={() => setFilter("taxDeductibleOnly", !filters.taxDeductibleOnly)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
                filters.taxDeductibleOnly
                  ? "bg-teal-50 border-teal-400 text-teal-700"
                  : "border-gray-200 text-gray-500 hover:bg-gray-50"
              }`}
            >
              <ShieldCheck size={12} /> Deductible Only
            </button>
          </div>
        )}

        {/* Date range */}
        <div className="flex flex-col sm:flex-row gap-3 items-center">
          <div className="flex gap-2 flex-1 items-center">
            <label className="text-xs text-gray-500 whitespace-nowrap">From</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilter("dateFrom", e.target.value)}
              className={`flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 ${theme.primaryRing}`}
            />
          </div>
          <div className="flex gap-2 flex-1 items-center">
            <label className="text-xs text-gray-500 whitespace-nowrap">To</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilter("dateTo", e.target.value)}
              className={`flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 ${theme.primaryRing}`}
            />
          </div>
          {hasFilters && (
            <button
              onClick={() => setFilters(EMPTY_FILTERS)}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 whitespace-nowrap"
            >
              <X size={12} /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Results bar */}
      <div className="px-4 py-2 border-b border-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <p className="text-xs text-gray-400">
            {filtered.length} {filtered.length === 1 ? "expense" : "expenses"}
            {hasFilters ? " (filtered)" : ""}
          </p>
          {filtered.length > 0 && (
            <p className="text-xs font-semibold text-gray-600">{formatCurrency(filteredTotal)}</p>
          )}
        </div>
        <div className="hidden sm:flex items-center gap-4 text-xs text-gray-400">
          {(["date", "amount", "category"] as SortField[]).map((f) => (
            <button
              key={f}
              onClick={() => toggleSort(f)}
              className="group flex items-center gap-0.5 hover:text-gray-600 capitalize transition"
            >
              {f} <SortIcon field={f} />
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-gray-400 text-sm">
            {hasFilters ? "No expenses match your filters" : "No expenses yet — add your first one!"}
          </p>
        </div>
      ) : mode === "business" ? (
        // Business: table layout
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-50">
                <th className="text-left px-4 py-2 text-xs font-medium text-gray-400 whitespace-nowrap">Date</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-gray-400">Vendor / Description</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-gray-400 hidden md:table-cell">Category</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-gray-400 hidden lg:table-cell">Payment</th>
                <th className="text-center px-4 py-2 text-xs font-medium text-gray-400 hidden md:table-cell">Ded.</th>
                <th className="text-center px-4 py-2 text-xs font-medium text-gray-400 hidden lg:table-cell">Rcpt</th>
                <th className="text-right px-4 py-2 text-xs font-medium text-gray-400">Amount</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((expense) => (
                <tr key={expense.id} className="hover:bg-gray-50 transition group">
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                    {format(parseISO(expense.date), "MMM d, yyyy")}
                  </td>
                  <td className="px-4 py-3 max-w-[180px]">
                    {expense.vendor && (
                      <p className="text-sm font-medium text-gray-900 truncate">{expense.vendor}</p>
                    )}
                    <p className={`text-xs truncate ${expense.vendor ? "text-gray-400" : "text-sm font-medium text-gray-900"}`}>
                      {expense.description}
                    </p>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${getCategoryBg(expense.category)}`}>
                      {expense.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-xs text-gray-500 whitespace-nowrap">
                    {expense.paymentMethod ?? "—"}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-center">
                    {expense.taxDeductible ? (
                      <span className="text-teal-500 text-base">✓</span>
                    ) : (
                      <span className="text-gray-300 text-base">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-center">
                    {(() => {
                      const rcpts = getExpenseReceipts(expense);
                      if (rcpts.length === 0) return <span className="text-gray-200">—</span>;
                      const first = rcpts[0];
                      return (
                        <button
                          onClick={() => { setViewerReceipts(rcpts); setViewerIndex(0); }}
                          className="relative inline-block"
                          title={`${rcpts.length} receipt${rcpts.length > 1 ? "s" : ""}`}
                        >
                          {first.mimeType?.startsWith("image/") ? (
                            <img src={first.base64} alt="" className="w-8 h-8 object-cover rounded border border-gray-200 hover:border-indigo-300 transition" />
                          ) : (
                            <div className="w-8 h-8 rounded border border-gray-200 hover:border-indigo-300 transition flex items-center justify-center bg-gray-50">
                              <Paperclip size={12} className="text-gray-400" />
                            </div>
                          )}
                          {rcpts.length > 1 && (
                            <span className="absolute -top-1 -right-1 bg-indigo-500 text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                              {rcpts.length}
                            </span>
                          )}
                        </button>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-gray-900 whitespace-nowrap">
                    {formatCurrency(expense.amount)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                      <button
                        onClick={() => onEdit(expense)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => setDeleteId(expense.id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        // Personal: card list layout
        <ul className="divide-y divide-gray-50">
          {filtered.map((expense) => {
            const rcpts = getExpenseReceipts(expense);
            return (
              <li key={expense.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition group">
                {/* Receipt thumbnail (personal) */}
                {rcpts.length > 0 && (
                  <button
                    onClick={() => { setViewerReceipts(rcpts); setViewerIndex(0); }}
                    className="shrink-0 relative"
                    title="View receipt"
                  >
                    {rcpts[0].mimeType?.startsWith("image/") ? (
                      <img src={rcpts[0].base64} alt="" className="w-9 h-9 object-cover rounded-lg border border-gray-200 hover:border-indigo-300 transition" />
                    ) : (
                      <div className="w-9 h-9 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center hover:border-indigo-300 transition">
                        <Paperclip size={14} className="text-gray-400" />
                      </div>
                    )}
                    {rcpts.length > 1 && (
                      <span className="absolute -top-1 -right-1 bg-indigo-500 text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                        {rcpts.length}
                      </span>
                    )}
                  </button>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getCategoryBg(expense.category)}`}>
                      {expense.category}
                    </span>
                    <p className="text-sm font-medium text-gray-900 truncate">{expense.description}</p>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{format(parseISO(expense.date), "MMM d, yyyy")}</p>
                </div>
                <p className="text-sm font-semibold text-gray-900 tabular-nums shrink-0">
                  {formatCurrency(expense.amount)}
                </p>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
                  <button onClick={() => onEdit(expense)} className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => setDeleteId(expense.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition">
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Delete confirmation */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={22} className="text-red-500" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-1">Delete Expense</h3>
            <p className="text-sm text-gray-500 mb-5">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition">
                Cancel
              </button>
              <button onClick={() => { onDelete(deleteId); setDeleteId(null); }} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {viewerReceipts && (
        <ReceiptViewer
          receipts={viewerReceipts}
          initialIndex={viewerIndex}
          onClose={() => setViewerReceipts(null)}
        />
      )}
    </div>
  );
}
