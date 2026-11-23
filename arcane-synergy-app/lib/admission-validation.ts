export const DATE_SEEN_REQUIRES_DISCHARGE =
  "Date Seen requires a Discharge Date.";
export const DATE_SEEN_BEFORE_DISCHARGE =
  "Date Seen must be on or after the Discharge Date.";

export const DISCHARGE_DATE_IN_FUTURE =
  "Discharge Date must be today or earlier.";
export const DISCHARGE_BEFORE_ADMISSION =
  "Discharge Date must be on or after the Admission Date.";

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Discharge Date is optional, but can't be after today or before the
 * Admission Date (both compared by calendar day, so a same-day discharge is
 * valid whatever the admission time). Mirrors Admission.ValidateDischargeDate
 * on the backend. Returns an error message, or null when valid.
 */
export function validateDischargeDate(
  dischargeDate: Date | undefined,
  today: Date = new Date(),
  admissionDate?: Date,
): string | null {
  if (!dischargeDate) return null;
  if (startOfDay(dischargeDate) > startOfDay(today))
    return DISCHARGE_DATE_IN_FUTURE;
  if (admissionDate && startOfDay(dischargeDate) < startOfDay(admissionDate))
    return DISCHARGE_BEFORE_ADMISSION;
  return null;
}

/**
 * Date Seen is optional, but when set it needs a Discharge Date and must fall
 * on or after it (compared by calendar day). Mirrors Admission.ValidateDateSeen
 * on the backend. Returns an error message, or null when valid.
 */
export function validateDateSeen(
  dischargeDate: Date | undefined,
  dateSeen: Date | undefined,
): string | null {
  if (!dateSeen) return null;
  if (!dischargeDate) return DATE_SEEN_REQUIRES_DISCHARGE;
  if (startOfDay(dateSeen) < startOfDay(dischargeDate))
    return DATE_SEEN_BEFORE_DISCHARGE;
  return null;
}
