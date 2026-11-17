import { describe, expect, it } from "vitest";
import {
  COLUMN_LABELS,
  DEFAULT_GAP_FILTERS,
  HIDDEN_BY_DEFAULT,
  gapKey,
  providersForGroup,
  type GapFilterOptions,
} from "@/app/(app)/forms/gaps/columns";

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

  it("only hides columns that have a label in the column picker", () => {
    for (const column of HIDDEN_BY_DEFAULT) {
      expect(COLUMN_LABELS).toHaveProperty(column);
    }
  });
});
