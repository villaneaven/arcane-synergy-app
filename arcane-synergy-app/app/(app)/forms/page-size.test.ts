import { describe, expect, it } from "vitest";
import * as admissions from "./admissions/page-size";
import * as gaps from "./gaps/page-size";
import * as patients from "./patients/page-size";

/**
 * Each table remembers its page size in its own cookie. The server reads the
 * cookie back through parsePageSize, so anything a user (or a stale cookie)
 * can put there must fall back to a size the table actually offers.
 */
const tables = [
  { name: "admissions", module: admissions, cookie: "admissions-table-page-size" },
  { name: "gaps", module: gaps, cookie: "gaps-table-page-size" },
  { name: "patients", module: patients, cookie: "patients-table-page-size" },
];

describe.each(tables)("$name page size", ({ module, cookie }) => {
  it("uses its own cookie name", () => {
    expect(module.PAGE_SIZE_COOKIE).toBe(cookie);
  });

  it("defaults to a size the table offers", () => {
    expect(module.PAGE_SIZE_OPTIONS).toContain(module.DEFAULT_PAGE_SIZE);
  });

  it.each(module.PAGE_SIZE_OPTIONS.map(String))("accepts the offered size %s", (value) => {
    expect(module.parsePageSize(value)).toBe(Number(value));
  });

  it.each([
    ["a missing cookie", undefined],
    ["an empty cookie", ""],
    ["a size the table does not offer", "25"],
    ["a size above the largest option", "1000"],
    ["zero", "0"],
    ["a negative size", "-10"],
    ["a fractional size", "10.5"],
    ["text", "abc"],
  ])("falls back to the default for %s", (_label, value) => {
    expect(module.parsePageSize(value)).toBe(module.DEFAULT_PAGE_SIZE);
  });
});

it("gives every table a distinct cookie", () => {
  const names = tables.map((t) => t.module.PAGE_SIZE_COOKIE);
  expect(new Set(names).size).toBe(names.length);
});
