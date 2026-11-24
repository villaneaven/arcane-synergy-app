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
import {
  CLINIC_OPTIONS,
  GROUP_OPTIONS,
  INSURANCE_OPTIONS,
} from "@/lib/patient-options";

import { FilterChip } from "../admissions/admissions-filters";

export interface PatientsFiltersProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  group: string;
  onGroupChange: (value: string) => void;
  insurance: string;
  onInsuranceChange: (value: string) => void;
  clinic: string;
  onClinicChange: (value: string) => void;
  actions?: React.ReactNode;
}

export function PatientsFilters({
  searchValue,
  onSearchChange,
  group,
  onGroupChange,
  insurance,
  onInsuranceChange,
  clinic,
  onClinicChange,
  actions,
}: PatientsFiltersProps) {
  const selectFilters = [
    {
      key: "group",
      label: "Group",
      allLabel: "All groups",
      options: GROUP_OPTIONS,
      value: group,
      onChange: onGroupChange,
    },
    {
      key: "insurance",
      label: "Insurance",
      allLabel: "All insurance",
      options: INSURANCE_OPTIONS,
      value: insurance,
      onChange: onInsuranceChange,
    },
    {
      key: "clinic",
      label: "Clinic",
      allLabel: "All clinics",
      options: CLINIC_OPTIONS,
      value: clinic,
      onChange: onClinicChange,
    },
  ];

  const activeSelects = selectFilters.filter((f) => f.value !== "all");
  const resetSelects = () => activeSelects.forEach((f) => f.onChange("all"));

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
            aria-label="Search patients by name or MRN"
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
                  <FieldLabel htmlFor={`patients-filter-${filter.key}`}>
                    {filter.label}
                  </FieldLabel>
                  <Select value={filter.value} onValueChange={filter.onChange}>
                    <SelectTrigger
                      id={`patients-filter-${filter.key}`}
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
              value={filter.value}
              onRemove={() => filter.onChange("all")}
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
