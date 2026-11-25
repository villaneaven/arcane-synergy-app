import { describe, expect, it } from "vitest";
import {
  DEFAULT_GAP_FILTERS,
  createColumns,
  formatGapDate,
  gapKey,
  providersForGroup,
  type GapFilterOptions,
} from "@/app/(app)/forms/gaps/columns";
import { GAP_COLUMN_PRESETS } from "@/app/(app)/forms/gaps/column-presets";

const OPTIONS = {
  providers: ["Dr. A", "Dr. B", "Dr. C"],
  providersByGroup: {
    DMC: ["Dr. A", "Dr. B"],
    PJP: ["Dr. C"],
  },
} as unknown as GapFilterOptions;

describe("providersForGroup", () => {
  it('offers every provider when the group filter is "all"', () => {
    expect(providersForGroup(OPTIONS, "all")).toEqual(["Dr. A", "Dr. B", "Dr. C"]);
  });

  it("offers only the providers in the chosen group", () => {
    expect(providersForGroup(OPTIONS, "DMC")).toEqual(["Dr. A", "Dr. B"]);
  });

  it("offers no providers for a group the API did not return", () => {
    expect(providersForGroup(OPTIONS, "RGVAIMS")).toEqual([]);
  });
});

describe("gapKey", () => {
  it("joins the three fields that identify a gap on the backend", () => {
    expect(gapKey({ insurance: "Aetna", memberId: "M-1", metricType: "A1C" })).toBe(
      "Aetna|M-1|A1C",
    );
  });

  it("tells apart gaps that differ in any one field", () => {
    const base = { insurance: "Aetna", memberId: "M-1", metricType: "A1C" };
    const keys = new Set([
      gapKey(base),
      gapKey({ ...base, insurance: "Cigna" }),
      gapKey({ ...base, memberId: "M-2" }),
      gapKey({ ...base, metricType: "BP" }),
    ]);

    expect(keys.size).toBe(4);
  });
});

describe("gap table defaults", () => {
  it("starts with every filter unset", () => {
    expect(Object.values(DEFAULT_GAP_FILTERS).every((v) => v === "all")).toBe(true);
  });

  const columns = createColumns(() => {});
  const hideable = columns.filter((c) => c.enableHiding !== false);
  const idOf = (column: (typeof columns)[number]) =>
    column.id ?? (column as { accessorKey?: string }).accessorKey;

  it("labels every hideable column for the Columns menu", () => {
    for (const column of hideable) {
      expect(column.meta?.label).toBeTruthy();
    }
  });

  it("only names hideable columns in the views", () => {
    const ids = new Set(hideable.map(idOf));
    for (const preset of GAP_COLUMN_PRESETS) {
      if (preset.columns === "all") continue;
      for (const id of preset.columns) {
        expect(ids.has(id)).toBe(true);
      }
    }
  });
});

describe("formatGapDate", () => {
  it("formats a date-only value without shifting the day", () => {
    expect(formatGapDate("2026-01-01")).toBe("01/01/2026");
    expect(formatGapDate("2026-11-24T00:00:00")).toBe("11/24/2026");
  });

  it("returns null for missing or unreadable values", () => {
    expect(formatGapDate(null)).toBeNull();
    expect(formatGapDate("")).toBeNull();
    expect(formatGapDate("soon")).toBeNull();
  });
});
