import { describe, expect, it } from "vitest";
import { ageOn, createColumns } from "@/app/(app)/forms/patients/columns";
import { PATIENT_COLUMN_PRESETS } from "@/app/(app)/forms/patients/column-presets";

describe("ageOn", () => {
  const today = new Date(2026, 10, 24); // Nov 24, 2026

  it("counts the birthday as a full year on the day itself", () => {
    expect(ageOn("1980-11-24T00:00:00", today)).toBe(46);
  });

  it("doesn't count the year until the birthday has passed", () => {
    expect(ageOn("1980-11-25T00:00:00", today)).toBe(45);
    expect(ageOn("1980-12-01T00:00:00", today)).toBe(45);
  });

  it("returns null for missing, unreadable or future dates", () => {
    expect(ageOn(undefined, today)).toBeNull();
    expect(ageOn("not a date", today)).toBeNull();
    expect(ageOn("2027-01-01T00:00:00", today)).toBeNull();
  });
});

describe("patient columns", () => {
  const columns = createColumns();
  const idOf = (column: (typeof columns)[number]) =>
    column.id ?? (column as { accessorKey?: string }).accessorKey;

  it("only names hideable columns in the views", () => {
    const hideable = new Set(
      columns.filter((c) => c.enableHiding !== false).map(idOf),
    );
    for (const preset of PATIENT_COLUMN_PRESETS) {
      if (preset.columns === "all") continue;
      for (const id of preset.columns) {
        expect(hideable.has(id)).toBe(true);
      }
    }
  });

  it("labels every hideable column for the Columns menu", () => {
    for (const column of columns.filter((c) => c.enableHiding !== false)) {
      expect(column.meta?.label).toBeTruthy();
    }
  });
});
