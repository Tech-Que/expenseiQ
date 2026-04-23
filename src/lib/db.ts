import { Expense, Mode } from "@/types/expense";

const DB_NAME = "expenseiq";
const LEGACY_DB_NAME = "expense-tracker";
const DB_VERSION = 1;
const STORE = "expenses";

const LS_KEYS: Record<Mode, string> = {
  personal: "personal_expenses",
  business: "business_expenses",
};
const LS_MIGRATION_KEY = "idb_migrated_v1";
const LEGACY_DB_MIGRATION_KEY = "idb_migrated_from_legacy_v1";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB not available"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "mode" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("Failed to open IndexedDB"));
    req.onblocked = () => reject(new Error("IndexedDB blocked"));
  }).catch((err) => {
    dbPromise = null;
    throw err;
  });
  return dbPromise;
}

async function idbGet(mode: Mode): Promise<Expense[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(mode);
    req.onsuccess = () => resolve((req.result?.expenses as Expense[] | undefined) ?? []);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut(mode: Mode, expenses: Expense[]): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const req = tx.objectStore(STORE).put({ mode, expenses });
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error("Transaction aborted"));
  });
}

/**
 * One-time migration: copy expenses from the legacy "expense-tracker" IndexedDB
 * into the new "expenseiq" database, then delete the old DB.
 *
 * Runs once per browser (gated by LEGACY_DB_MIGRATION_KEY in localStorage).
 * Safe to call when the legacy DB doesn't exist.
 */
async function migrateFromLegacyDb(): Promise<void> {
  if (typeof window === "undefined" || typeof indexedDB === "undefined") return;
  if (localStorage.getItem(LEGACY_DB_MIGRATION_KEY) === "done") return;

  // Skip if the browser can tell us the legacy DB doesn't exist.
  // (indexedDB.databases() is available in Chrome/Edge/Safari and Firefox 126+.)
  if (typeof indexedDB.databases === "function") {
    try {
      const list = await indexedDB.databases();
      if (!list.some((db) => db.name === LEGACY_DB_NAME)) {
        localStorage.setItem(LEGACY_DB_MIGRATION_KEY, "done");
        return;
      }
    } catch {
      // Fall through and attempt the open-based detection below.
    }
  }

  let legacyDb: IDBDatabase;
  try {
    legacyDb = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(LEGACY_DB_NAME, 1);
      // Intentionally no onupgradeneeded: if the DB happens not to exist we'll
      // detect that after open by inspecting objectStoreNames.
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } catch {
    localStorage.setItem(LEGACY_DB_MIGRATION_KEY, "done");
    return;
  }

  // No expenses store => either the DB never existed (just created empty by our
  // open call) or it was an unrelated DB of the same name. Nothing to copy.
  if (!legacyDb.objectStoreNames.contains(STORE)) {
    legacyDb.close();
    await deleteLegacyDbSafe();
    localStorage.setItem(LEGACY_DB_MIGRATION_KEY, "done");
    return;
  }

  let legacyData: Array<{ mode: Mode; expenses: Expense[] }> = [];
  try {
    legacyData = await new Promise((resolve, reject) => {
      const tx = legacyDb.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => resolve((req.result as Array<{ mode: Mode; expenses: Expense[] }>) ?? []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    // Read failed — close and leave data intact so the next launch can retry.
    legacyDb.close();
    return;
  }

  legacyDb.close();

  for (const entry of legacyData) {
    if (!entry || !Array.isArray(entry.expenses) || entry.expenses.length === 0) continue;
    try {
      const existing = await idbGet(entry.mode);
      if (existing.length > 0) continue; // new DB already has data for this mode — don't clobber
      await idbPut(entry.mode, entry.expenses);
    } catch {
      // Write failed — abort migration and preserve the legacy DB for retry.
      return;
    }
  }

  await deleteLegacyDbSafe();
  localStorage.setItem(LEGACY_DB_MIGRATION_KEY, "done");
}

function deleteLegacyDbSafe(): Promise<void> {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.deleteDatabase(LEGACY_DB_NAME);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
      // `blocked` fires when another tab has the legacy DB open. Skip silently;
      // next launch will retry via the migration key still being unset.
      req.onblocked = () => resolve();
    } catch {
      resolve();
    }
  });
}

/** One-time migration: move expenses out of localStorage into IndexedDB. */
async function migrateFromLocalStorage(): Promise<void> {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(LS_MIGRATION_KEY) === "done") return;

  for (const mode of ["personal", "business"] as Mode[]) {
    const raw = localStorage.getItem(LS_KEYS[mode]);
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw) as Expense[];
      if (!Array.isArray(parsed) || parsed.length === 0) continue;
      const existing = await idbGet(mode);
      if (existing.length > 0) continue;
      await idbPut(mode, parsed);
      localStorage.removeItem(LS_KEYS[mode]);
    } catch {
      // malformed or IDB failed — leave original data alone
    }
  }
  localStorage.setItem(LS_MIGRATION_KEY, "done");
}

/** Load expenses. Tries IndexedDB; falls back to localStorage if IDB is unavailable. */
export async function loadExpenses(mode: Mode): Promise<Expense[]> {
  if (typeof window === "undefined") return [];
  try {
    await migrateFromLegacyDb();
    await migrateFromLocalStorage();
    return await idbGet(mode);
  } catch {
    const raw = localStorage.getItem(LS_KEYS[mode]);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as Expense[];
    } catch {
      return [];
    }
  }
}

/**
 * Save expenses. Prefers IndexedDB (much larger quota than localStorage).
 * Throws on quota errors so the UI can surface them.
 */
export async function saveExpenses(mode: Mode, expenses: Expense[]): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    await idbPut(mode, expenses);
    return;
  } catch (err) {
    if (isQuotaError(err)) throw err;
    // IDB not available — fall back to localStorage
    try {
      localStorage.setItem(LS_KEYS[mode], JSON.stringify(expenses));
    } catch (lsErr) {
      throw lsErr;
    }
  }
}

export function isQuotaError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { name?: string; code?: number; message?: string };
  return (
    e.name === "QuotaExceededError" ||
    e.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
    e.code === 22 ||
    e.code === 1014 ||
    (typeof e.message === "string" && e.message.toLowerCase().includes("quota"))
  );
}
