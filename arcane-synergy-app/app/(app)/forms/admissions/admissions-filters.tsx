"use client";

import * as React from "react";
import type { DateRange } from "react-day-picker";
import { CalendarIcon, ListFilter, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FACILITY_TYPE_OPTIONS,
  STATUS_OPTIONS,
  TYPE_OPTIONS,
} from "@/lib/admission-options";
import { GROUP_OPTIONS } from "@/lib/patient-options";
import { cn } from "@/lib/utils";

type SelectFilter = {
  key: string;
  label: string;
  allLabel: string;
  options: readonly string[];
  value: string;
  onChange: (value: string) => void;
};

export interface AdmissionsFiltersProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  admissionType: string;
  onAdmissionTypeChange: (value: string) => void;
  group: string;
  onGroupChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  facilityType: string;
  onFacilityTypeChange: (value: string) => void;
  startDate?: Date;
  endDate?: Date;
  onDateRangeChange: (start: Date | undefined, end: Date | undefined) => void;
  actions?: React.ReactNode;
}

function formatShortDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "2-digit",
  });
}

function describeRange(start?: Date, end?: Date) {
  if (start && end) {
    return `${formatShortDate(start)} – ${formatShortDate(end)}`;
  }
  if (start) return `From ${formatShortDate(start)}`;
  if (end) return `Until ${formatShortDate(end)}`;
  return null;
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function addDays(date: Date, days: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function getRangePresets() {
  const today = startOfToday();
  const year = today.getFullYear();
  const month = today.getMonth();
  return [
    { label: "Last 7 days", from: addDays(today, -6), to: today },
    { label: "Last 30 days", from: addDays(today, -29), to: today },
    { label: "This month", from: new Date(year, month, 1), to: today },
    {
      label: "Last month",
      from: new Date(year, month - 1, 1),
      to: new Date(year, month, 0),
    },
  ];
}

function sameDay(a?: Date, b?: Date) {
  if (!a || !b) return a === b;
  return a.toDateString() === b.toDateString();
}

function DateRangeFilter({
  startDate,
  endDate,
  onChange,
}: {
  startDate?: Date;
  endDate?: Date;
  onChange: (start: Date | undefined, end: Date | undefined) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<DateRange | undefined>();
  const presets = getRangePresets();
  const label = describeRange(startDate, endDate);

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setDraft(startDate ? { from: startDate, to: endDate } : undefined);
    }
    setOpen(next);
  };

  const apply = (from: Date | undefined, to: Date | undefined) => {
    onChange(from, to);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn(label && "border-primary/40")}>
          <CalendarIcon className="size-4" />
          <span className="text-muted-foreground">Admitted:</span>
          {label ?? "Any date"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex flex-col sm:flex-row">
          <div className="flex flex-row flex-wrap gap-1 border-b p-2 sm:flex-col sm:border-r sm:border-b-0">
            {presets.map((preset) => {
              const active =
                sameDay(preset.from, startDate) && sameDay(preset.to, endDate);
              return (
                <Button
                  key={preset.label}
                  variant={active ? "secondary" : "ghost"}
                  size="sm"
                  className="justify-start"
                  onClick={() => apply(preset.from, preset.to)}
                >
                  {preset.label}
                </Button>
              );
            })}
          </div>
          <div>
            <Calendar
              mode="range"
              selected={draft}
              onSelect={setDraft}
              numberOfMonths={2}
              defaultMonth={draft?.from ?? addDays(startOfToday(), -30)}
            />
            <div className="flex items-center justify-between gap-2 border-t p-2">
              <span className="text-muted-foreground px-1 text-xs">
                {describeRange(draft?.from, draft?.to) ??
                  "Pick a start date, then an optional end date"}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => apply(undefined, undefined)}
                >
                  Clear
                </Button>
                <Button
                  size="sm"
                  disabled={!draft?.from}
                  onClick={() => apply(draft?.from, draft?.to)}
                >
                  Apply
                </Button>
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function FilterChip({
  label,
  value,
  onRemove,
}: {
  label: string;
  value: string;
  onRemove: () => void;
}) {
  return (
    <span className="bg-muted/50 inline-flex items-center gap-1 rounded-full border py-0.5 pr-1 pl-2.5 text-xs">
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium">{value}</span>
      <button
        type="button"
        onClick={onRemove}
        className="hover:bg-muted rounded-full p-0.5"
        aria-label={`Remove ${label} filter`}
      >
        <X className="size-3" />
      </button>
    </span>
  );
}

export function AdmissionsFilters({
  searchValue,
  onSearchChange,
  admissionType,
  onAdmissionTypeChange,
  group,
  onGroupChange,
  status,
  onStatusChange,
  facilityType,
  onFacilityTypeChange,
  startDate,
  endDate,
  onDateRangeChange,
  actions,
}: AdmissionsFiltersProps) {
  const selectFilters: SelectFilter[] = [
    {
      key: "type",
      label: "Type",
      allLabel: "All types",
      options: TYPE_OPTIONS,
      value: admissionType,
      onChange: onAdmissionTypeChange,
    },
    {
      key: "group",
      label: "Group",
      allLabel: "All groups",
      options: GROUP_OPTIONS,
      value: group,
      onChange: onGroupChange,
    },
    {
      key: "status",
      label: "Status",
      allLabel: "All statuses",
      options: STATUS_OPTIONS,
      value: status,
      onChange: onStatusChange,
    },
    {
      key: "facilityType",
      label: "Facility type",
      allLabel: "All facility types",
      options: FACILITY_TYPE_OPTIONS,
      value: facilityType,
      onChange: onFacilityTypeChange,
    },
  ];

  const activeSelects = selectFilters.filter((f) => f.value !== "all");
  const rangeLabel = describeRange(startDate, endDate);
  const hasActiveFilters = activeSelects.length > 0 || rangeLabel !== null;

  const clearAll = () => {
    activeSelects.forEach((f) => f.onChange("all"));
    if (rangeLabel) onDateRangeChange(undefined, undefined);
  };

  return (
    <div className="flex flex-col gap-3 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            placeholder="Search name or MRN…"
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            className="pl-8"
            aria-label="Search admissions by patient name or MRN"
          />
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline">
              <ListFilter className="size-4" />
              Filters
              {activeSelects.length > 0 ? (
                <span className="bg-primary text-primary-foreground ml-0.5 rounded-full px-1.5 text-xs tabular-nums">
                  {activeSelects.length}
                </span>
              ) : null}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-72">
            <div className="grid gap-3">
              {selectFilters.map((filter) => (
                <Field key={filter.key}>
                  <FieldLabel htmlFor={`admissions-filter-${filter.key}`}>
                    {filter.label}
                  </FieldLabel>
                  <Select value={filter.value} onValueChange={filter.onChange}>
                    <SelectTrigger
                      id={`admissions-filter-${filter.key}`}
                      className="w-full"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{filter.allLabel}</SelectItem>
                      {filter.options.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              ))}
              {activeSelects.length > 0 ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="justify-self-start"
                  onClick={() =>
                    activeSelects.forEach((f) => f.onChange("all"))
                  }
                >
                  Reset filters
                </Button>
              ) : null}
            </div>
          </PopoverContent>
        </Popover>

        <DateRangeFilter
          startDate={startDate}
          endDate={endDate}
          onChange={onDateRangeChange}
        />

        {actions ? (
          <div className="ml-auto flex flex-wrap gap-2">{actions}</div>
        ) : null}
      </div>

      {hasActiveFilters ? (
        <div className="flex flex-wrap items-center gap-2">
          {activeSelects.map((filter) => (
            <FilterChip
              key={filter.key}
              label={filter.label}
              value={filter.value}
              onRemove={() => filter.onChange("all")}
            />
          ))}
          {rangeLabel ? (
            <FilterChip
              label="Admitted"
              value={rangeLabel}
              onRemove={() => onDateRangeChange(undefined, undefined)}
            />
          ) : null}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={clearAll}
          >
            Clear all
          </Button>
        </div>
      ) : null}
    </div>
  );
}
