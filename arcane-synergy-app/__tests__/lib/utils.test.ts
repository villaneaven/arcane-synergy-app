import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";

describe("cn", () => {
  it("joins class names", () => {
    expect(cn("px-2", "text-sm")).toBe("px-2 text-sm");
  });

  it("drops falsy values from conditional classes", () => {
    const isActive = false;

    expect(cn("base", isActive && "active", undefined, null)).toBe("base");
  });

  it("lets a later Tailwind class win over an earlier conflicting one", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  it("keeps non-conflicting Tailwind classes side by side", () => {
    expect(cn("px-2", "py-4")).toBe("px-2 py-4");
  });

  it("accepts arrays and objects the way clsx does", () => {
    expect(cn(["flex", "items-center"], { hidden: false, "gap-2": true })).toBe(
      "flex items-center gap-2",
    );
  });
});
