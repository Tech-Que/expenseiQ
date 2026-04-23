"use client";

import { useState, useMemo } from "react";
import { Expense, Receipt } from "@/types/expense";
import { getExpenseReceipts } from "@/lib/receiptExport";
import { exportReceiptsZip } from "@/lib/receiptExport";
import { formatCurrency } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { X, Download, FileText, Image as ImageIcon, Search } from "lucide-react";
import ReceiptViewer from "./ReceiptViewer";

interface GalleryEntry {
  expense: Expense;
  receipt: Receipt;
  receiptIndex: number;
  allReceipts: Receipt[];
}

interface Props {
  expenses: Expense[];
  onClose: () => void;
}

export default function ReceiptGallery({ expenses, onClose }: Props) {
  const [search, setSearch] = useState("");
  const [viewEntry, setViewEntry] = useState<GalleryEntry | null>(null);
  const [zipping, setZipping] = useState(false);

  const entries = useMemo<GalleryEntry[]>(() => {
    const q = search.toLowerCase();
    return expenses
      .filter(
        (e) =>
          getExpenseReceipts(e).length > 0 &&
          (!q ||
            e.description.toLowerCase().includes(q) ||
            (e.vendor ?? "").toLowerCase().includes(q))
      )
      .sort((a, b) => b.date.localeCompare(a.date))
      .flatMap((expense) => {
        const receipts = getExpenseReceipts(expense);
        return receipts.map((receipt, i) => ({
          expense,
          receipt,
          receiptIndex: i,
          allReceipts: receipts,
        }));
      });
  }, [expenses, search]);

  async function handleZip() {
    setZipping(true);
    try {
      await exportReceiptsZip(expenses);
    } finally {
      setZipping(false);
    }
  }

  const totalCount = expenses.reduce((s, e) => s + getExpenseReceipts(e).length, 0);

  return (
    <>
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Receipt Cabinet</h2>
              <p className="text-xs text-gray-400">{totalCount} receipt{totalCount !== 1 ? "s" : ""} stored</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleZip}
                disabled={zipping || totalCount === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-50 disabled:opacity-40 transition"
              >
                <Download size={13} />
                {zipping ? "Zipping…" : "Export ZIP"}
              </button>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="px-6 py-3 border-b border-gray-50 shrink-0">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by description or vendor…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          </div>

          {/* Gallery grid */}
          <div className="flex-1 overflow-y-auto p-6">
            {entries.length === 0 ? (
              <div className="text-center py-16">
                {totalCount === 0 ? (
                  <>
                    <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                      <ImageIcon size={28} className="text-gray-300" />
                    </div>
                    <p className="text-gray-400 text-sm">No receipts yet.</p>
                    <p className="text-gray-300 text-xs mt-1">Attach receipts when adding or editing expenses.</p>
                  </>
                ) : (
                  <p className="text-gray-400 text-sm">No receipts match your search.</p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {entries.map((entry) => {
                  const isPDF = entry.receipt.mimeType?.startsWith("application/pdf");
                  return (
                    <button
                      key={`${entry.expense.id}-${entry.receiptIndex}`}
                      onClick={() => setViewEntry(entry)}
                      className="group text-left rounded-xl border border-gray-100 overflow-hidden hover:border-indigo-200 hover:shadow-md transition"
                    >
                      {/* Thumbnail */}
                      <div className="aspect-[4/3] bg-gray-50 flex items-center justify-center overflow-hidden">
                        {isPDF ? (
                          <FileText size={36} className="text-gray-300 group-hover:text-gray-400 transition" />
                        ) : (
                          <img
                            src={entry.receipt.base64}
                            alt="Receipt"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                        )}
                      </div>
                      {/* Caption */}
                      <div className="p-2.5">
                        <p className="text-xs font-medium text-gray-800 truncate leading-tight">
                          {entry.expense.vendor || entry.expense.description}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {format(parseISO(entry.expense.date), "MMM d, yyyy")}
                        </p>
                        <p className="text-xs font-semibold text-gray-700 mt-0.5 tabular-nums">
                          {formatCurrency(entry.expense.amount)}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {viewEntry && (
        <ReceiptViewer
          receipts={viewEntry.allReceipts}
          initialIndex={viewEntry.receiptIndex}
          caption={`${viewEntry.expense.description} · ${formatCurrency(viewEntry.expense.amount)}`}
          onClose={() => setViewEntry(null)}
        />
      )}
    </>
  );
}
