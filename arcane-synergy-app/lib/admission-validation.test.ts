import { describe, expect, it } from "vitest";

import {
  DATE_SEEN_BEFORE_DISCHARGE,
  DISCHARGE_BEFORE_ADMISSION,
  DATE_SEEN_REQUIRES_DISCHARGE,
  DISCHARGE_DATE_IN_FUTURE,
  validateDateSeen,
  validateDischargeDate,
  validateDischargeNotBeforeAdmission,
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

  it("rejects a Discharge Date before the Admission Date", () => {
    expect(validateDischargeDate(day(4), today, day(5))).toBe(
      DISCHARGE_BEFORE_ADMISSION,
    );
  });

  it("accepts a Discharge Date on the Admission Date", () => {
    expect(validateDischargeDate(day(5), today, day(5))).toBeNull();
  });

  it("accepts a same-day discharge after an evening admission", () => {
    expect(validateDischargeDate(day(5), today, day(5, 20))).toBeNull();
  });

  it("accepts a Discharge Date after the Admission Date", () => {
    expect(validateDischargeDate(day(7), today, day(5))).toBeNull();
  });
});

describe("validateDischargeNotBeforeAdmission", () => {
  it("is valid when either date is missing", () => {
    expect(validateDischargeNotBeforeAdmission(undefined, day(5))).toBeNull();
    expect(validateDischargeNotBeforeAdmission(day(5), undefined)).toBeNull();
  });

  it("rejects a Discharge Date before the Admission Date", () => {
    expect(validateDischargeNotBeforeAdmission(day(5), day(4))).toBe(
      DISCHARGE_BEFORE_ADMISSION,
    );
  });

  it("accepts a same-day discharge after an evening admission", () => {
    expect(validateDischargeNotBeforeAdmission(day(5, 20), day(5))).toBeNull();
  });

  it("accepts a Discharge Date after the Admission Date", () => {
    expect(validateDischargeNotBeforeAdmission(day(5), day(7))).toBeNull();
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
