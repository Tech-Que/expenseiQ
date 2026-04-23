"use client";

import { useState, useCallback, useRef } from "react";
import { Expense, Category } from "@/types/expense";
import { ExpenseInput } from "@/hooks/useExpenses";
import { useMode } from "@/context/ModeContext";
import { getCategories } from "@/lib/utils";
import {
  parseCSV,
  parseOFX,
  autoDetectMapping,
  mapCSVRow,
  autoCategorize,
  isDuplicate,
  BANK_INSTRUCTIONS,
  ParsedCSV,
  CSVMapping,
  AmountSign,
  ImportRow,
} from "@/lib/import";
import { generateId } from "@/lib/utils";
import {
  X,
  Upload,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  AlertTriangle,
  CheckCircle,
  Info,
} from "lucide-react";

type WizardStep = "upload" | "mapping" | "preview";

interface Props {
  existingExpenses: Expense[];
  onBulkImport: (inputs: ExpenseInput[]) => void;
  onClose: () => void;
}

const STEP_LABELS: Record<WizardStep, string> = {
  upload: "1. Upload File",
  mapping: "2. Map Columns",
  preview: "3. Review & Import",
};

export default function ImportWizard({ existingExpenses, onBulkImport, onClose }: Props) {
  const { mode, theme } = useMode();
  const categories = getCategories(mode);
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<WizardStep>("upload");
  const [dragging, setDragging] = useState(false);
  const [fileType, setFileType] = useState<"csv" | "ofx" | null>(null);
  const [csvData, setCsvData] = useState<ParsedCSV | null>(null);
  const [mapping, setMapping] = useState<CSVMapping>({ date: -1, amount: -1, description: -1, vendor: -1, credit: -1 });
  const [amountSign, setAmountSign] = useState<AmountSign>("absolute");
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [error, setError] = useState("");
  const [showBankGuide, setShowBankGuide] = useState(false);
  const [importDone, setImportDone] = useState(false);
  const [importedCount, setImportedCount] = useState(0);

  // ─── File handling ──────────────────────────────────────────────────────────

  function detectFileType(name: string): "csv" | "ofx" | null {
    const ext = name.split(".").pop()?.toLowerCase();
    if (ext === "csv") return "csv";
    if (ext === "ofx" || ext === "qfx") return "ofx";
    return null;
  }

  async function processFile(file: File) {
    setError("");
    const type = detectFileType(file.name);
    if (!type) {
      setError("Unsupported file type. Please upload a .csv, .ofx, or .qfx file.");
      return;
    }
    const text = await file.text();
    setFileType(type);

    if (type === "csv") {
      const data = parseCSV(text);
      if (data.headers.length === 0) {
        setError("Could not parse CSV — the file appears to be empty or malformed.");
        return;
      }
      setCsvData(data);
      setMapping(autoDetectMapping(data.headers));
      setStep("mapping");
    } else {
      const parsed = parseOFX(text);
      if (parsed.length === 0) {
        setError("No transactions found in this OFX/QFX file. Make sure it contains bank transaction data.");
        return;
      }
      const importRows = parsed.map((t) => buildImportRow(t.date, t.amount, t.description, t.vendor ?? ""));
      setRows(importRows);
      setStep("preview");
    }
  }

  function buildImportRow(date: string, amount: number, description: string, vendor: string): ImportRow {
    const cat = autoCategorize(description, mode);
    const dup = isDuplicate({ date, amount, description, vendor: vendor || undefined }, existingExpenses);
    return {
      id: generateId(),
      date,
      amount,
      description,
      vendor,
      suggestedCategory: cat,
      category: cat,
      isDuplicate: dup,
      selected: !dup,
    };
  }

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode, existingExpenses]
  );

  // ─── Step 2: Build rows from CSV mapping ───────────────────────────────────

  function applyMapping() {
    if (!csvData) return;
    if (mapping.date < 0 || mapping.amount < 0 || mapping.description < 0) {
      setError("Please map Date, Amount, and Description columns.");
      return;
    }
    setError("");
    const importRows: ImportRow[] = [];
    for (const row of csvData.rows) {
      const parsed = mapCSVRow(row, mapping, amountSign);
      if (!parsed) continue;
      importRows.push(buildImportRow(parsed.date, parsed.amount, parsed.description, parsed.vendor ?? ""));
    }
    if (importRows.length === 0) {
      setError("No valid transactions could be parsed with the current column mapping. Check your settings.");
      return;
    }
    setRows(importRows);
    setStep("preview");
  }

  // ─── Step 3: Import ────────────────────────────────────────────────────────

  function handleImport() {
    const selected = rows.filter((r) => r.selected);
    const inputs: ExpenseInput[] = selected.map((r) => ({
      mode,
      date: r.date,
      amount: r.amount,
      category: r.category,
      description: r.description,
      vendor: mode === "business" ? r.vendor || undefined : undefined,
    }));
    onBulkImport(inputs);
    setImportedCount(selected.length);
    setImportDone(true);
  }

  function toggleRow(id: string) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, selected: !r.selected } : r)));
  }

  function setRowCategory(id: string, cat: Category) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, category: cat } : r)));
  }

  function selectAll(selected: boolean) {
    setRows((prev) => prev.map((r) => ({ ...r, selected: r.isDuplicate ? false : selected })));
  }

  const selectedCount = rows.filter((r) => r.selected).length;
  const dupCount = rows.filter((r) => r.isDuplicate).length;

  // ─── Render ────────────────────────────────────────────────────────────────

  const stepOrder: WizardStep[] = fileType === "csv" ? ["upload", "mapping", "preview"] : ["upload", "preview"];

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-4 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Import Bank Transactions</h2>
            <div className="flex items-center gap-2 mt-1">
              {stepOrder.map((s, i) => (
                <span key={s} className="flex items-center gap-1">
                  {i > 0 && <ChevronRight size={12} className="text-gray-300" />}
                  <span className={`text-xs ${step === s ? `font-semibold ${theme.primaryText}` : "text-gray-400"}`}>
                    {STEP_LABELS[s]}
                  </span>
                </span>
              ))}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Success state */}
          {importDone ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} className="text-emerald-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Import Complete</h3>
              <p className="text-sm text-gray-500">
                Successfully imported {importedCount} expense{importedCount !== 1 ? "s" : ""}
              </p>
              <button
                onClick={onClose}
                className={`mt-6 px-6 py-2 ${theme.primaryBg} ${theme.primaryHover} text-white rounded-lg text-sm font-medium transition`}
              >
                Done
              </button>
            </div>
          ) : step === "upload" ? (
            <UploadStep
              dragging={dragging}
              error={error}
              showBankGuide={showBankGuide}
              fileRef={fileRef}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onFileChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f); }}
              onToggleGuide={() => setShowBankGuide((v) => !v)}
            />
          ) : step === "mapping" && csvData ? (
            <MappingStep
              csvData={csvData}
              mapping={mapping}
              amountSign={amountSign}
              error={error}
              onMappingChange={setMapping}
              onAmountSignChange={setAmountSign}
            />
          ) : step === "preview" ? (
            <PreviewStep
              rows={rows}
              categories={categories}
              selectedCount={selectedCount}
              dupCount={dupCount}
              onToggleRow={toggleRow}
              onSetCategory={setRowCategory}
              onSelectAll={selectAll}
            />
          ) : null}
        </div>

        {/* Footer */}
        {!importDone && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 shrink-0">
            <button
              onClick={() => {
                if (step === "mapping") setStep("upload");
                else if (step === "preview") setStep(fileType === "csv" ? "mapping" : "upload");
              }}
              className={`flex items-center gap-1.5 px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition ${step === "upload" ? "invisible" : ""}`}
            >
              <ChevronLeft size={15} /> Back
            </button>

            {step === "mapping" && (
              <button
                onClick={applyMapping}
                className={`flex items-center gap-1.5 px-5 py-2 ${theme.primaryBg} ${theme.primaryHover} text-white rounded-lg text-sm font-medium transition`}
              >
                Preview Transactions <ChevronRight size={15} />
              </button>
            )}
            {step === "preview" && (
              <button
                onClick={handleImport}
                disabled={selectedCount === 0}
                className={`flex items-center gap-1.5 px-5 py-2 ${theme.primaryBg} ${theme.primaryHover} disabled:opacity-40 text-white rounded-lg text-sm font-medium transition`}
              >
                Import {selectedCount} Expense{selectedCount !== 1 ? "s" : ""}
              </button>
            )}
            {step === "upload" && <div />}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function UploadStep({
  dragging, error, showBankGuide, fileRef,
  onDragOver, onDragLeave, onDrop, onFileChange, onToggleGuide,
}: {
  dragging: boolean; error: string; showBankGuide: boolean;
  fileRef: React.RefObject<HTMLInputElement>;
  onDragOver: (e: React.DragEvent) => void; onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onToggleGuide: () => void;
}) {
  return (
    <div className="space-y-5">
      {/* Drop zone */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`border-2 border-dashed rounded-xl p-10 text-center transition cursor-pointer ${
          dragging ? "border-indigo-400 bg-indigo-50" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
        }`}
        onClick={() => fileRef.current?.click()}
      >
        <Upload size={32} className="mx-auto mb-3 text-gray-300" />
        <p className="text-sm font-medium text-gray-700">Drop your bank file here</p>
        <p className="text-xs text-gray-400 mt-1">or click to browse</p>
        <p className="text-xs text-gray-300 mt-3">Supports .csv · .ofx · .qfx</p>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.ofx,.qfx"
          className="hidden"
          onChange={onFileChange}
        />
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertTriangle size={15} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Bank instructions */}
      <div className="border border-gray-100 rounded-xl overflow-hidden">
        <button
          onClick={onToggleGuide}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition text-left"
        >
          <div className="flex items-center gap-2">
            <Info size={15} className="text-gray-400" />
            <span className="text-sm font-medium text-gray-700">How to export from your bank</span>
          </div>
          <ChevronDown size={15} className={`text-gray-400 transition-transform ${showBankGuide ? "rotate-180" : ""}`} />
        </button>
        {showBankGuide && (
          <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {BANK_INSTRUCTIONS.map((bank) => (
              <div key={bank.bank} className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-gray-800">{bank.bank}</p>
                  <div className="flex gap-1">
                    {bank.formats.map((f) => (
                      <span key={f} className="text-xs px-1.5 py-0.5 bg-gray-200 text-gray-600 rounded">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
                <ol className="space-y-1">
                  {bank.steps.map((step, i) => (
                    <li key={i} className="text-xs text-gray-500 flex gap-1.5">
                      <span className="text-gray-300 shrink-0">{i + 1}.</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MappingStep({
  csvData, mapping, amountSign, error,
  onMappingChange, onAmountSignChange,
}: {
  csvData: ParsedCSV; mapping: CSVMapping; amountSign: AmountSign; error: string;
  onMappingChange: (m: CSVMapping) => void;
  onAmountSignChange: (s: AmountSign) => void;
}) {
  const { headers, rows } = csvData;
  const preview = rows.slice(0, 3);

  const colOptions = [
    <option key={-1} value={-1}>— Not mapped —</option>,
    ...headers.map((h, i) => (
      <option key={i} value={i}>{h || `Column ${i + 1}`}</option>
    )),
  ];

  function setCol(field: keyof CSVMapping, idx: number) {
    onMappingChange({ ...mapping, [field]: idx });
  }

  const selectCls = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400";

  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-500">
        Your file has {headers.length} columns and {csvData.rows.length} data rows. Map each field below.
      </p>

      <div className="grid grid-cols-2 gap-4">
        {[
          { label: "Date column *", field: "date" as const },
          { label: "Amount column *", field: "amount" as const },
          { label: "Description column *", field: "description" as const },
          { label: "Vendor column", field: "vendor" as const },
          { label: "Credit column (separate)", field: "credit" as const },
        ].map(({ label, field }) => (
          <div key={field}>
            <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
            <select
              value={mapping[field]}
              onChange={(e) => setCol(field, Number(e.target.value))}
              className={selectCls}
            >
              {colOptions}
            </select>
          </div>
        ))}
      </div>

      {/* Amount sign */}
      <div>
        <p className="text-xs font-medium text-gray-600 mb-2">How are expenses represented?</p>
        <div className="flex flex-col gap-2">
          {[
            { val: "negative" as AmountSign, label: "Negative amounts are expenses (e.g. -45.67)" },
            { val: "positive" as AmountSign, label: "Positive amounts are expenses (e.g. 45.67)" },
            { val: "absolute" as AmountSign, label: "Import all as expenses (take absolute value)" },
          ].map(({ val, label }) => (
            <label key={val} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="amtSign"
                value={val}
                checked={amountSign === val}
                onChange={() => onAmountSignChange(val)}
                className="accent-indigo-600"
              />
              <span className="text-sm text-gray-600">{label}</span>
            </label>
          ))}
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertTriangle size={15} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Preview table */}
      {preview.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-2">File preview (first 3 rows)</p>
          <div className="overflow-x-auto border border-gray-100 rounded-xl">
            <table className="text-xs w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {headers.map((h, i) => (
                    <th key={i} className="px-3 py-2 text-left font-medium text-gray-500 whitespace-nowrap">
                      {h || `Col ${i + 1}`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((row, ri) => (
                  <tr key={ri} className="border-b border-gray-50">
                    {row.map((cell, ci) => (
                      <td key={ci} className="px-3 py-2 text-gray-600 whitespace-nowrap max-w-[120px] truncate">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function PreviewStep({
  rows, categories, selectedCount, dupCount,
  onToggleRow, onSetCategory, onSelectAll,
}: {
  rows: ImportRow[]; categories: Category[];
  selectedCount: number; dupCount: number;
  onToggleRow: (id: string) => void;
  onSetCategory: (id: string, cat: Category) => void;
  onSelectAll: (sel: boolean) => void;
}) {
  const [showDupsOnly, setShowDupsOnly] = useState(false);

  const visible = showDupsOnly ? rows.filter((r) => r.isDuplicate) : rows;

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-gray-50 rounded-xl text-sm">
        <span className="text-gray-700 font-medium">{rows.length} transactions found</span>
        {dupCount > 0 && (
          <span className="flex items-center gap-1 text-amber-600">
            <AlertTriangle size={13} />
            {dupCount} possible duplicate{dupCount !== 1 ? "s" : ""}
          </span>
        )}
        <span className="text-gray-400 ml-auto">{selectedCount} selected to import</span>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={() => onSelectAll(true)} className="text-xs text-indigo-600 hover:underline">Select all</button>
        <button onClick={() => onSelectAll(false)} className="text-xs text-gray-400 hover:underline">Deselect all</button>
        {dupCount > 0 && (
          <button
            onClick={() => setShowDupsOnly((v) => !v)}
            className={`text-xs px-2 py-1 rounded-lg border transition ${showDupsOnly ? "bg-amber-50 border-amber-300 text-amber-700" : "border-gray-200 text-gray-500 hover:bg-gray-50"}`}
          >
            {showDupsOnly ? "Show all" : "Show duplicates only"}
          </button>
        )}
      </div>

      {/* Transaction table */}
      <div className="border border-gray-100 rounded-xl overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-3 py-2 w-8"></th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 whitespace-nowrap">Date</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Description</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Category</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {visible.map((row) => (
              <tr
                key={row.id}
                className={`transition ${row.isDuplicate ? "opacity-50 bg-amber-50/40" : row.selected ? "" : "opacity-40"}`}
              >
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={row.selected}
                    onChange={() => onToggleRow(row.id)}
                    className="accent-indigo-600"
                  />
                </td>
                <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">{row.date}</td>
                <td className="px-3 py-2 max-w-[200px]">
                  <p className="text-sm text-gray-800 truncate">{row.description}</p>
                  {row.vendor && row.vendor !== row.description && (
                    <p className="text-xs text-gray-400 truncate">{row.vendor}</p>
                  )}
                  {row.isDuplicate && (
                    <span className="inline-flex items-center gap-1 text-xs text-amber-600 mt-0.5">
                      <AlertTriangle size={10} /> Possible duplicate
                    </span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <select
                    value={row.category}
                    onChange={(e) => onSetCategory(row.id, e.target.value as Category)}
                    className="text-xs px-2 py-1 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2 text-right font-semibold tabular-nums text-gray-900 whitespace-nowrap">
                  ${row.amount.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
