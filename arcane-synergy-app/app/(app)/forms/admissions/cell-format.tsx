"use client";

import * as React from "react";
import type { Column } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function toDate(value: string | undefined | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(value: string | undefined | null) {
  const date = toDate(value);
  if (!date) return null;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function formatTime(value: string | undefined | null) {
  const date = toDate(value);
  if (!date) return null;
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateTime(value: string | undefined | null) {
  const date = toDate(value);
  if (!date) return null;
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Whole calendar days between two dates, ignoring time of day. */
export function daysBetween(
  start: string | undefined,
  end: string | undefined,
) {
  const from = toDate(start);
  const to = toDate(end);
  if (!from || !to) return null;
  const fromDay = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const toDay = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((toDay - fromDay) / 86_400_000);
}

export function formatStayLength(days: number | null) {
  if (days === null) return null;
  return `${days} ${days === 1 ? "day" : "days"}`;
}

export function Empty() {
  return (
    <span className="text-muted-foreground" aria-label="None">
      —
    </span>
  );
}

export function orEmpty(value: React.ReactNode) {
  return value === null || value === undefined || value === "" ? (
    <Empty />
  ) : (
    value
  );
}

export function Stacked({
  primary,
  secondary,
}: {
  primary: React.ReactNode;
  secondary?: (string | null | undefined)[];
}) {
  const details = (secondary ?? []).filter(Boolean).join(" · ");
  return (
    <div className="flex flex-col leading-tight">
      <span>{orEmpty(primary)}</span>
      {details ? (
        <span className="text-muted-foreground text-xs">{details}</span>
      ) : null}
    </div>
  );
}

const BADGE_BASE =
  "inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium";

const STATUS_STYLES: Record<string, string> = {
  Current: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  Pending: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
  Completed: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
};

export function StatusBadge({ status }: { status: string | undefined }) {
  if (!status) return <Empty />;
  return (
    <span
      className={cn(
        BADGE_BASE,
        STATUS_STYLES[status] ?? "bg-muted text-foreground",
      )}
    >
      {status}
    </span>
  );
}

export function TypeBadge({ type }: { type: string | undefined }) {
  if (!type) return <Empty />;
  return <span className={cn(BADGE_BASE, "border")}>{type}</span>;
}

export function FlagBadge({ flagged }: { flagged: boolean }) {
  if (!flagged) return <span className="text-muted-foreground">No</span>;
  return (
    <span
      className={cn(BADGE_BASE, "bg-red-500/10 text-red-700 dark:text-red-300")}
    >
      Yes
    </span>
  );
}

export function SortableHeader<TData>({
  column,
  label,
  descFirst = false,
}: {
  column: Column<TData, unknown>;
  label: string;
  descFirst?: boolean;
}) {
  const sorted = column.getIsSorted();
  const Icon =
    sorted === "asc" ? ArrowUp : sorted === "desc" ? ArrowDown : ArrowUpDown;

  const handleClick = () => {
    if (!sorted) column.toggleSorting(descFirst);
    else column.toggleSorting(sorted === "asc");
  };

  return (
    <Button
      variant="ghost"
      onClick={handleClick}
      className="-ml-2 h-8 cursor-pointer px-2"
    >
      {label}
      <Icon
        className={cn("ml-1 size-3.5", !sorted && "text-muted-foreground")}
      />
      <span className="sr-only">
        {sorted === "asc"
          ? "sorted ascending"
          : sorted === "desc"
            ? "sorted descending"
            : "not sorted"}
      </span>
    </Button>
  );
}
