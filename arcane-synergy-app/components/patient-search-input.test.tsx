import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: { access_token: "token" } }),
}));

import {
  PatientSearchInput,
  toPatientOption,
  type PatientOption,
} from "@/components/patient-search-input";

const jane: PatientOption = {
  patientID: 42,
  fullName: "Jane Doe",
  mrn: "MRN-001",
};

describe("toPatientOption", () => {
  it("keeps the ID, name and MRN", () => {
    expect(
      toPatientOption({ patientID: "42", fullName: "Jane Doe", mrn: "MRN-001" }),
    ).toEqual(jane);
  });

  it("builds a name from first and last when fullName is missing", () => {
    expect(
      toPatientOption({ patientID: 7, fullName: null, firstName: "Ann", lastName: "Lee" })
        ?.fullName,
    ).toBe("Ann Lee");
  });

  it("falls back to the ID when there is no name at all", () => {
    expect(toPatientOption({ patientID: 7 })?.fullName).toBe("Patient #7");
  });

  it.each([null, undefined, { patientID: "" }, { patientID: "abc" }, { patientID: 0 }])(
    "returns null for %j",
    (input) => {
      expect(toPatientOption(input)).toBeNull();
    },
  );
});

describe("PatientSearchInput", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the selected patient without fetching it", () => {
    render(<PatientSearchInput value={jane} onChange={() => {}} />);

    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("MRN: MRN-001")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("puts the selected patientID in form data", () => {
    const { container } = render(
      <form>
        <PatientSearchInput value={jane} onChange={() => {}} name="patient" />
      </form>,
    );

    const form = container.querySelector("form")!;
    expect(new FormData(form).get("patient")).toBe("42");
  });

  it("clears the selection", () => {
    const onChange = vi.fn();
    render(<PatientSearchInput value={jane} onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: /clear patient/i }));

    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("shows the search box once the selection is cleared", () => {
    const { rerender } = render(
      <PatientSearchInput value={jane} onChange={() => {}} />,
    );
    rerender(<PatientSearchInput value={null} onChange={() => {}} />);

    expect(screen.queryByText("Jane Doe")).not.toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/search patients/i),
    ).toHaveValue("");
  });

  it("is invalid when required and typed text was never picked from the list", () => {
    render(<PatientSearchInput value={null} onChange={() => {}} required />);
    const input = screen.getByPlaceholderText(
      /search patients/i,
    ) as HTMLInputElement;

    fireEvent.change(input, { target: { value: "Jane" } });

    expect(input.checkValidity()).toBe(false);
  });

  it("is valid when not required and nothing is selected", () => {
    render(<PatientSearchInput value={null} onChange={() => {}} />);
    const input = screen.getByPlaceholderText(
      /search patients/i,
    ) as HTMLInputElement;

    expect(input.checkValidity()).toBe(true);
  });
});
