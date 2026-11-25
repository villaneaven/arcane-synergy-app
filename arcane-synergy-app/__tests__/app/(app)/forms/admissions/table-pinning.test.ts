import { describe, expect, it } from "vitest";
import {
  getCellClassName,
  getHeadClassName,
} from "@/app/(app)/forms/admissions/table-pinning";

describe("table pinning", () => {
  it("places a left-pinned column after the select column by default", () => {
    expect(getCellClassName("name", "left")).toContain("left-10");
    expect(getHeadClassName("name", "left")).toContain("left-10");
  });

  it("places a left-pinned column at the edge when there is no select column", () => {
    const options = { noSelectColumn: true };
    expect(getCellClassName("name", "left", options)).toContain("left-0");
    expect(getCellClassName("name", "left", options)).not.toContain("left-10");
    expect(getHeadClassName("name", "left", options)).toContain("left-0");
  });

  it("leaves unpinned cells alone and keeps headers sticky", () => {
    expect(getCellClassName("dx")).toBeUndefined();
    expect(getHeadClassName("dx")).toContain("sticky top-0");
  });

  it("pins right columns to the right edge", () => {
    expect(getCellClassName("actions", "right")).toContain("right-0");
  });
});
