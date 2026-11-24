"use client";

import * as React from "react";
import type { OnChangeFn, VisibilityState } from "@tanstack/react-table";

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

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setVisibility({
          ...defaults,
          ...(JSON.parse(saved) as VisibilityState),
        });
      }
    } catch {
      // Ignore unreadable or malformed saved state and keep the defaults.
    }
    // Restore once on mount; defaults are only the starting point.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

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
