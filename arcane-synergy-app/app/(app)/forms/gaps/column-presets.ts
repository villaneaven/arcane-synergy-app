import { DEFAULT_PRESET_ID, type ColumnPreset } from "../admissions/column-presets";

export const GAP_COLUMN_PRESETS: ColumnPreset[] = [
  {
    id: DEFAULT_PRESET_ID,
    label: "Default",
    columns: [
      "metricType",
      "insurance",
      "providerName",
      "phone",
      "workItemType",
      "lastSeenDate",
      "statusDate",
    ],
  },
  {
    id: "outreach",
    label: "Outreach",
    columns: ["metricType", "providerName", "phone", "statusDate"],
  },
  {
    id: "source",
    label: "Source details",
    columns: [
      "metricType",
      "insurance",
      "providerNpi",
      "workItemType",
      "sourceReviewStatus",
      "rosterDate",
      "lastSeenDate",
    ],
  },
  { id: "all", label: "All columns", columns: "all" },
];
