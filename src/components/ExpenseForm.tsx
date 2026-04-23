"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Expense, Category, PaymentMethod, Receipt } from "@/types/expense";
import { getCategories, generateId } from "@/lib/utils";
import { getExpenseReceipts } from "@/lib/receiptExport";
import { ExpenseInput } from "@/hooks/useExpenses";
import { useMode } from "@/context/ModeContext";
import { X, Eye, Trash2, Camera, Upload, FileText } from "lucide-react";
import ReceiptViewer from "./ReceiptViewer";

const PAYMENT_METHODS: PaymentMethod[] = ["Cash", "Credit Card", "Debit Card", "Check", "ACH"];
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB per file
const today = () => new Date().toISOString().split("T")[0];

interface Props {
  onSubmit: (input: ExpenseInput) => void;
  onCancel: () => void;
  editingExpense?: Expense | null;
}

interface FormState {
  date: string;
  amount: number;
  category: Category;
  description: string;
  vendor: string;
  paymentMethod: PaymentMethod;
  taxDeductible: boolean;
  receipts: Receipt[];
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function ExpenseForm({ onSubmit, onCancel, editingExpense }: Props) {
  const { mode, theme } = useMode();
  const categories = getCategories(mode);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const defaultCategory = categories[0];

  const [form, setForm] = useState<FormState>({
    date: today(),
    amount: 0,
    category: defaultCategory,
    description: "",
    vendor: "",
    paymentMethod: "Credit Card",
    taxDeductible: true,
    receipts: [],
  });
  const [amountStr, setAmountStr] = useState("");
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [receiptErrors, setReceiptErrors] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const [viewingReceipts, setViewingReceipts] = useState<Receipt[] | null>(null);
  const [viewingIndex, setViewingIndex] = useState(0);

  useEffect(() => {
    if (editingExpense) {
      setForm({
        date: editingExpense.date,
        amount: editingExpense.amount,
        category: editingExpense.category,
        description: editingExpense.description,
        vendor: editingExpense.vendor ?? "",
        paymentMethod: editingExpense.paymentMethod ?? "Credit Card",
        taxDeductible: editingExpense.taxDeductible ?? true,
        receipts: getExpenseReceipts(editingExpense),
      });
      setAmountStr(String(editingExpense.amount));
    } else {
      setForm((f) => ({ ...f, category: defaultCategory }));
    }
  }, [editingExpense, defaultCategory]);

  async function handleFiles(files: FileList | File[]) {
    const fileArr = Array.from(files);
    const errs: string[] = [];
    const newReceipts: Receipt[] = [];

    for (const file of fileArr) {
      if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
        errs.push(`${file.name}: unsupported type (use JPG, PNG, or PDF)`);
        continue;
      }
      if (file.size > MAX_BYTES) {
        errs.push(`${file.name}: too large (max 2 MB)`);
        continue;
      }
      const base64 = await fileToBase64(file);
      newReceipts.push({
        id: generateId(),
        base64,
        name: file.name,
        mimeType: file.type || "image/jpeg",
        size: file.size,
        createdAt: new Date().toISOString(),
      });
    }

    setReceiptErrors(errs);
    setForm((f) => ({ ...f, receipts: [...f.receipts, ...newReceipts] }));
  }

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    await handleFiles(e.dataTransfer.files);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function removeReceipt(id: string) {
    setForm((f) => ({ ...f, receipts: f.receipts.filter((r) => r.id !== id) }));
  }

  function openViewer(receipts: Receipt[], index: number) {
    setViewingReceipts(receipts);
    setViewingIndex(index);
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.date) e.date = "Date is required";
    const amt = parseFloat(amountStr);
    if (!amountStr || isNaN(amt) || amt <= 0) e.amount = "Enter a valid amount > 0";
    if (amt > 1_000_000) e.amount = "Amount too large";
    if (!form.description.trim()) e.description = "Description is required";
    if (form.description.trim().length > 200) e.description = "Max 200 characters";
    if (mode === "business" && form.vendor && form.vendor.length > 100)
      e.vendor = "Max 100 characters";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    const input: ExpenseInput = {
      mode,
      date: form.date,
      amount: parseFloat(parseFloat(amountStr).toFixed(2)),
      category: form.category,
      description: form.description.trim(),
      receipts: form.receipts.length > 0 ? form.receipts : undefined,
    };
    if (mode === "business") {
      input.vendor = form.vendor.trim() || undefined;
      input.paymentMethod = form.paymentMethod;
      input.taxDeductible = form.taxDeductible;
    }
    onSubmit(input);
  }

  const fieldCls = (key: string) =>
    `w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 ${theme.primaryRing} transition ${
      errors[key] ? "border-red-400" : "border-gray-300"
    }`;

  const isPDF = (r: Receipt) => r.mimeType?.startsWith("application/pdf");

  return (
    <>
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 overflow-y-auto">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md my-4">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: theme.primary + "22" }}>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: theme.primary + "20", color: theme.primary }}>
                {theme.modeLabel}
              </span>
              <h2 className="text-base font-semibold text-gray-900">
                {editingExpense ? "Edit Expense" : "Add Expense"}
              </h2>
            </div>
            <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 transition">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            {/* Date + Amount */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
                <input type="date" max={today()} value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className={fieldCls("date")} />
                {errors.date && <p className="mt-1 text-xs text-red-500">{errors.date}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Amount ($)</label>
                <input type="number" min="0.01" step="0.01" placeholder="0.00" value={amountStr} onChange={(e) => setAmountStr(e.target.value)} className={fieldCls("amount")} />
                {errors.amount && <p className="mt-1 text-xs text-red-500">{errors.amount}</p>}
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
              <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as Category }))} className={fieldCls("category")}>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Business: Vendor */}
            {mode === "business" && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Vendor / Payee <span className="text-gray-400">(optional)</span></label>
                <input type="text" placeholder="e.g. Amazon, Staples, Uber" value={form.vendor} onChange={(e) => setForm((f) => ({ ...f, vendor: e.target.value }))} className={fieldCls("vendor")} />
                {errors.vendor && <p className="mt-1 text-xs text-red-500">{errors.vendor}</p>}
              </div>
            )}

            {/* Description */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
              <input type="text" placeholder="What did you spend on?" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className={fieldCls("description")} />
              {errors.description && <p className="mt-1 text-xs text-red-500">{errors.description}</p>}
            </div>

            {/* Business: Payment + Tax Deductible */}
            {mode === "business" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Payment Method</label>
                  <select value={form.paymentMethod} onChange={(e) => setForm((f) => ({ ...f, paymentMethod: e.target.value as PaymentMethod }))} className={fieldCls("paymentMethod")}>
                    {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Tax Deductible</label>
                  <div className="flex gap-2 mt-1">
                    {[true, false].map((val) => (
                      <button key={String(val)} type="button" onClick={() => setForm((f) => ({ ...f, taxDeductible: val }))}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition ${
                          form.taxDeductible === val
                            ? val ? "bg-emerald-50 border-emerald-400 text-emerald-700" : "bg-red-50 border-red-400 text-red-600"
                            : "border-gray-200 text-gray-500 hover:bg-gray-50"
                        }`}
                      >{val ? "Yes" : "No"}</button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Receipts */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">
                Receipts <span className="text-gray-400">(optional · JPG, PNG, PDF · max 2 MB each)</span>
              </label>

              {/* Existing receipts */}
              {form.receipts.length > 0 && (
                <div className="space-y-1.5 mb-2">
                  {form.receipts.map((r, i) => (
                    <div key={r.id} className="flex items-center gap-2 p-2 border border-gray-200 rounded-lg bg-gray-50">
                      {isPDF(r) ? (
                        <FileText size={14} className="text-gray-400 shrink-0" />
                      ) : (
                        <img src={r.base64} alt="" className="w-8 h-8 object-cover rounded shrink-0" />
                      )}
                      <span className="text-xs text-gray-600 truncate flex-1">{r.name}</span>
                      <button type="button" onClick={() => openViewer(form.receipts, i)} className="text-indigo-400 hover:text-indigo-600 transition shrink-0" title="View"><Eye size={13} /></button>
                      <button type="button" onClick={() => removeReceipt(r.id)} className="text-red-400 hover:text-red-600 transition shrink-0" title="Remove"><Trash2 size={13} /></button>
                    </div>
                  ))}
                </div>
              )}

              {/* Drop zone */}
              <div
                ref={dropZoneRef}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-4 transition ${dragging ? "border-indigo-400 bg-indigo-50" : "border-gray-200"}`}
              >
                <div className="flex flex-col sm:flex-row items-center gap-3 justify-center">
                  <div className="flex items-center gap-2">
                    <Upload size={14} className="text-gray-400" />
                    <span className="text-xs text-gray-500">Drop files or</span>
                    <label className="text-xs text-indigo-600 hover:text-indigo-700 cursor-pointer font-medium">
                      browse
                      <input ref={fileRef} type="file" multiple accept="image/*,application/pdf" className="hidden"
                        onChange={(e) => handleFiles(e.target.files!)} />
                    </label>
                  </div>
                  <div className="hidden sm:block w-px h-4 bg-gray-200" />
                  <label className="flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 cursor-pointer font-medium">
                    <Camera size={14} />
                    Camera
                    <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden"
                      onChange={(e) => { if (e.target.files?.[0]) handleFiles(e.target.files); }} />
                  </label>
                </div>
              </div>

              {receiptErrors.length > 0 && (
                <div className="mt-1 space-y-0.5">
                  {receiptErrors.map((err, i) => (
                    <p key={i} className="text-xs text-red-500">{err}</p>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onCancel} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition">
                Cancel
              </button>
              <button type="submit" className={`flex-1 px-4 py-2 ${theme.primaryBg} ${theme.primaryHover} text-white rounded-lg text-sm font-medium transition`}>
                {editingExpense ? "Save Changes" : "Add Expense"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {viewingReceipts && (
        <ReceiptViewer
          receipts={viewingReceipts}
          initialIndex={viewingIndex}
          onClose={() => setViewingReceipts(null)}
        />
      )}
    </>
  );
}
