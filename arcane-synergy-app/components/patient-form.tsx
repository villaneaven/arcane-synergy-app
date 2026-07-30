"use client";

import * as React from "react";
import { CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CLINIC_OPTIONS,
  GROUP_OPTIONS,
  INSURANCE_OPTIONS,
  PCP_OPTIONS,
} from "@/lib/patient-options";

function formatDate(date: Date | undefined) {
  if (!date) {
    return "";
  }
  return date.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function isValidDate(date: Date | undefined) {
  if (!date) {
    return false;
  }
  return !isNaN(date.getTime());
}

export function PatientForm({
  onSubmit,
  onCancel,
  initialValues,
}: {
  onSubmit: (formData: {
    patientID?: string;
    firstName: string;
    lastName: string;
    dob: string | undefined;
    mrn: string;
    group: string;
    insurance: string;
    pcp: string;
    clinic: string;
  }) => Promise<void>;
  onCancel?: () => void;
  initialValues?: {
    patientID?: string;
    firstName?: string;
    lastName?: string;
    dob?: string;
    mrn?: string;
    group?: string;
    insurance?: string;
    pcp?: string;
    clinic?: string;
  };
}) {
  const [open, setOpen] = React.useState(false);
  const [date, setDate] = React.useState<Date | undefined>(() =>
    initialValues?.dob
      ? new Date(initialValues.dob)
      : new Date("1990-01-01T00:00:00"),
  );
  const [month, setMonth] = React.useState<Date | undefined>(date);
  const [value, setValue] = React.useState(formatDate(date));
  const [group, setGroup] = React.useState<string>(initialValues?.group ?? "");
  const [insurance, setInsurance] = React.useState<string>(
    initialValues?.insurance ?? "",
  );
  const [pcp, setPcp] = React.useState<string>(initialValues?.pcp ?? "");
  const [clinic, setClinic] = React.useState<string>(
    initialValues?.clinic ?? "",
  );
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [prevInitialValues, setPrevInitialValues] =
    React.useState(initialValues);

  if (initialValues !== prevInitialValues) {
    setPrevInitialValues(initialValues);
    const nextDate = initialValues?.dob
      ? new Date(initialValues.dob)
      : new Date("1990-01-01T00:00:00");
    setDate(nextDate);
    setMonth(nextDate);
    setValue(formatDate(nextDate));
    setGroup(initialValues?.group ?? "");
    setInsurance(initialValues?.insurance ?? "");
    setPcp(initialValues?.pcp ?? "");
    setClinic(initialValues?.clinic ?? "");
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const patientData: {
      firstName: string;
      lastName: string;
      dob: string | undefined;
      mrn: string;
      group: string;
      insurance: string;
      pcp: string;
      clinic: string;
      patientID?: string;
    } = {
      firstName: formData.get("first-name") as string,
      lastName: formData.get("last-name") as string,
      dob: date?.toISOString(),
      mrn: formData.get("mrn") as string,
      group: group,
      insurance: insurance,
      pcp: pcp,
      clinic: clinic,
    };

    if (initialValues?.patientID) {
      patientData.patientID = initialValues.patientID;
    }

    try {
      await onSubmit(patientData);

      // Reset form state
      setDate(new Date("1990-01-01T00:00:00"));
      setValue(formatDate(new Date("1990-01-01T00:00:00")));
      setClinic("");
      setGroup("");
      setInsurance("");
      setPcp("");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-4">
        <div className="grid gap-3">
          <Label htmlFor="first-name-1">First Name</Label>
          <Input
            id="first-name-1"
            name="first-name"
            placeholder="John"
            defaultValue={initialValues?.firstName ?? ""}
          />
        </div>
        <div className="grid gap-3">
          <Label htmlFor="last-name-1">Last Name</Label>
          <Input
            id="last-name-1"
            name="last-name"
            placeholder="Doe"
            defaultValue={initialValues?.lastName ?? ""}
          />
        </div>
        <div className="grid gap-3">
          <Label htmlFor="date-of-birth-1">Date of Birth</Label>
          <div className="relative flex gap-2">
            <Input
              id="date"
              value={value}
              placeholder="MM/DD/YYYY"
              className="bg-background pr-10"
              onFocus={(e) => {
                e.currentTarget.select();
              }}
              onClick={(e) => {
                e.currentTarget.select();
              }}
              onChange={(e) => {
                const date = new Date(e.target.value);
                setValue(e.target.value);
                if (isValidDate(date)) {
                  setDate(date);
                  setMonth(date);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setOpen(true);
                }
              }}
            />
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  id="date-picker"
                  variant="ghost"
                  className="absolute top-1/2 right-2 size-6 -translate-y-1/2"
                >
                  <CalendarIcon className="size-3.5" />
                  <span className="sr-only">Select date</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-auto overflow-hidden p-0"
                align="end"
                alignOffset={-8}
                sideOffset={10}
              >
                <Calendar
                  mode="single"
                  selected={date}
                  captionLayout="dropdown"
                  month={month}
                  onMonthChange={setMonth}
                  onSelect={(date) => {
                    setDate(date);
                    setValue(formatDate(date));
                    setOpen(false);
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <div className="grid gap-3">
          <Label htmlFor="mrn-1">MRN</Label>
          <Input
            id="mrn-1"
            name="mrn"
            defaultValue={initialValues?.mrn ?? ""}
          />
        </div>
        <div className="grid gap-3">
          <Label htmlFor="group-1">Group</Label>
          <Select
            value={group}
            onValueChange={(value) => {
              setGroup(value);
              setPcp("");
            }}
          >
            <SelectTrigger className="w-45">
              <SelectValue placeholder="Select a group" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Group</SelectLabel>
                {GROUP_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-3">
          <Label htmlFor="insurance-1">Insurance</Label>
          <Select value={insurance} onValueChange={setInsurance}>
            <SelectTrigger className="w-45">
              <SelectValue placeholder="Select an insurance" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Insurance</SelectLabel>
                {INSURANCE_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-3">
          <Label htmlFor="pcp-1">PCP</Label>
          <Select disabled={!group} value={pcp} onValueChange={setPcp}>
            <SelectTrigger className="w-45">
              <SelectValue placeholder="Select a PCP" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>{group} PCP</SelectLabel>
                {PCP_OPTIONS[group]?.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                )) || (
                  <SelectItem disabled value="none">
                    No PCPs available
                  </SelectItem>
                )}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-3">
          <Label htmlFor="clinic-1">Clinic</Label>
          <Select value={clinic} onValueChange={setClinic}>
            <SelectTrigger className="w-45">
              <SelectValue placeholder="Select a clinic" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Clinics</SelectLabel>
                {CLINIC_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex gap-3 pt-6 justify-end">
        <Button
          type="button"
          variant="outline"
          disabled={isSubmitting}
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
