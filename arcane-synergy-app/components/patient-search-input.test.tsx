import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";

vi.mock("next-auth/react", () => ({ useSession: vi.fn() }));

import { useSession } from "next-auth/react";
import {
  PatientSearchInput,
  SEARCH_DEBOUNCE_MS,
  toPatientOption,
  type PatientOption,
} from "@/components/patient-search-input";

const mockSession = (accessToken: string | null) =>
  vi.mocked(useSession).mockReturnValue({
    data: accessToken ? { access_token: accessToken } : null,
  } as unknown as ReturnType<typeof useSession>);

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
    mockSession("token");
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

describe("PatientSearchInput search", () => {
  const fetchMock = vi.fn();

  const ok = (data: unknown) => ({
    ok: true,
    status: 200,
    json: async () => data,
  });

  /** A fetch result the test resolves by hand, to control response order. */
  const deferred = () => {
    let resolve!: (value: unknown) => void;
    const promise = new Promise((r) => (resolve = r));
    return { promise, resolve };
  };

  const getInput = () => screen.getByPlaceholderText(/search patients/i);

  const type = async (text: string) => {
    fireEvent.change(getInput(), { target: { value: text } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS);
    });
  };

  const flush = () => act(async () => {});

  beforeEach(() => {
    vi.useFakeTimers();
    mockSession("token");
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("waits for the debounce before searching", async () => {
    fetchMock.mockResolvedValue(ok([]));
    render(<PatientSearchInput value={null} onChange={() => {}} />);

    fireEvent.change(getInput(), { target: { value: "Ja" } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS - 1);
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByText("Searching…")).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toContain("query=Ja");
  });

  it("shows results and picks one", async () => {
    fetchMock.mockResolvedValue(
      ok([{ patientID: 42, fullName: "Jane Doe", mrn: "MRN-001" }]),
    );
    const onChange = vi.fn();
    render(<PatientSearchInput value={null} onChange={onChange} />);

    await type("Jane");
    await flush();
    fireEvent.click(screen.getByText("Jane Doe"));

    expect(onChange).toHaveBeenCalledWith(jane);
  });

  it("ignores a slow response for an older query", async () => {
    const slow = deferred();
    fetchMock
      .mockReturnValueOnce(slow.promise)
      .mockResolvedValueOnce(ok([{ patientID: 2, fullName: "Jan Smith" }]));
    render(<PatientSearchInput value={null} onChange={() => {}} />);

    await type("Ja");
    await type("Jan");
    await flush();
    slow.resolve(ok([{ patientID: 1, fullName: "Stale Person" }]));
    await flush();

    expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(true);
    expect(screen.getByText("Jan Smith")).toBeInTheDocument();
    expect(screen.queryByText("Stale Person")).not.toBeInTheDocument();
  });

  it("keeps the last results on screen while the next search runs", async () => {
    const next = deferred();
    fetchMock
      .mockResolvedValueOnce(ok([{ patientID: 1, fullName: "Smith, Ann" }]))
      .mockReturnValueOnce(next.promise);
    render(<PatientSearchInput value={null} onChange={() => {}} />);

    await type("Smi");
    await flush();
    expect(screen.getByText("Smith, Ann")).toBeInTheDocument();

    // Typing more: the old list stays (dimmed) instead of "Searching…".
    fireEvent.change(getInput(), { target: { value: "Smith, B" } });
    expect(screen.getByText("Smith, Ann")).toBeInTheDocument();
    expect(screen.queryByText("Searching…")).not.toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS);
    });
    next.resolve(ok([{ patientID: 2, fullName: "Smith, Bob" }]));
    await flush();

    expect(screen.getByText("Smith, Bob")).toBeInTheDocument();
    expect(screen.queryByText("Smith, Ann")).not.toBeInTheDocument();
  });

  it("says when nothing matches", async () => {
    fetchMock.mockResolvedValue(ok([]));
    render(<PatientSearchInput value={null} onChange={() => {}} />);

    await type("Zzz");
    await flush();

    expect(screen.getByText(/no patients match/i)).toHaveTextContent("Zzz");
  });

  it("shows an error and retries", async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) })
      .mockResolvedValueOnce(ok([{ patientID: 42, fullName: "Jane Doe" }]));
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(<PatientSearchInput value={null} onChange={() => {}} />);

    await type("Jane");
    await flush();
    expect(screen.getByRole("alert")).toHaveTextContent(
      /couldn't search patients/i,
    );

    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    await flush();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
  });

  it("waits for a session token before searching", async () => {
    mockSession(null);
    fetchMock.mockResolvedValue(ok([{ patientID: 42, fullName: "Jane Doe" }]));
    const { rerender } = render(
      <PatientSearchInput value={null} onChange={() => {}} />,
    );

    await type("Jane");
    expect(fetchMock).not.toHaveBeenCalled();

    mockSession("token");
    rerender(<PatientSearchInput value={null} onChange={() => {}} />);
    await flush();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe(
      "Bearer token",
    );
  });
});
