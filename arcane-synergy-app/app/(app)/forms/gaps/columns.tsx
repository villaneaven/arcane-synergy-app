"use client";

import { Column, ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { TeamStatusCell } from "./team-status-cell";

export type Gap = {
  insurance: string;
  memberId: string;
  metricType: string;
  name: string | null;
  dob: string | null;
  providerName: string | null;
  providerNpi: string | null;
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

export const gapKey = (
  gap: Pick<Gap, "insurance" | "memberId" | "metricType">,
) => `${gap.insurance}|${gap.memberId}|${gap.metricType}`;

export const COLUMN_LABELS: Record<string, string> = {
  name: "Name",
  dob: "DOB",
  insurance: "Insurance",
  memberId: "Member ID",
  metricType: "Metric Type",
  providerName: "Provider",
  providerNpi: "Provider NPI",
  phone: "Phone",
  rosterDate: "Roster Date",
  workItemType: "Work Item Type",
  sourceReviewStatus: "Source Review Status",
  firstSeenDate: "First Seen",
  lastSeenDate: "Last Seen",
  teamStatus: "Team Status",
  statusDate: "Status Date",
  updatedBy: "Updated By",
};

export const HIDDEN_BY_DEFAULT = [
  "providerNpi",
  "rosterDate",
  "sourceReviewStatus",
  "firstSeenDate",
];

function formatDate(value: string | null) {
  if (!value) return "";
  const [year, month, day] = value.slice(0, 10).split("-");
  return `${month}/${day}/${year}`;
}

function sortableHeader(label: string) {
  const SortableHeader = ({ column }: { column: Column<Gap, unknown> }) => (
    <Button
      variant="ghost"
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      className="cursor-pointer -ml-3"
    >
      {label}
      <ArrowUpDown className="ml-2 h-4 w-4" />
    </Button>
  );
  return SortableHeader;
}

const dateCell =
  (key: keyof Gap) =>
  ({ row }: { row: { original: Gap } }) =>
    formatDate(row.original[key]);

export const createColumns = (
  onStatusSaved: (gap: Gap, update: GapStatusUpdate) => void,
): ColumnDef<Gap>[] => [
  { accessorKey: "name", header: sortableHeader("Name") },
  { accessorKey: "dob", header: sortableHeader("DOB"), cell: dateCell("dob") },
  { accessorKey: "insurance", header: sortableHeader("Insurance") },
  { accessorKey: "memberId", header: sortableHeader("Member ID") },
  { accessorKey: "metricType", header: sortableHeader("Metric Type") },
  { accessorKey: "providerName", header: sortableHeader("Provider") },
  { accessorKey: "providerNpi", header: "Provider NPI", enableSorting: false },
  { accessorKey: "phone", header: "Phone", enableSorting: false },
  {
    accessorKey: "rosterDate",
    header: "Roster Date",
    enableSorting: false,
    cell: dateCell("rosterDate"),
  },
  { accessorKey: "workItemType", header: sortableHeader("Work Item Type") },
  {
    accessorKey: "sourceReviewStatus",
    header: "Source Review Status",
    enableSorting: false,
  },
  {
    accessorKey: "firstSeenDate",
    header: "First Seen",
    enableSorting: false,
    cell: dateCell("firstSeenDate"),
  },
  {
    accessorKey: "lastSeenDate",
    header: sortableHeader("Last Seen"),
    cell: dateCell("lastSeenDate"),
  },
  {
    accessorKey: "teamStatus",
    header: sortableHeader("Team Status"),
    cell: ({ row }) => (
      <TeamStatusCell gap={row.original} onSaved={onStatusSaved} />
    ),
  },
  {
    accessorKey: "statusDate",
    header: sortableHeader("Status Date"),
    cell: dateCell("statusDate"),
  },
  { accessorKey: "updatedBy", header: "Updated By", enableSorting: false },
];
