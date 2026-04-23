import { Category, Expense, Mode } from "@/types/expense";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ParsedCSV {
  headers: string[];
  rows: string[][];
}

export interface ParsedTransaction {
  date: string;
  amount: number;
  description: string;
  vendor?: string;
}

export interface CSVMapping {
  date: number;
  amount: number;
  description: number;
  vendor: number;
  credit: number; // separate credit column (Capital One style); -1 if none
}

export type AmountSign = "negative" | "positive" | "absolute";

export interface ImportRow {
  id: string;
  date: string;
  amount: number;
  description: string;
  vendor: string;
  suggestedCategory: Category;
  category: Category;
  isDuplicate: boolean;
  selected: boolean;
}

// ─── CSV Parser ───────────────────────────────────────────────────────────────

export function parseCSV(text: string): ParsedCSV {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim().split("\n");
  const headers = parseCSVRow(lines[0] ?? "");
  const rows = lines.slice(1).filter((l) => l.trim()).map(parseCSVRow);
  return { headers, rows };
}

function parseCSVRow(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

// ─── OFX / QFX Parser ────────────────────────────────────────────────────────

export function parseOFX(text: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  // Split on opening STMTTRN tag (handles both SGML and XML OFX)
  const parts = text.split(/<STMTTRN>/i);
  for (let i = 1; i < parts.length; i++) {
    const block = parts[i].split(/<\/STMTTRN>/i)[0];
    const get = (tag: string) => {
      const m = new RegExp(`<${tag}>\\s*([^\\n<]+)`, "i").exec(block);
      return m ? m[1].trim() : "";
    };

    const dateRaw = get("DTPOSTED") || get("DTUSER");
    const amtRaw = get("TRNAMT");
    const name = get("NAME");
    const memo = get("MEMO");
    const trnType = get("TRNTYPE").toUpperCase();

    if (!dateRaw || !amtRaw) continue;
    if (["CREDIT", "INT", "DIV", "XFER"].includes(trnType)) continue;

    const date = dateRaw.replace(/^(\d{4})(\d{2})(\d{2}).*/, "$1-$2-$3");
    const amount = Math.abs(parseFloat(amtRaw));
    if (isNaN(amount) || amount === 0) continue;

    transactions.push({
      date,
      amount,
      description: (memo || name).trim(),
      vendor: name.trim() || undefined,
    });
  }
  return transactions;
}

// ─── Auto-detect column mapping ───────────────────────────────────────────────

const DATE_HINTS = ["date", "transaction date", "posted date", "trans date", "txn date", "post date"];
const AMOUNT_HINTS = ["amount", "transaction amount", "charge amount", "debit", "debits", "withdrawal"];
const DESC_HINTS = ["description", "merchant name", "name", "payee", "details", "memo", "narrative", "transaction description"];
const VENDOR_HINTS = ["vendor", "merchant", "store name", "payee name"];
const CREDIT_HINTS = ["credit", "credits", "deposit", "payment", "credit amount"];

function bestCol(headers: string[], hints: string[]): number {
  const normalized = headers.map((h) => h.toLowerCase().trim());
  for (const hint of hints) {
    const idx = normalized.findIndex((h) => h.includes(hint));
    if (idx !== -1) return idx;
  }
  return -1;
}

export function autoDetectMapping(headers: string[]): CSVMapping {
  return {
    date: bestCol(headers, DATE_HINTS),
    amount: bestCol(headers, AMOUNT_HINTS),
    description: bestCol(headers, DESC_HINTS),
    vendor: bestCol(headers, VENDOR_HINTS),
    credit: bestCol(headers, CREDIT_HINTS),
  };
}

// ─── Map a single CSV row to a ParsedTransaction ─────────────────────────────

export function mapCSVRow(
  row: string[],
  mapping: CSVMapping,
  amountSign: AmountSign
): ParsedTransaction | null {
  const col = (idx: number) => (idx >= 0 && idx < row.length ? row[idx].trim() : "");

  const dateRaw = col(mapping.date);
  const amtRaw = col(mapping.amount).replace(/[$,\s]/g, "");
  const creditRaw = col(mapping.credit).replace(/[$,\s]/g, "");
  const description = col(mapping.description) || col(mapping.vendor);
  const vendor = col(mapping.vendor);

  if (!dateRaw || !description) return null;

  // If this row has a credit but no debit → skip (it's income, not an expense)
  if (mapping.credit >= 0 && creditRaw && !amtRaw) return null;

  const date = parseDate(dateRaw);
  if (!date) return null;

  const rawAmount = parseFloat(amtRaw || "0");
  if (isNaN(rawAmount)) return null;

  let amount: number;
  if (amountSign === "absolute") amount = Math.abs(rawAmount);
  else if (amountSign === "negative") amount = rawAmount < 0 ? Math.abs(rawAmount) : 0;
  else amount = rawAmount > 0 ? rawAmount : 0;

  if (amount <= 0) return null;

  return {
    date,
    amount,
    description: description.trim(),
    vendor: vendor.trim() || undefined,
  };
}

function parseDate(raw: string): string | null {
  const s = raw.replace(/['"]/g, "").trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const mdy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s);
  if (mdy) return `${mdy[3]}-${mdy[1].padStart(2, "0")}-${mdy[2].padStart(2, "0")}`;
  const dmy = /^(\d{1,2})-(\d{1,2})-(\d{4})/.exec(s);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  try {
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  } catch {
    /* ignore */
  }
  return null;
}

// ─── Auto-categorization ─────────────────────────────────────────────────────

const PERSONAL_RULES: { kw: string[]; cat: Category }[] = [
  { kw: ["UBER", "LYFT", "TAXI", "METRO", "TRANSIT", "SHELL", "CHEVRON", "EXXON", "BP OIL", "SUNOCO", "GAS STATION", "PARKING", "AMTRAK", "GREYHOUND", "DELTA AIR", "AMERICAN AIR", "UNITED AIR", "SOUTHWEST AIR", "JETBLUE", "SPIRIT AIR", "FRONTIER AIR"], cat: "Transportation" },
  { kw: ["NETFLIX", "HULU", "DISNEY PLUS", "HBO MAX", "SPOTIFY", "APPLE MUSIC", "YOUTUBE PREMIUM", "AMC THEATRE", "REGAL CINEMA", "CINEMARK", "TICKETMASTER", "STUBHUB", "STEAM GAMES", "PLAYSTATION", "XBOX LIVE", "NINTENDO ESHOP", "AMAZON PRIME VIDEO"], cat: "Entertainment" },
  { kw: ["AMAZON", "WALMART", "TARGET", "COSTCO", "BEST BUY", "HOME DEPOT", "LOWES", "IKEA", "ETSY", "EBAY", "MACYS", "NORDSTROM", "ZARA", "UNIQLO", "GAP", "OLD NAVY", "H&M", "KOHLS", "TJMAXX", "MARSHALLS"], cat: "Shopping" },
  { kw: ["WHOLE FOODS", "TRADER JOE", "KROGER", "SAFEWAY", "MCDONALDS", "CHIPOTLE", "SUBWAY", "STARBUCKS", "DUNKIN", "PANERA", "DOMINOS", "PIZZA HUT", "GRUBHUB", "DOORDASH", "INSTACART", "RESTAURANT", "EATERY", "DINER", "CAFE", "BAKERY", "SUSHI", "TACO BELL", "BURGER KING", "WENDYS", "CHICK-FIL-A"], cat: "Food" },
  { kw: ["ELECTRIC", "GAS COMPANY", "WATER BILL", "COMCAST", "AT&T", "VERIZON", "T-MOBILE", "SPECTRUM", "COX CABLE", "RENT PAYMENT", "HEALTH INSURANCE", "DENTAL PLAN", "VISION PLAN", "LOAN PAYMENT", "MORTGAGE"], cat: "Bills" },
];

const BUSINESS_RULES: { kw: string[]; cat: Category }[] = [
  { kw: ["OFFICE DEPOT", "STAPLES", "OFFICEMAX", "INK CARTRIDGE", "TONER", "PRINTER SUPPLY"], cat: "Office Supplies" },
  { kw: ["DELTA AIR", "AMERICAN AIR", "UNITED AIR", "SOUTHWEST", "HOTEL", "MARRIOTT", "HILTON", "HYATT", "AIRBNB", "EXPEDIA", "ENTERPRISE RENT", "HERTZ", "AVIS"], cat: "Travel" },
  { kw: ["RESTAURANT", "CATERING", "BUSINESS MEAL", "COFFEE MEETING"], cat: "Meals & Entertainment" },
  { kw: ["SHELL OIL", "CHEVRON", "EXXON", "SUNOCO", "BP STATION", "FUEL", "AUTO PARTS", "JIFFY LUBE"], cat: "Vehicle/Mileage" },
  { kw: ["ELECTRIC BILL", "GAS UTILITY", "WATER UTILITY", "COMCAST BUSINESS", "SPECTRUM BUSINESS", "AT&T BUSINESS"], cat: "Utilities" },
  { kw: ["ADOBE", "MICROSOFT 365", "QUICKBOOKS", "SLACK", "ZOOM", "DROPBOX", "GITHUB", "AWS", "AMAZON WEB", "GOOGLE CLOUD", "SALESFORCE", "HUBSPOT", "MAILCHIMP", "ASANA", "NOTION", "FIGMA", "CANVA PRO", "ZENDESK", "NETFLIX", "SPOTIFY"], cat: "Software/Subscriptions" },
  { kw: ["LAW OFFICE", "ATTORNEY", "ACCOUNTANT", "CPA FIRM", "CONSULTANT", "LEGAL SERVICE", "TAX PREP", "BOOKKEEPING"], cat: "Professional Services" },
  { kw: ["FACEBOOK ADS", "GOOGLE ADS", "META ADS", "LINKEDIN ADS", "ADVERTISING", "MARKETING FIRM", "VISTAPRINT"], cat: "Marketing/Advertising" },
  { kw: ["APPLE STORE", "BEST BUY BIZ", "DELL", "HP STORE", "LENOVO", "EQUIPMENT", "WORKSTATION", "SERVER"], cat: "Equipment" },
  { kw: ["PAYROLL", "CONTRACTOR", "FREELANCE", "UPWORK", "FIVERR", "SUBCONTRACTOR"], cat: "Contractor Payments" },
];

export function autoCategorize(description: string, mode: Mode): Category {
  const upper = description.toUpperCase();
  const rules = mode === "personal" ? PERSONAL_RULES : BUSINESS_RULES;
  for (const { kw, cat } of rules) {
    if (kw.some((k) => upper.includes(k))) return cat;
  }
  return mode === "personal" ? "Other" : "Other Business";
}

// ─── Duplicate detection ──────────────────────────────────────────────────────

export function isDuplicate(trn: ParsedTransaction, existing: Expense[]): boolean {
  return existing.some((e) => {
    const dayDiff =
      Math.abs(new Date(e.date).getTime() - new Date(trn.date).getTime()) / 86400000;
    const amtMatch = Math.abs(e.amount - trn.amount) < 0.02;
    const shortDesc = trn.description.toLowerCase().slice(0, 8);
    const descMatch =
      shortDesc.length > 3 &&
      (e.description.toLowerCase().includes(shortDesc) ||
        trn.description.toLowerCase().includes(e.description.toLowerCase().slice(0, 8)));
    return dayDiff <= 1 && amtMatch && descMatch;
  });
}

// ─── Bank export instructions ─────────────────────────────────────────────────

export interface BankInstructions {
  bank: string;
  formats: string[];
  steps: string[];
}

export const BANK_INSTRUCTIONS: BankInstructions[] = [
  {
    bank: "Chase",
    formats: ["CSV"],
    steps: [
      "Log in to chase.com",
      "Open the account you want to export",
      'Click "Download account activity" (↓ icon)',
      "Select date range and choose CSV format",
      "Download and import here",
    ],
  },
  {
    bank: "Bank of America",
    formats: ["CSV", "QFX"],
    steps: [
      "Log in to bankofamerica.com",
      "Go to Accounts → Download Center",
      "Select account, date range, and format (CSV or QFX)",
      "Click Download",
    ],
  },
  {
    bank: "Wells Fargo",
    formats: ["CSV", "OFX"],
    steps: [
      "Log in to wellsfargo.com",
      "Select your account",
      'Click "Download Account Activity"',
      "Choose date range → CSV or OFX",
    ],
  },
  {
    bank: "Capital One",
    formats: ["CSV", "OFX"],
    steps: [
      "Log in to capitalone.com",
      'Click "View Transactions" on your card/account',
      'Select "Download" or the export icon',
      "Choose CSV or OFX format",
    ],
  },
];
