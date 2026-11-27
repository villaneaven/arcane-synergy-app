import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSavedColumnVisibility } from "@/app/(app)/forms/admissions/use-saved-column-visibility";

const KEY = "test-columns";
const defaults = { name: true, mrn: true, notes: false };

describe("useSavedColumnVisibility", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("starts from the defaults when nothing is saved", () => {
    const { result } = renderHook(() => useSavedColumnVisibility(KEY, defaults));

    expect(result.current.visibility).toEqual(defaults);
  });

  it("layers saved choices over the defaults", () => {
    // `notes` was saved; `mrn` was added after the save and keeps its default.
    localStorage.setItem(KEY, JSON.stringify({ name: false, notes: true }));

    const { result } = renderHook(() => useSavedColumnVisibility(KEY, defaults));

    expect(result.current.visibility).toEqual({ name: false, mrn: true, notes: true });
  });

  it("keeps the defaults when the saved value is malformed", () => {
    localStorage.setItem(KEY, "{not json");

    const { result } = renderHook(() => useSavedColumnVisibility(KEY, defaults));

    expect(result.current.visibility).toEqual(defaults);
  });

  it("reads storage once, not on every render", () => {
    const getItem = vi.spyOn(Storage.prototype, "getItem");
    const { rerender } = renderHook(() => useSavedColumnVisibility(KEY, defaults));

    rerender();
    rerender();

    expect(getItem).toHaveBeenCalledTimes(1);
  });

  it("restores again when the storage key changes", () => {
    localStorage.setItem("other-columns", JSON.stringify({ name: false }));
    const { result, rerender } = renderHook(
      ({ storageKey }) => useSavedColumnVisibility(storageKey, defaults),
      { initialProps: { storageKey: KEY } },
    );
    expect(result.current.visibility.name).toBe(true);

    rerender({ storageKey: "other-columns" });

    expect(result.current.visibility.name).toBe(false);
  });

  it("saves changes from the table and from presets", () => {
    const { result } = renderHook(() => useSavedColumnVisibility(KEY, defaults));

    act(() => result.current.onVisibilityChange((v) => ({ ...v, notes: true })));
    expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual({ ...defaults, notes: true });

    act(() => result.current.applyVisibility({ name: false }));
    expect(result.current.visibility).toEqual({ name: false });
    expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual({ name: false });
  });

  it("keeps a change made after the restore", () => {
    localStorage.setItem(KEY, JSON.stringify({ notes: true }));
    const { result, rerender } = renderHook(() => useSavedColumnVisibility(KEY, defaults));

    act(() => result.current.onVisibilityChange((v) => ({ ...v, name: false })));
    rerender();

    expect(result.current.visibility).toEqual({ name: false, mrn: true, notes: true });
  });
});
