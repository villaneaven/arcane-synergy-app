import { DEFAULT_PRESET_ID, type ColumnPreset } from "../admissions/column-presets";

export const PATIENT_COLUMN_PRESETS: ColumnPreset[] = [
  {
    id: DEFAULT_PRESET_ID,
    label: "Default",
    columns: ["dob", "mrn", "group", "insurance", "pcp", "clinic"],
  },
  {
    id: "coverage",
    label: "Coverage",
    columns: ["mrn", "group", "insurance"],
  },
  {
    id: "care-team",
    label: "Care team",
    columns: ["group", "pcp", "clinic"],
  },
  { id: "all", label: "All columns", columns: "all" },
];
