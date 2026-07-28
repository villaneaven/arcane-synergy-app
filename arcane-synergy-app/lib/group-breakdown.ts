import { GROUP_OPTIONS } from "@/lib/patient-options";

export const UNASSIGNED_GROUP = "Unassigned";

export type RawGroupCount = {
  group: string | null;
  count: number;
};

export type NormalizedGroupCount = {
  group: string;
  count: number;
};

// Always shows exactly DMC, RGVAIMS, PJP (0 if missing); anything null or
// outside that set is folded into a single "Unassigned" bucket.
export function normalizeGroupBreakdown(
  byGroup: RawGroupCount[],
): NormalizedGroupCount[] {
  const knownGroups = new Set<string>(GROUP_OPTIONS);
  const counts = new Map<string, number>();
  let unassigned = 0;

  for (const entry of byGroup) {
    if (entry.group && knownGroups.has(entry.group)) {
      counts.set(entry.group, (counts.get(entry.group) ?? 0) + entry.count);
    } else {
      unassigned += entry.count;
    }
  }

  return [
    ...GROUP_OPTIONS.map((group) => ({
      group,
      count: counts.get(group) ?? 0,
    })),
    { group: UNASSIGNED_GROUP, count: unassigned },
  ];
}
