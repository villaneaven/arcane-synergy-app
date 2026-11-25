"use client";

import { ColumnDef } from "@tanstack/react-table";

import {
  SortableHeader,
  Stacked,
  TypeBadge,
  orEmpty,
} from "../admissions/cell-format";
import { ageOn } from "../patients/columns";
import { TeamStatusCell } from "./team-status-cell";

export type Gap = {
  insurance: string;
  memberId: string;
  metricType: string;
  name: string | null;
  dob: string | null;
  providerName: string | null;
  providerNpi: string | null;
  groupName: string | null;
  phone: string | null;
  rosterDate: string | null;
  workItemType: string | null;
  sourceReviewStatus: string | null;
  firstSeenDate: string;
  lastSeenDate: string;
  teamStatus: string | null;
  statusDate: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
};

export type GapStatusUpdate = Pick<
  Gap,
  "teamStatus" | "statusDate" | "updatedAt" | "updatedBy"
>;

export type GapFilterOptions = {
  insurances: string[];
  groups: string[];
  providers: string[];
  providersByGroup: Record<string, string[]>;
  metricTypes: string[];
  teamStatuses: string[];
};

export type GapFilters = {
  insurance: string;
  groupName: string;
  providerName: string;
  metricType: string;
  teamStatus: string;
};

export const DEFAULT_GAP_FILTERS: GapFilters = {
  insurance: "all",
  groupName: "all",
  providerName: "all",
  metricType: "all",
  teamStatus: "all",
};

export const NO_TEAM_STATUS = "none";

export const providersForGroup = (
  options: GapFilterOptions,
  groupName: string,
) =>
  groupName === "all"
    ? options.providers
    : (options.providersByGroup[groupName] ?? []);

export const gapKey = (
  gap: Pick<Gap, "insurance" | "memberId" | "metricType">,
) => `${gap.insurance}|${gap.memberId}|${gap.metricType}`;

export function formatGapDate(value: string | null | undefined) {
  if (!value) return null;
  const [year, month, day] = value.slice(0, 10).split("-");
  if (!year || !month || !day) return null;
  return `${month}/${day}/${year}`;
}

function formatGapAge(dob: string | null) {
  if (!dob) return null;
  const age = ageOn(`${dob.slice(0, 10)}T00:00:00`);
  return age === null ? null : `${age} yrs`;
}

export const createColumns = (
  onStatusSaved: (gap: Gap, update: GapStatusUpdate) => void,
): ColumnDef<Gap>[] => [
  {
    accessorKey: "name",
    header: ({ column }) => <SortableHeader column={column} label="Member" />,
    cell: ({ row }) => (
      <Stacked
        primary={
          row.original.name ? (
            <span className="font-medium">{row.original.name}</span>
          ) : null
        }
        secondary={[
          formatGapDate(row.original.dob),
          formatGapAge(row.original.dob),
        ]}
      />
    ),
    enableHiding: false,
    meta: { label: "Member", pin: "left" },
  },
  {
    accessorKey: "metricType",
    header: ({ column }) => <SortableHeader column={column} label="Metric" />,
    cell: ({ row }) => <TypeBadge type={row.original.metricType} />,
    meta: { label: "Metric" },
  },
  {
    // Shows insurance and member ID; sorts by insurance.
    accessorKey: "insurance",
    header: ({ column }) => (
      <SortableHeader column={column} label="Insurance" />
    ),
    cell: ({ row }) => (
      <Stacked
        primary={row.original.insurance}
        secondary={[row.original.memberId && `ID ${row.original.memberId}`]}
      />
    ),
    meta: { label: "Insurance (& member ID)" },
  },
  {
    // Shows provider and group; sorts by provider.
    accessorKey: "providerName",
    header: ({ column }) => <SortableHeader column={column} label="Provider" />,
    cell: ({ row }) => (
      <Stacked
        primary={row.original.providerName}
        secondary={[row.original.groupName]}
      />
    ),
    meta: { label: "Provider (& group)" },
  },
  {
    accessorKey: "providerNpi",
    header: "Provider NPI",
    enableSorting: false,
    cell: ({ row }) => (
      <span className="tabular-nums">{orEmpty(row.original.providerNpi)}</span>
    ),
    meta: { label: "Provider NPI" },
  },
  {
    accessorKey: "phone",
    header: "Phone",
    enableSorting: false,
    cell: ({ row }) =>
      row.original.phone ? (
        <a
          href={`tel:${row.original.phone}`}
          className="tabular-nums whitespace-nowrap underline-offset-4 hover:underline"
        >
          {row.original.phone}
        </a>
      ) : (
        orEmpty(null)
      ),
    meta: { label: "Phone" },
  },
  {
    accessorKey: "workItemType",
    header: ({ column }) => (
      <SortableHeader column={column} label="Work Item Type" />
    ),
    cell: ({ row }) => orEmpty(row.original.workItemType),
    meta: { label: "Work Item Type" },
  },
  {
    accessorKey: "sourceReviewStatus",
    header: "Source Review Status",
    enableSorting: false,
    cell: ({ row }) => orEmpty(row.original.sourceReviewStatus),
    meta: { label: "Source Review Status" },
  },
  {
    accessorKey: "rosterDate",
    header: "Roster Date",
    enableSorting: false,
    cell: ({ row }) => orEmpty(formatGapDate(row.original.rosterDate)),
    meta: { label: "Roster Date" },
  },
  {
    // Shows when the gap was last and first on a roster; sorts by last seen.
    accessorKey: "lastSeenDate",
    header: ({ column }) => (
      <SortableHeader column={column} label="Last Seen" descFirst />
    ),
    cell: ({ row }) => {
      const firstSeen = formatGapDate(row.original.firstSeenDate);
      return (
        <Stacked
          primary={formatGapDate(row.original.lastSeenDate)}
          secondary={[firstSeen && `First ${firstSeen}`]}
        />
      );
    },
    meta: { label: "Last Seen (& first seen)" },
  },
  {
    // Shows when and by whom the team status was set; sorts by status date.
    accessorKey: "statusDate",
    header: ({ column }) => (
      <SortableHeader column={column} label="Status Updated" descFirst />
    ),
    cell: ({ row }) => (
      <Stacked
        primary={formatGapDate(row.original.statusDate)}
        secondary={[row.original.updatedBy]}
      />
    ),
    meta: { label: "Status Updated (date & by)" },
  },
  {
    accessorKey: "teamStatus",
    header: ({ column }) => (
      <SortableHeader column={column} label="Team Status" />
    ),
    cell: ({ row }) => (
      <TeamStatusCell gap={row.original} onSaved={onStatusSaved} />
    ),
    enableHiding: false,
    meta: { label: "Team Status", pin: "right" },
  },
];
