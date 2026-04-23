"use client";

import { useState, useEffect, useCallback } from "react";
import { Expense, Mode } from "@/types/expense";
import { loadExpenses, saveExpenses, isQuotaError } from "@/lib/db";
import { generateId } from "@/lib/utils";

export type ExpenseInput = Omit<Expense, "id" | "createdAt" | "userId">;

/**
 * Per-user expense store. Pass the Cognito sub as `userId`; pass undefined while
 * the session is still hydrating and the hook will stay idle.
 */
export function useExpenses(userId: string | undefined, mode: Mode) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setHydrated(false);

    if (!userId) {
      // No authenticated user yet — keep the hook inert but let callers continue.
      setExpenses([]);
      setHydrated(true);
      return () => {
        cancelled = true;
      };
    }

    loadExpenses(userId, mode)
      .then((data) => {
        if (cancelled) return;
        setExpenses(data);
        setHydrated(true);
      })
      .catch(() => {
        if (cancelled) return;
        setStorageError(
          "Couldn't load expenses from storage. If you're in private/incognito mode, try a normal window."
        );
        setHydrated(true);
      });

    return () => {
      cancelled = true;
    };
  }, [userId, mode]);

  const persist = useCallback(
    (updated: Expense[]) => {
      if (!userId) return;
      saveExpenses(userId, mode, updated).then(
        () => setStorageError(null),
        (err) => {
          if (isQuotaError(err)) {
            setStorageError(
              "Storage is full. Remove some receipts or older expenses to free up space."
            );
          } else {
            setStorageError("Couldn't save your latest changes to storage.");
          }
        }
      );
    },
    [userId, mode]
  );

  const addExpense = useCallback(
    (input: ExpenseInput) => {
      if (!userId) return;
      setExpenses((prev) => {
        const expense: Expense = {
          ...input,
          id: generateId(),
          userId,
          createdAt: new Date().toISOString(),
        };
        const updated = [expense, ...prev];
        persist(updated);
        return updated;
      });
    },
    [userId, persist]
  );

  const updateExpense = useCallback(
    (id: string, input: ExpenseInput) => {
      if (!userId) return;
      setExpenses((prev) => {
        const updated = prev.map((e) => (e.id === id ? { ...e, ...input, userId } : e));
        persist(updated);
        return updated;
      });
    },
    [userId, persist]
  );

  const deleteExpense = useCallback(
    (id: string) => {
      if (!userId) return;
      setExpenses((prev) => {
        const updated = prev.filter((e) => e.id !== id);
        persist(updated);
        return updated;
      });
    },
    [userId, persist]
  );

  const bulkAddExpenses = useCallback(
    (inputs: ExpenseInput[]) => {
      if (!userId) return;
      setExpenses((prev) => {
        const newExpenses: Expense[] = inputs.map((input) => ({
          ...input,
          id: generateId(),
          userId,
          createdAt: new Date().toISOString(),
        }));
        const updated = [...newExpenses, ...prev];
        persist(updated);
        return updated;
      });
    },
    [userId, persist]
  );

  const dismissStorageError = useCallback(() => setStorageError(null), []);

  return {
    expenses,
    hydrated,
    storageError,
    dismissStorageError,
    addExpense,
    updateExpense,
    deleteExpense,
    bulkAddExpenses,
  };
}
