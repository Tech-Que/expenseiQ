import { Expense, Receipt } from "@/types/expense";
import { format } from "date-fns";

/** Normalise legacy single-receipt fields into the new receipts array. */
export function getExpenseReceipts(expense: Expense): Receipt[] {
  if (expense.receipts && expense.receipts.length > 0) return expense.receipts;
  if (expense.receiptBase64) {
    return [
      {
        id: "legacy",
        base64: expense.receiptBase64,
        name: expense.receiptName ?? "Receipt",
        mimeType: "image/jpeg",
        createdAt: expense.createdAt,
      },
    ];
  }
  return [];
}

export async function exportReceiptsZip(expenses: Expense[]): Promise<void> {
  // Dynamically import so it doesn't bloat the initial bundle
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  const folder = zip.folder("receipts");

  let count = 0;
  expenses.forEach((expense) => {
    const receipts = getExpenseReceipts(expense);
    receipts.forEach((receipt, i) => {
      const raw = receipt.base64.split(",")[1];
      if (!raw) return;
      const ext = (receipt.mimeType ?? "image/jpeg").split("/")[1] ?? "jpg";
      const safeName = expense.description.slice(0, 25).replace(/[^\w]/g, "_");
      folder?.file(`${expense.date}_${safeName}_${i + 1}.${ext}`, raw, {
        base64: true,
      });
      count++;
    });
  });

  if (count === 0) {
    alert("No receipts found to export.");
    return;
  }

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `receipts-${format(new Date(), "yyyy-MM-dd")}.zip`;
  a.click();
  URL.revokeObjectURL(url);
}
