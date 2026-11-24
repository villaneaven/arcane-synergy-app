import type { VisibilityState } from "@tanstack/react-table";

export type ColumnPreset = {
  id: string;
  label: string;
  /** Hideable columns to show; every other hideable column is hidden. "all" shows everything. */
  columns: string[] | "all";
};

export const DEFAULT_PRESET_ID = "default";

export const COLUMN_PRESETS: ColumnPreset[] = [
  {
    id: DEFAULT_PRESET_ID,
    label: "Default",
    columns: [
      "status",
      "type",
      "facility",
      "admissionDate",
      "dx",
      "dateNotified",
      "dischargeTo",
      "seen",
      "patientEngagement",
      "notes",
      "lastEdited",
    ],
  },
  {
    id: "intake",
    label: "Intake",
    columns: [
      "status",
      "type",
      "facility",
      "admissionDate",
      "dx",
      "dateNotified",
      "notes",
    ],
  },
  {
    id: "tcm",
    label: "TCM follow-up",
    columns: [
      "status",
      "facility",
      "admissionDate",
      "dischargeTo",
      "tcmDueDate",
      "seen",
      "patientEngagement",
    ],
  },
  {
    id: "readmissions",
    label: "Readmissions",
    columns: [
      "type",
      "facility",
      "admissionDate",
      "dx",
      "readmissionFlag",
      "nextAdmissionDate",
      "totalERVisits",
      "totalADMVisits",
      "countOfTransfers",
    ],
  },
  { id: "all", label: "All columns", columns: "all" },
];

export function getPresetVisibility(
  preset: ColumnPreset,
  hideableColumnIds: string[],
): VisibilityState {
  return Object.fromEntries(
    hideableColumnIds.map((id) => [
      id,
      preset.columns === "all" || preset.columns.includes(id),
    ]),
  );
}

export function getDefaultVisibility(
  hideableColumnIds: string[],
  presets: ColumnPreset[] = COLUMN_PRESETS,
) {
  const preset = presets.find((p) => p.id === DEFAULT_PRESET_ID)!;
  return getPresetVisibility(preset, hideableColumnIds);
}

/** Whether the current visibility exactly matches the preset. */
export function isPresetActive(
  preset: ColumnPreset,
  hideableColumnIds: string[],
  visibility: VisibilityState,
) {
  const expected = getPresetVisibility(preset, hideableColumnIds);
  return hideableColumnIds.every(
    (id) => (visibility[id] ?? true) === expected[id],
  );
}
