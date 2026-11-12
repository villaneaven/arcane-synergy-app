import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useGreeting } from "@/hooks/use-greeting";

function renderAt(isoDateTime: string) {
  vi.setSystemTime(new Date(isoDateTime));
  return renderHook(() => useGreeting());
}

beforeEach(() => {
  // Only Date is faked: faking timers as well would stall React's scheduler.
  vi.useFakeTimers({ toFake: ["Date"] });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useGreeting", () => {
  it("returns a non-empty greeting after mount", () => {
    const { result } = renderAt("2025-03-10T09:00:00");

    expect(result.current.length).toBeGreaterThan(0);
  });

  it("can pick a morning greeting before noon", () => {
    // Index 0 of the pool is always the time-of-day greeting.
    vi.spyOn(Math, "random").mockReturnValue(0);

    const { result } = renderAt("2025-03-10T09:00:00");

    expect(result.current).toBe("Good morning");
  });

  it("can pick an afternoon greeting between noon and 6pm", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    const { result } = renderAt("2025-03-10T13:00:00");

    expect(result.current).toBe("Good afternoon");
  });

  it("can pick an evening greeting from 6pm onwards", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    const { result } = renderAt("2025-03-10T18:00:00");

    expect(result.current).toBe("Good evening");
  });

  it("can also pick one of the casual greetings shared by every hour", () => {
    // Just under 1 maps to the last pool entry, which is always casual.
    vi.spyOn(Math, "random").mockReturnValue(0.999);

    const { result } = renderAt("2025-03-10T09:00:00");

    expect(result.current).toBe("Ready when you are");
  });

  it("never returns an empty greeting, whatever index Math.random lands on", () => {
    for (const random of [0, 0.25, 0.5, 0.75, 0.999]) {
      vi.spyOn(Math, "random").mockReturnValue(random);
      const { result, unmount } = renderAt("2025-03-10T09:00:00");

      expect(result.current.length).toBeGreaterThan(0);
      unmount();
    }
  });
});
