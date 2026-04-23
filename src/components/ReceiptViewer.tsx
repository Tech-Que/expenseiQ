"use client";

import { useState } from "react";
import { Receipt } from "@/types/expense";
import { X, ZoomIn, ZoomOut, Download, RotateCcw, ChevronLeft, ChevronRight, FileText } from "lucide-react";

interface Props {
  receipts: Receipt[];
  initialIndex?: number;
  caption?: string;
  onClose: () => void;
}

export default function ReceiptViewer({ receipts, initialIndex = 0, caption, onClose }: Props) {
  const [idx, setIdx] = useState(Math.min(initialIndex, Math.max(receipts.length - 1, 0)));
  const [zoom, setZoom] = useState(1);

  const receipt = receipts[idx];
  if (!receipt) return null;

  const isPDF = receipt.mimeType?.startsWith("application/pdf");

  function download() {
    const a = document.createElement("a");
    a.href = receipt.base64;
    a.download = receipt.name || "receipt";
    a.click();
  }

  function prev() {
    setIdx((i) => Math.max(i - 1, 0));
    setZoom(1);
  }
  function next() {
    setIdx((i) => Math.min(i + 1, receipts.length - 1));
    setZoom(1);
  }

  return (
    <div className="fixed inset-0 bg-black/85 flex flex-col z-[60]">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/50 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {receipts.length > 1 && (
            <span className="text-white/60 text-sm shrink-0">
              {idx + 1} / {receipts.length}
            </span>
          )}
          {caption && (
            <span className="text-white/70 text-sm truncate">{caption}</span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {!isPDF && (
            <>
              <button
                onClick={() => setZoom((z) => Math.max(0.25, z - 0.25))}
                className="text-white/70 hover:text-white p-2 transition"
                title="Zoom out"
              >
                <ZoomOut size={16} />
              </button>
              <span className="text-white/60 text-xs w-10 text-center tabular-nums">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => setZoom((z) => Math.min(4, z + 0.25))}
                className="text-white/70 hover:text-white p-2 transition"
                title="Zoom in"
              >
                <ZoomIn size={16} />
              </button>
              <button
                onClick={() => setZoom(1)}
                className="text-white/70 hover:text-white p-2 transition"
                title="Reset zoom"
              >
                <RotateCcw size={14} />
              </button>
              <div className="w-px h-5 bg-white/20 mx-1" />
            </>
          )}
          <button
            onClick={download}
            className="text-white/70 hover:text-white p-2 transition"
            title="Download"
          >
            <Download size={16} />
          </button>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white p-2 transition"
            title="Close (Esc)"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Content area */}
      <div
        className="flex-1 overflow-auto flex items-start justify-center p-6"
        onClick={onClose}
      >
        <div onClick={(e) => e.stopPropagation()}>
          {isPDF ? (
            <div className="bg-white rounded-xl p-5 text-center shadow-2xl max-w-2xl w-full">
              <FileText size={40} className="text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 text-sm mb-3">{receipt.name}</p>
              <embed
                src={receipt.base64}
                type="application/pdf"
                className="w-full rounded"
                style={{ height: "60vh", minWidth: "400px" }}
              />
              <button
                onClick={download}
                className="mt-3 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm transition"
              >
                Open / Download PDF
              </button>
            </div>
          ) : (
            <img
              src={receipt.base64}
              alt="Receipt"
              className="rounded-lg shadow-2xl object-contain max-w-[90vw]"
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: "top center",
                transition: "transform 0.15s ease",
                maxHeight: zoom === 1 ? "80vh" : undefined,
              }}
            />
          )}
        </div>
      </div>

      {/* Navigation arrows */}
      {receipts.length > 1 && (
        <>
          <button
            onClick={prev}
            disabled={idx === 0}
            className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 disabled:opacity-20 rounded-full p-3 text-white transition"
          >
            <ChevronLeft size={22} />
          </button>
          <button
            onClick={next}
            disabled={idx === receipts.length - 1}
            className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 disabled:opacity-20 rounded-full p-3 text-white transition"
          >
            <ChevronRight size={22} />
          </button>
        </>
      )}
    </div>
  );
}
