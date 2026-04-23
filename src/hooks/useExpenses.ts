"use client";

import { useState, useEffect, useCallback } from "react";
import { Expense, Mode } from "@/types/expense";
import { loadExpenses, saveExpenses, isQuotaError } from "@/lib/db";
import { generateId } from "@/lib/utils";

export type ExpenseInput = Omit<Expense, "id" | "createdAt">;

export function useExpenses(mode: Mode) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setHydrated(false);
    loadExpenses(mode)
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
  }, [mode]);

  const persist = useCallback(
    (updated: Expense[]) => {
      saveExpenses(mode, updated).then(
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
    [mode]
  );

  const addExpense = useCallback(
    (input: ExpenseInput) => {
      setExpenses((prev) => {
        const expense: Expense = {
          ...input,
          id: generateId(),
          createdAt: new Date().toISOString(),
        };
        const updated = [expense, ...prev];
        persist(updated);
        return updated;
      });
    },
    [persist]
  );

  const updateExpense = useCallback(
    (id: string, input: ExpenseInput) => {
      setExpenses((prev) => {
        const updated = prev.map((e) => (e.id === id ? { ...e, ...input } : e));
        persist(updated);
        return updated;
      });
    },
    [persist]
  );

  const deleteExpense = useCallback(
    (id: string) => {
      setExpenses((prev) => {
        const updated = prev.filter((e) => e.id !== id);
        persist(updated);
        return updated;
      });
    },
    [persist]
  );

  const bulkAddExpenses = useCallback(
    (inputs: ExpenseInput[]) => {
      setExpenses((prev) => {
        const newExpenses: Expense[] = inputs.map((input) => ({
          ...input,
          id: generateId(),
          createdAt: new Date().toISOString(),
        }));
        const updated = [...newExpenses, ...prev];
        persist(updated);
        return updated;
      });
    },
    [persist]
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
