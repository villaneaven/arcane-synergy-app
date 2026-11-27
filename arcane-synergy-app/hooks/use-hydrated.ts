import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * False on the server and during hydration, true after. Use it to show
 * browser-only values (localStorage, random picks, the local clock) without a
 * hydration mismatch and without setting state in an effect.
 */
export function useHydrated() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
