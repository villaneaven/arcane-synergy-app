import { describe, expect, it } from "vitest";

import {
  DATE_SEEN_BEFORE_DISCHARGE,
  DATE_SEEN_REQUIRES_DISCHARGE,
  DISCHARGE_DATE_IN_FUTURE,
  validateDateSeen,
  validateDischargeDate,
} from "@/lib/admission-validation";

const day = (d: number, hours = 0) => new Date(2025, 0, d, hours);

describe("validateDischargeDate", () => {
  const today = day(20, 9);

  it("is valid when no Discharge Date is set", () => {
    expect(validateDischargeDate(undefined, today)).toBeNull();
  });

  it("accepts a Discharge Date before today", () => {
    expect(validateDischargeDate(day(19), today)).toBeNull();
  });

  it("accepts today even if its time is later", () => {
    expect(validateDischargeDate(day(20, 23), today)).toBeNull();
  });

  it("rejects a Discharge Date after today", () => {
    expect(validateDischargeDate(day(21), today)).toBe(
      DISCHARGE_DATE_IN_FUTURE,
    );
  });
});

describe("validateDateSeen", () => {
  it("is valid when neither date is set", () => {
    expect(validateDateSeen(undefined, undefined)).toBeNull();
  });

  it("is valid when discharged but not yet seen", () => {
    expect(validateDateSeen(day(5), undefined)).toBeNull();
  });

  it("rejects a Date Seen without a Discharge Date", () => {
    expect(validateDateSeen(undefined, day(7))).toBe(
      DATE_SEEN_REQUIRES_DISCHARGE,
    );
  });

  it("rejects a Date Seen before the Discharge Date", () => {
    expect(validateDateSeen(day(5), day(4))).toBe(DATE_SEEN_BEFORE_DISCHARGE);
  });

  it("accepts a Date Seen on the Discharge Date", () => {
    expect(validateDateSeen(day(5), day(5))).toBeNull();
  });

  it("accepts a same-day Date Seen even if its time is earlier", () => {
    expect(validateDateSeen(day(5, 18), day(5, 9))).toBeNull();
  });

  it("accepts a Date Seen after the Discharge Date", () => {
    expect(validateDateSeen(day(5), day(7))).toBeNull();
  });
});
