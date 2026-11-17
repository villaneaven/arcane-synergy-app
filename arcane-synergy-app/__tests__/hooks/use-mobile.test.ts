import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useIsMobile } from "@/hooks/use-mobile";

type ChangeListener = () => void;

let listeners: Set<ChangeListener>;
let matchMedia: ReturnType<typeof vi.fn>;

/** jsdom has no matchMedia; this one records listeners so tests can fire them. */
function stubMatchMedia() {
  listeners = new Set();
  matchMedia = vi.fn((query: string) => ({
    media: query,
    matches: false,
    addEventListener: (_type: string, listener: ChangeListener) => listeners.add(listener),
    removeEventListener: (_type: string, listener: ChangeListener) => listeners.delete(listener),
  }));
  vi.stubGlobal("matchMedia", matchMedia);
}

function resizeTo(width: number) {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
}

const originalWidth = window.innerWidth;

beforeEach(() => {
  stubMatchMedia();
});

afterEach(() => {
  vi.unstubAllGlobals();
  resizeTo(originalWidth);
});

describe("useIsMobile", () => {
  it("is true below the 768px breakpoint", () => {
    resizeTo(767);

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(true);
  });

  it("is false at exactly 768px", () => {
    resizeTo(768);

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(false);
  });

  it("watches the media query that matches the same breakpoint", () => {
    resizeTo(1024);

    renderHook(() => useIsMobile());

    expect(matchMedia).toHaveBeenCalledWith("(max-width: 767px)");
  });

  it("updates when the viewport crosses the breakpoint", () => {
    resizeTo(1024);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);

    act(() => {
      resizeTo(500);
      listeners.forEach((listener) => listener());
    });

    expect(result.current).toBe(true);
  });

  it("stops listening when unmounted", () => {
    resizeTo(1024);
    const { unmount } = renderHook(() => useIsMobile());
    expect(listeners.size).toBe(1);

    unmount();

    expect(listeners.size).toBe(0);
  });
});
