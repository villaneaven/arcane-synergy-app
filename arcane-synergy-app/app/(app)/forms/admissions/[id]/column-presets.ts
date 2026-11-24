import { DEFAULT_PRESET_ID, type ColumnPreset } from "../column-presets";

export const TRANSFER_COLUMN_PRESETS: ColumnPreset[] = [
  {
    id: DEFAULT_PRESET_ID,
    label: "Default",
    columns: [
      "type",
      "facility",
      "isFinalDischarge",
      "dx",
      "dateNotified",
      "dischargeTo",
      "notes",
    ],
  },
  {
    id: "intake",
    label: "Intake",
    columns: ["type", "facility", "dx", "dateNotified", "notes"],
  },
  {
    id: "discharge",
    label: "Discharge",
    columns: ["facility", "isFinalDischarge", "dischargeTo"],
  },
  { id: "all", label: "All columns", columns: "all" },
];
