import { Expense, Mode } from "@/types/expense";

const DB_NAME = "expenseiq";
const LEGACY_DB_NAME = "expense-tracker";
// v2: switched from in-line keyPath "mode" to out-of-line keys so rows can be
// addressed per-user, e.g. "<cognito-sub>:personal".
const DB_VERSION = 2;
const STORE = "expenses";

const LS_KEYS: Record<Mode, string> = {
  personal: "personal_expenses",
  business: "business_expenses",
};
const LS_MIGRATION_KEY = "idb_migrated_v1";
const LEGACY_DB_MIGRATION_KEY = "idb_migrated_from_legacy_v1";
const USER_MIGRATION_KEY_PREFIX = "idb_migrated_to_user_v1:";

/** Storage-row key. Per-user when we know the user; falls back to plain mode pre-auth. */
function rowKey(userId: string | undefined, mode: Mode): string {
  return userId ? `${userId}:${mode}` : mode;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB not available"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (event) => {
      const db = req.result;
      const tx = req.transaction;
      const oldVersion = event.oldVersion;

      if (oldVersion < 1 || !db.objectStoreNames.contains(STORE)) {
        // Fresh DB — create store with out-of-line keys.
        if (db.objectStoreNames.contains(STORE)) db.deleteObjectStore(STORE);
        db.createObjectStore(STORE);
        return;
      }

      // v1 → v2 upgrade: old store used `keyPath: "mode"`. Read its rows, drop
      // the store, recreate without a keyPath, and re-insert rows keyed by mode.
      if (oldVersion < 2 && tx) {
        const oldStore = tx.objectStore(STORE);
        const getAll = oldStore.getAll();
        getAll.onsuccess = () => {
          const rows = (getAll.result as Array<{ mode: Mode; expenses: Expense[] }>) ?? [];
          db.deleteObjectStore(STORE);
          const newStore = db.createObjectStore(STORE);
          for (const row of rows) {
            if (row?.mode) newStore.put({ mode: row.mode, expenses: row.expenses ?? [] }, row.mode);
          }
        };
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

interface StoredRow {
  mode: Mode;
  expenses: Expense[];
  userId?: string;
}

async function idbGetRaw(key: string): Promise<StoredRow | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => resolve((req.result as StoredRow | undefined) ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function idbPutRaw(key: string, row: StoredRow): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const req = tx.objectStore(STORE).put(row, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error("Transaction aborted"));
  });
}

async function idbDeleteRaw(key: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const req = tx.objectStore(STORE).delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * One-time migration: copy expenses from the legacy "expense-tracker" IDB
 * into "expenseiq". Safe to call when the legacy DB doesn't exist.
 */
async function migrateFromLegacyDb(): Promise<void> {
  if (typeof window === "undefined" || typeof indexedDB === "undefined") return;
  if (localStorage.getItem(LEGACY_DB_MIGRATION_KEY) === "done") return;

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
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } catch {
    localStorage.setItem(LEGACY_DB_MIGRATION_KEY, "done");
    return;
  }

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
    legacyDb.close();
    return;
  }

  legacyDb.close();

  for (const entry of legacyData) {
    if (!entry || !Array.isArray(entry.expenses) || entry.expenses.length === 0) continue;
    try {
      // Legacy rows land under the plain-mode key (no user). The first user
      // to sign in afterwards will inherit them via migrateLegacyModeDataToUser.
      const existing = await idbGetRaw(entry.mode);
      if (existing && existing.expenses.length > 0) continue;
      await idbPutRaw(entry.mode, { mode: entry.mode, expenses: entry.expenses });
    } catch {
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
      req.onblocked = () => resolve();
    } catch {
      resolve();
    }
  });
}

/** One-time migration: move expenses out of localStorage into IndexedDB (under the plain-mode key). */
async function migrateFromLocalStorage(): Promise<void> {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(LS_MIGRATION_KEY) === "done") return;

  for (const mode of ["personal", "business"] as Mode[]) {
    const raw = localStorage.getItem(LS_KEYS[mode]);
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw) as Expense[];
      if (!Array.isArray(parsed) || parsed.length === 0) continue;
      const existing = await idbGetRaw(mode);
      if (existing && existing.expenses.length > 0) continue;
      await idbPutRaw(mode, { mode, expenses: parsed });
      localStorage.removeItem(LS_KEYS[mode]);
    } catch {
      /* ignore */
    }
  }
  localStorage.setItem(LS_MIGRATION_KEY, "done");
}

/**
 * Once per (browser + user), adopt any orphaned pre-auth data (stored under the
 * plain mode key with no userId) into the current user's namespace. Ensures the
 * first logged-in user inherits their previously-local expenses. Subsequent
 * users start clean.
 */
async function migrateLegacyModeDataToUser(userId: string): Promise<void> {
  if (typeof window === "undefined") return;
  const markerKey = `${USER_MIGRATION_KEY_PREFIX}${userId}`;
  if (localStorage.getItem(markerKey) === "done") return;

  for (const mode of ["personal", "business"] as Mode[]) {
    const legacy = await idbGetRaw(mode);
    if (!legacy || legacy.expenses.length === 0) continue;

    const userKey = rowKey(userId, mode);
    const already = await idbGetRaw(userKey);
    if (already && already.expenses.length > 0) continue;

    const tagged = legacy.expenses.map((e) => ({ ...e, userId }));
    await idbPutRaw(userKey, { mode, expenses: tagged, userId });
    await idbDeleteRaw(mode);
  }
  localStorage.setItem(markerKey, "done");
}

/** Load expenses for a specific user + mode. */
export async function loadExpenses(userId: string | undefined, mode: Mode): Promise<Expense[]> {
  if (typeof window === "undefined") return [];
  try {
    await migrateFromLegacyDb();
    await migrateFromLocalStorage();
    if (userId) await migrateLegacyModeDataToUser(userId);
    const row = await idbGetRaw(rowKey(userId, mode));
    return row?.expenses ?? [];
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
 * Save expenses for a specific user + mode. Prefers IndexedDB.
 * Throws on quota errors so the UI can surface them.
 */
export async function saveExpenses(
  userId: string | undefined,
  mode: Mode,
  expenses: Expense[]
): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    await idbPutRaw(rowKey(userId, mode), { mode, expenses, userId });
    return;
  } catch (err) {
    if (isQuotaError(err)) throw err;
    // IDB not available — fall back to localStorage (only safe pre-auth / single-user).
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
