"use client";

import * as React from "react";
import { ListFilter, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
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

import { FilterChip } from "../admissions/admissions-filters";
import {
  DEFAULT_GAP_FILTERS,
  GapFilterOptions,
  GapFilters,
  NO_TEAM_STATUS,
  providersForGroup,
} from "./columns";

type Option = { value: string; label: string };

const toOptions = (values: string[]): Option[] =>
  values.map((value) => ({ value, label: value }));

export interface GapsFiltersProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  filters: GapFilters;
  filterOptions: GapFilterOptions;
  onFilterChange: (key: keyof GapFilters, value: string) => void;
  actions?: React.ReactNode;
}

export function GapsFilters({
  searchValue,
  onSearchChange,
  filters,
  filterOptions,
  onFilterChange,
  actions,
}: GapsFiltersProps) {
  const selectFilters: {
    key: keyof GapFilters;
    label: string;
    allLabel: string;
    options: Option[];
  }[] = [
    {
      key: "insurance",
      label: "Insurance",
      allLabel: "All insurance",
      options: toOptions(filterOptions.insurances),
    },
    {
      key: "groupName",
      label: "Group",
      allLabel: "All groups",
      options: toOptions(filterOptions.groups),
    },
    {
      key: "providerName",
      label: "Provider",
      allLabel: "All providers",
      options: toOptions(providersForGroup(filterOptions, filters.groupName)),
    },
    {
      key: "metricType",
      label: "Metric",
      allLabel: "All metrics",
      options: toOptions(filterOptions.metricTypes),
    },
    {
      key: "teamStatus",
      label: "Team status",
      allLabel: "All statuses",
      options: [
        ...toOptions(filterOptions.teamStatuses),
        { value: NO_TEAM_STATUS, label: "No status" },
      ],
    },
  ];

  const activeSelects = selectFilters.filter(
    (f) => filters[f.key] !== DEFAULT_GAP_FILTERS[f.key],
  );
  const resetSelects = () =>
    activeSelects.forEach((f) => onFilterChange(f.key, "all"));

  const labelFor = (filter: (typeof selectFilters)[number]) =>
    filter.options.find((o) => o.value === filters[filter.key])?.label ??
    filters[filter.key];

  return (
    <div className="flex flex-col gap-3 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            placeholder="Search member, ID, metric, provider…"
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            className="pl-8"
            aria-label="Search gaps by member name, member ID, metric or provider"
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
                  <FieldLabel htmlFor={`gaps-filter-${filter.key}`}>
                    {filter.label}
                  </FieldLabel>
                  <Select
                    value={filters[filter.key]}
                    onValueChange={(value) => onFilterChange(filter.key, value)}
                  >
                    <SelectTrigger
                      id={`gaps-filter-${filter.key}`}
                      className="w-full"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{filter.allLabel}</SelectItem>
                      {filter.options.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
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
                  onClick={resetSelects}
                >
                  Reset filters
                </Button>
              ) : null}
            </div>
          </PopoverContent>
        </Popover>

        {actions ? (
          <div className="ml-auto flex flex-wrap gap-2">{actions}</div>
        ) : null}
      </div>

      {activeSelects.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          {activeSelects.map((filter) => (
            <FilterChip
              key={filter.key}
              label={filter.label}
              value={labelFor(filter)}
              onRemove={() => onFilterChange(filter.key, "all")}
            />
          ))}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={resetSelects}
          >
            Clear all
          </Button>
        </div>
      ) : null}
    </div>
  );
}
