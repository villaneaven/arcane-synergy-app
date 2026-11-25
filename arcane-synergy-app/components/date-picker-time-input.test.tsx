import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { DatePickerTimeInput } from "@/components/date-picker-time-input";

function Harness({
  initial,
  onChange,
}: {
  initial?: Date;
  onChange: (date: Date | undefined) => void;
}) {
  const [value, setValue] = React.useState<Date | undefined>(initial);
  return (
    <DatePickerTimeInput
      id="admission-date"
      label="Admission Date"
      value={value}
      onChange={(date) => {
        setValue(date);
        onChange(date);
      }}
    />
  );
}

const dateBox = () => screen.getByLabelText(/Admission Date/);
const timeBox = () => screen.getByLabelText("Time");

describe("DatePickerTimeInput", () => {
  it("merges a typed time into the selected date", () => {
    const onChange = vi.fn();
    render(<Harness initial={new Date(2025, 2, 10)} onChange={onChange} />);

    fireEvent.change(timeBox(), { target: { value: "14:30" } });

    expect(onChange).toHaveBeenLastCalledWith(new Date(2025, 2, 10, 14, 30));
  });

  it("keeps the typed time when the date changes", () => {
    const onChange = vi.fn();
    render(<Harness initial={new Date(2025, 2, 10)} onChange={onChange} />);

    fireEvent.change(timeBox(), { target: { value: "08:15" } });
    fireEvent.change(dateBox(), { target: { value: "03/12/2025" } });

    expect(onChange).toHaveBeenLastCalledWith(new Date(2025, 2, 12, 8, 15));
    expect(timeBox()).toHaveValue("08:15");
  });

  it("uses midnight when no time is entered", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    fireEvent.change(dateBox(), { target: { value: "03/12/2025" } });

    expect(onChange).toHaveBeenLastCalledWith(new Date(2025, 2, 12));
  });

  it("shows the time of an existing value", () => {
    render(
      <Harness initial={new Date(2025, 2, 10, 21, 5)} onChange={vi.fn()} />,
    );

    expect(timeBox()).toHaveValue("21:05");
  });

  it("doesn't report a time before a date is picked", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    fireEvent.change(timeBox(), { target: { value: "14:30" } });

    expect(onChange).not.toHaveBeenCalled();
  });
});
