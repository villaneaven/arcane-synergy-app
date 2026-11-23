import { describe, expect, it } from "vitest";
import {
  normalizeGroupBreakdown,
  UNASSIGNED_GROUP,
  type RawGroupCount,
} from "@/lib/group-breakdown";
import { GROUP_OPTIONS } from "@/lib/patient-options";

describe("normalizeGroupBreakdown", () => {
  it("always returns every known group plus Unassigned, in a stable order", () => {
    const result = normalizeGroupBreakdown([]);

    expect(result.map((entry) => entry.group)).toEqual([
      ...GROUP_OPTIONS,
      UNASSIGNED_GROUP,
    ]);
    expect(result.every((entry) => entry.count === 0)).toBe(true);
  });

  it("keeps counts for known groups", () => {
    const result = normalizeGroupBreakdown([
      { group: "DMC", count: 3 },
      { group: "PJP", count: 5 },
    ]);

    expect(result).toEqual([
      { group: "DMC", count: 3 },
      { group: "RGVAIMS", count: 0 },
      { group: "PJP", count: 5 },
      { group: UNASSIGNED_GROUP, count: 0 },
    ]);
  });

  it("folds null, empty and unrecognised groups into Unassigned", () => {
    const byGroup: RawGroupCount[] = [
      { group: null, count: 2 },
      { group: "", count: 1 },
      { group: "SOME-OLD-GROUP", count: 4 },
      { group: "DMC", count: 1 },
    ];

    const result = normalizeGroupBreakdown(byGroup);

    expect(result.find((entry) => entry.group === UNASSIGNED_GROUP)).toEqual({
      group: UNASSIGNED_GROUP,
      count: 7,
    });
    expect(result.find((entry) => entry.group === "DMC")?.count).toBe(1);
  });

  it("sums duplicate rows for the same group", () => {
    const result = normalizeGroupBreakdown([
      { group: "RGVAIMS", count: 2 },
      { group: "RGVAIMS", count: 3 },
    ]);

    expect(result.find((entry) => entry.group === "RGVAIMS")?.count).toBe(5);
  });

  it("is case sensitive, so a differently cased group is unassigned", () => {
    const result = normalizeGroupBreakdown([{ group: "dmc", count: 4 }]);

    expect(result.find((entry) => entry.group === "DMC")?.count).toBe(0);
    expect(result.find((entry) => entry.group === UNASSIGNED_GROUP)?.count).toBe(
      4,
    );
  });

  it("preserves the overall total across normalization", () => {
    const byGroup: RawGroupCount[] = [
      { group: "DMC", count: 6 },
      { group: null, count: 2 },
      { group: "UNKNOWN", count: 1 },
    ];

    const total = byGroup.reduce((sum, entry) => sum + entry.count, 0);
    const normalizedTotal = normalizeGroupBreakdown(byGroup).reduce(
      (sum, entry) => sum + entry.count,
      0,
    );

    expect(normalizedTotal).toBe(total);
  });
});
