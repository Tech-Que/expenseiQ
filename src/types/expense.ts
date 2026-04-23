export type Mode = "personal" | "business";

export type PersonalCategory =
  | "Food"
  | "Transportation"
  | "Entertainment"
  | "Shopping"
  | "Bills"
  | "Other";

export type BusinessCategory =
  | "Office Supplies"
  | "Travel"
  | "Meals & Entertainment"
  | "Vehicle/Mileage"
  | "Utilities"
  | "Software/Subscriptions"
  | "Professional Services"
  | "Marketing/Advertising"
  | "Equipment"
  | "Contractor Payments"
  | "Other Business";

export type Category = PersonalCategory | BusinessCategory;

export type PaymentMethod = "Cash" | "Credit Card" | "Debit Card" | "Check" | "ACH";

export interface Receipt {
  id: string;
  base64: string;
  name: string;
  mimeType: string; // "image/jpeg" | "image/png" | "application/pdf"
  size?: number;
  createdAt: string;
}

export interface Expense {
  id: string;
  mode: Mode;
  /** Cognito user ID (sub) — stamped on every expense so data is per-user. */
  userId?: string;
  date: string; // YYYY-MM-DD
  amount: number;
  category: Category;
  description: string;
  createdAt: string;
  // Business-only optional fields
  vendor?: string;
  paymentMethod?: PaymentMethod;
  taxDeductible?: boolean;
  // Receipts (new multi-receipt format)
  receipts?: Receipt[];
  // Deprecated single-receipt fields — kept for backward compatibility
  receiptBase64?: string;
  receiptName?: string;
}

export type SortField = "date" | "amount" | "category";
export type SortDirection = "asc" | "desc";
export type QuarterFilter = "All" | "Q1" | "Q2" | "Q3" | "Q4";

export interface Filters {
  search: string;
  category: Category | "All";
  dateFrom: string;
  dateTo: string;
  quarter: QuarterFilter;
  taxYear: number;
  taxDeductibleOnly: boolean;
}

export interface AppSettings {
  monthlyIncome: number;
  businessName: string;
}
