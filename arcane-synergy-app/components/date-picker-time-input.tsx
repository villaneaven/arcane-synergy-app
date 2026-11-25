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
  minDate?: Date;
  maxDate?: Date;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}

function formatTime(date: Date | undefined) {
  if (!date || isNaN(date.getTime())) return "";
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

/** The given day at the given "HH:mm" time (midnight when the time is empty). */
function withTime(date: Date | undefined, time: string) {
  if (!date) return undefined;
  const [hours, minutes] = time ? time.split(":").map(Number) : [0, 0];
  const next = new Date(date);
  next.setHours(hours, minutes, 0, 0);
  return next;
}

export function DatePickerTimeInput({
  value,
  onChange,
  id,
  name,
  label,
  required,
  timeRequired,
  minDate,
  maxDate,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}: DatePickerInputProps) {
  const [time, setTime] = React.useState(formatTime(value));
  // The last date this component reported, so a value change coming back from
  // the parent doesn't overwrite the time box while the user is typing.
  const lastEmitted = React.useRef(value);

  React.useEffect(() => {
    if (Object.is(value?.getTime(), lastEmitted.current?.getTime())) return;
    lastEmitted.current = value;
    setTime(formatTime(value));
  }, [value]);

  const emit = (next: Date | undefined) => {
    lastEmitted.current = next;
    onChange?.(next);
  };

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
          value={value}
          onChange={(newDate) => emit(withTime(newDate, time))}
          required={required}
          minDate={minDate}
          maxDate={maxDate}
          aria-invalid={ariaInvalid}
          aria-describedby={ariaDescribedBy}
        />
      </Field>
      <Field className="w-32">
        <FieldLabel htmlFor={id ? `${id}-time` : "time-picker-optional"}>
          Time
        </FieldLabel>
        <Input
          type="time"
          id={id ? `${id}-time` : "time-picker-optional"}
          value={time}
          onChange={(e) => {
            setTime(e.target.value);
            if (value) emit(withTime(value, e.target.value));
          }}
          className="bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
          required={timeRequired}
        />
      </Field>
    </FieldGroup>
  );
}
