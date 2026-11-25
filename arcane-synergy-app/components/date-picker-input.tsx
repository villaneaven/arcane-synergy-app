"use client";

import * as React from "react";
import { CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

function formatDate(date: Date | undefined) {
  if (!isValidDate(date)) {
    return "";
  }
  return date.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function isValidDate(date: Date | undefined): date is Date {
  return !!date && !isNaN(date.getTime());
}

export function parseDateInput(text: string): Date | undefined {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text.trim());
  if (!match) return undefined;
  const [month, day, year] = match.slice(1).map(Number);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return undefined;
  }
  return date;
}

/**
 * Formats typed text as MM/DD/YYYY so the slashes don't have to be typed:
 */
export function formatDateInput(raw: string): string {
  const parts = ["", "", ""];
  const maxLength = [2, 2, 4];
  let index = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw[i];
    if (char === "/") {
      if (index === 2) continue;
      const atEnd = i === raw.length - 1;
      if (atEnd) {
        if (!parts[index]) continue;
        parts[index] = parts[index].padStart(2, "0");
      }
      index++;
    } else if (/\d/.test(char)) {
      if (parts[index].length === maxLength[index]) {
        if (index === 2) break;
        index++;
      }
      parts[index] += char;
    }
  }
  return parts.slice(0, index + 1).join("/");
}

function caretAfterDigits(text: string, digits: number) {
  if (digits === 0) return 0;
  let seen = 0;
  for (let i = 0; i < text.length; i++) {
    if (/\d/.test(text[i]) && ++seen === digits) return i + 1;
  }
  return text.length;
}

function dateKey(date: Date | undefined) {
  if (!date) return "";
  return isValidDate(date) ? formatDate(date) : "invalid";
}

interface DatePickerInputProps {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  placeholder?: string;
  id?: string;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}

export function DatePickerInput({
  value: controlledValue,
  onChange,
  placeholder = "MM/DD/YYYY",
  id,
  name,
  required,
  disabled,
  minDate,
  maxDate,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}: DatePickerInputProps) {
  const [open, setOpen] = React.useState(false);
  const [date, setDate] = React.useState<Date | undefined>(controlledValue);
  const [month, setMonth] = React.useState<Date | undefined>(date);
  const [value, setValue] = React.useState(formatDate(date));
  const inputRef = React.useRef<HTMLInputElement>(null);
  const pendingCaret = React.useRef<number | null>(null);

  React.useLayoutEffect(() => {
    if (pendingCaret.current === null || !inputRef.current) return;
    inputRef.current.setSelectionRange(
      pendingCaret.current,
      pendingCaret.current,
    );
    pendingCaret.current = null;
  }, [value]);

  React.useEffect(() => {
    if (controlledValue === date) return;
    setDate(controlledValue);
    if (dateKey(controlledValue) !== dateKey(date)) {
      setValue(formatDate(controlledValue));
      setMonth(isValidDate(controlledValue) ? controlledValue : undefined);
    }
  }, [controlledValue, date]);

  const handleDateChange = (newDate: Date | undefined) => {
    setDate(newDate);
    setValue(formatDate(newDate));
    onChange?.(newDate);
  };

  return (
    <div className="relative flex gap-2">
      <Input
        ref={inputRef}
        id={id}
        name={name}
        value={value}
        placeholder={placeholder}
        inputMode="numeric"
        maxLength={10}
        className="bg-background pr-10"
        onFocus={(e) => {
          e.currentTarget.select();
        }}
        onClick={(e) => {
          e.currentTarget.select();
        }}
        onChange={(e) => {
          const raw = e.target.value;
          const inputValue = formatDateInput(raw);
          const caret = e.target.selectionStart ?? raw.length;
          if (caret < raw.length) {
            const digitsBefore = raw.slice(0, caret).replace(/\D/g, "").length;
            pendingCaret.current = caretAfterDigits(inputValue, digitsBefore);
          }
          setValue(inputValue);

          if (inputValue.trim() === "") {
            setDate(undefined);
            setMonth(undefined);
            onChange?.(undefined);
            return;
          }

          const parsed = parseDateInput(inputValue) ?? new Date(NaN);
          setDate(parsed);
          if (isValidDate(parsed)) setMonth(parsed);
          onChange?.(parsed);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
          }
        }}
        required={required}
        disabled={disabled}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            id="date-picker"
            variant="ghost"
            disabled={disabled}
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
            selected={isValidDate(date) ? date : undefined}
            captionLayout="dropdown"
            month={month}
            onMonthChange={setMonth}
            disabled={[
              ...(minDate ? [{ before: minDate }] : []),
              ...(maxDate ? [{ after: maxDate }] : []),
            ]}
            endMonth={maxDate}
            onSelect={(date) => {
              handleDateChange(date);
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
