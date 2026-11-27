"use client";

import * as React from "react";
import type { OnChangeFn, VisibilityState } from "@tanstack/react-table";

import { useHydrated } from "@/hooks/use-hydrated";

function load(storageKey: string): VisibilityState | null {
  try {
    const saved = localStorage.getItem(storageKey);
    return saved ? (JSON.parse(saved) as VisibilityState) : null;
  } catch {
    // Ignore unreadable or malformed saved state and keep the defaults.
    return null;
  }
}

function save(storageKey: string, visibility: VisibilityState) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(visibility));
  } catch {
    // Storage can be unavailable (private mode, blocked site data).
  }
}

/**
 * Column visibility that starts from `defaults` and is remembered in this
 * browser under `storageKey`. Saved choices are restored after mount (so the
 * server render and first client render match), layered over the defaults so
 * columns added later still get their default.
 */
export function useSavedColumnVisibility(
  storageKey: string,
  defaults: VisibilityState,
) {
  const [visibility, setVisibility] = React.useState(defaults);
  const hydrated = useHydrated();
  const [restoredKey, setRestoredKey] = React.useState<string | null>(null);

  if (hydrated && restoredKey !== storageKey) {
    setRestoredKey(storageKey);
    const saved = load(storageKey);
    if (saved) setVisibility({ ...defaults, ...saved });
  }

  const onVisibilityChange: OnChangeFn<VisibilityState> = (updater) => {
    setVisibility((current) => {
      const next = typeof updater === "function" ? updater(current) : updater;
      save(storageKey, next);
      return next;
    });
  };

  const applyVisibility = (next: VisibilityState) => {
    setVisibility(next);
    save(storageKey, next);
  };

  return { visibility, onVisibilityChange, applyVisibility };
}
