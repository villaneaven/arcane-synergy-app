"use client";

import * as React from "react";
import { DatePickerInput } from "@/components/date-picker-input";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

interface DatePickerInputProps {
  label?: string;
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  id?: string;
  name?: string;
  required?: boolean;
  timeRequired?: boolean;
}

export function DatePickerTimeInput({
  value,
  onChange,
  id,
  name,
  label,
  required,
  timeRequired,
}: DatePickerInputProps) {
  const [date, setDate] = React.useState<Date | undefined>(value);

  return (
    <FieldGroup className="mx-auto flex-row">
      <Field>
        <FieldLabel htmlFor={id}>
          {label ?? "Date"}{" "}
          {required && <span className="text-red-500">*</span>}
        </FieldLabel>
        <DatePickerInput
          id={id}
          name={name}
          value={date}
          onChange={(newDate) => {
            setDate(newDate);
            if (onChange) {
              onChange(newDate);
            }
          }}
          required={required}
        />
      </Field>
      <Field className="w-32">
        <FieldLabel htmlFor={id ? `${id}-time` : "time-picker-optional"}>
          Time
        </FieldLabel>
        <Input
          type="time"
          id={id ? `${id}-time` : "time-picker-optional"}
          className="bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
          required={timeRequired}
        />
      </Field>
    </FieldGroup>
  );
}
