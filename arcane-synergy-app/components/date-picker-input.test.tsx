import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import {
  DatePickerInput,
  formatDateInput,
  parseDateInput,
} from "@/components/date-picker-input";

const isInvalid = (date: Date | undefined) => !!date && isNaN(date.getTime());

describe("parseDateInput", () => {
  it("reads MM/DD/YYYY", () => {
    expect(parseDateInput("03/12/2025")).toEqual(new Date(2025, 2, 12));
  });

  it("accepts single-digit month and day", () => {
    expect(parseDateInput("3/2/2025")).toEqual(new Date(2025, 2, 2));
  });

  it("accepts Feb 29 in a leap year", () => {
    expect(parseDateInput("02/29/2024")).toEqual(new Date(2024, 1, 29));
  });

  it.each([
    ["02/29/2025", "Feb 29 outside a leap year"],
    ["02/30/2025", "Feb 30"],
    ["04/31/2025", "Apr 31"],
    ["02/32/2025", "day 32"],
    ["13/01/2025", "month 13"],
    ["00/10/2025", "month 0"],
    ["02/00/2025", "day 0"],
    ["02/3", "a half-typed date"],
    ["0", "a single digit"],
    ["02/03/25", "a two-digit year"],
    ["2025-03-12", "ISO format"],
    ["hello", "text"],
  ])("rejects %s (%s)", (text) => {
    expect(parseDateInput(text)).toBeUndefined();
  });
});

function Harness({
  initial,
  onChange,
}: {
  initial?: Date;
  onChange: (date: Date | undefined) => void;
}) {
  const [value, setValue] = React.useState<Date | undefined>(initial);
  return (
    <>
      <label htmlFor="d">Date</label>
      <DatePickerInput
        id="d"
        value={value}
        onChange={(date) => {
          setValue(date);
          onChange(date);
        }}
      />
      <button type="button" onClick={() => setValue(undefined)}>
        Reset
      </button>
    </>
  );
}

const dateBox = () => screen.getByLabelText("Date");

describe("DatePickerInput", () => {
  it("reports a typed date", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    fireEvent.change(dateBox(), { target: { value: "03/12/2025" } });

    expect(onChange).toHaveBeenLastCalledWith(new Date(2025, 2, 12));
  });

  it("reports an impossible date as invalid instead of rolling it over", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    fireEvent.change(dateBox(), { target: { value: "02/30/2025" } });

    expect(isInvalid(onChange.mock.lastCall?.[0])).toBe(true);
    expect(dateBox()).toHaveValue("02/30/2025");
  });

  it("doesn't keep the previous date when the text becomes invalid", () => {
    const onChange = vi.fn();
    render(<Harness initial={new Date(2025, 2, 10)} onChange={onChange} />);

    fireEvent.change(dateBox(), { target: { value: "02/32/2025" } });

    expect(isInvalid(onChange.mock.lastCall?.[0])).toBe(true);
  });

  it("reports a cleared box as no date", () => {
    const onChange = vi.fn();
    render(<Harness initial={new Date(2025, 2, 10)} onChange={onChange} />);

    fireEvent.change(dateBox(), { target: { value: "" } });

    expect(onChange).toHaveBeenLastCalledWith(undefined);
  });

  it("clears invalid text when the parent resets the value", () => {
    render(<Harness onChange={vi.fn()} />);

    fireEvent.change(dateBox(), { target: { value: "02/30/2025" } });
    fireEvent.click(screen.getByText("Reset"));

    expect(dateBox()).toHaveValue("");
  });
});

describe("formatDateInput", () => {
  it.each([
    ["0", "0"],
    ["03", "03"],
    ["031", "03/1"],
    ["0312", "03/12"],
    ["03122", "03/12/2"],
    ["03122025", "03/12/2025"],
    ["031220251", "03/12/2025"],
    ["03/12/2025", "03/12/2025"],
    ["03/", "03/"],
    ["3/", "03/"],
    ["03/2/", "03/02/"],
    ["3/2/2025", "3/2/2025"],
    ["03//", "03/"],
    ["12/0/2026", "12/0/2026"],
    ["12//2026", "12//2026"],
    ["/05/2026", "/05/2026"],
    ["1205/2026", "12/05/2026"],
    ["03/1", "03/1"],
    ["03a1b", "03/1"],
    ["", ""],
  ])("formats %j as %j", (raw, expected) => {
    expect(formatDateInput(raw)).toBe(expected);
  });
});

describe("DatePickerInput auto-slashes", () => {
  it("adds the slashes to a date typed as digits", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    fireEvent.change(dateBox(), { target: { value: "03122025" } });

    expect(dateBox()).toHaveValue("03/12/2025");
    expect(onChange).toHaveBeenLastCalledWith(new Date(2025, 2, 12));
  });

  it("lets a backspace remove the last digit before a slash", () => {
    render(<Harness onChange={vi.fn()} />);

    fireEvent.change(dateBox(), { target: { value: "03/1" } });
    fireEvent.change(dateBox(), { target: { value: "03/" } });
    fireEvent.change(dateBox(), { target: { value: "03" } });

    expect(dateBox()).toHaveValue("03");
  });

  it("lets a digit in the middle be backspaced and retyped", () => {
    const onChange = vi.fn();
    render(<Harness initial={new Date(2026, 11, 5)} onChange={onChange} />);
    const box = dateBox() as HTMLInputElement;

    const edit = (text: string, caret: number) => {
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )!.set!.call(box, text);
      box.setSelectionRange(caret, caret);
      fireEvent.input(box);
    };

    // Backspace with the caret after the 5 in 12/05/2026.
    edit("12/0/2026", 4);

    expect(box).toHaveValue("12/0/2026");
    expect(box.selectionStart).toBe(4);
    expect(isInvalid(onChange.mock.lastCall?.[0])).toBe(true);

    edit("12/07/2026", 5);

    expect(box).toHaveValue("12/07/2026");
    expect(onChange).toHaveBeenLastCalledWith(new Date(2026, 11, 7));
  });
});
