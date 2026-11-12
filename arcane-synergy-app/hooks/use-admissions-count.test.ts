import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAdmissionsCount } from "@/hooks/use-admissions-count";
import { usePendingPatientsCount } from "@/hooks/use-pending-patients-count";
import { UNASSIGNED_GROUP } from "@/lib/group-breakdown";

const ALL_FILTERS = {
  insurance: "all",
  clinic: "all",
  admissionType: "all",
  lastMonths: "all",
} as const;

const SESSION = { access_token: "test-token" };

function mockFetchOnce(body: unknown, ok = true) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok,
    json: async () => body,
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

/** The URL of the most recent fetch call, parsed. */
function lastRequestUrl(fetchMock: ReturnType<typeof vi.fn>) {
  return new URL(fetchMock.mock.calls.at(-1)![0] as string);
}

beforeEach(() => {
  // Hook error paths log on purpose; keep the test output readable.
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useAdmissionsCount", () => {
  it("does not call the API without an access token", () => {
    const fetchMock = mockFetchOnce({ total: 0, byGroup: [] });

    renderHook(() => useAdmissionsCount(null, ALL_FILTERS));

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("requests the admissions count endpoint with a bearer token", async () => {
    const fetchMock = mockFetchOnce({ total: 4, byGroup: [] });

    renderHook(() => useAdmissionsCount(SESSION, ALL_FILTERS));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    const [url, init] = fetchMock.mock.calls[0];
    expect(url as string).toContain("/api/Admissions/count");
    expect((init as RequestInit).headers).toMatchObject({
      Authorization: "Bearer test-token",
    });
    expect((init as RequestInit).cache).toBe("no-store");
  });

  it('omits filters that are set to "all"', async () => {
    const fetchMock = mockFetchOnce({ total: 0, byGroup: [] });

    renderHook(() => useAdmissionsCount(SESSION, ALL_FILTERS));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    expect(fetchMock.mock.calls[0][0] as string).not.toContain("?");
  });

  it("sends only the filters that are narrowed down", async () => {
    const fetchMock = mockFetchOnce({ total: 0, byGroup: [] });
    // Held outside the render callback: see the stable-reference test below.
    const filters = {
      insurance: "AETNA",
      clinic: "all",
      admissionType: "ER",
      lastMonths: "6",
    };

    renderHook(() => useAdmissionsCount(SESSION, filters));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    const params = lastRequestUrl(fetchMock).searchParams;
    expect(params.get("insurance")).toBe("AETNA");
    expect(params.get("admissionType")).toBe("ER");
    expect(params.get("lastMonths")).toBe("6");
    expect(params.has("clinic")).toBe(false);
  });

  it("fetches once per filters reference, not once per render", async () => {
    const fetchMock = mockFetchOnce({ total: 1, byGroup: [] });

    const { rerender } = renderHook(() =>
      useAdmissionsCount(SESSION, ALL_FILTERS),
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    rerender();
    rerender();

    // The hook keys its fetch on the filters object identity, so callers must
    // memoize it (AnalyticsHome does). An unstable literal would refetch on
    // every render.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("exposes the total and a normalized group breakdown", async () => {
    mockFetchOnce({
      total: 10,
      byGroup: [
        { group: "DMC", count: 6 },
        { group: null, count: 4 },
      ],
    });

    const { result } = renderHook(() => useAdmissionsCount(SESSION, ALL_FILTERS));

    await waitFor(() => expect(result.current.admissionsCount).toBe(10));

    const byGroup = result.current.admissionsCountByGroup;
    expect(byGroup.map((entry) => entry.group)).toEqual([
      "DMC",
      "RGVAIMS",
      "PJP",
      UNASSIGNED_GROUP,
    ]);
    expect(byGroup.find((entry) => entry.group === "DMC")?.count).toBe(6);
    expect(
      byGroup.find((entry) => entry.group === UNASSIGNED_GROUP)?.count,
    ).toBe(4);
  });

  it("clears the count when the API responds with an error status", async () => {
    mockFetchOnce({}, false);

    const { result } = renderHook(() => useAdmissionsCount(SESSION, ALL_FILTERS));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.admissionsCount).toBeNull();
    expect(result.current.admissionsCountByGroup).toEqual([]);
  });

  it("clears the count when the request itself fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    const { result } = renderHook(() => useAdmissionsCount(SESSION, ALL_FILTERS));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.admissionsCount).toBeNull();
    expect(result.current.admissionsCountByGroup).toEqual([]);
  });

  it("refetches when the access token changes", async () => {
    const fetchMock = mockFetchOnce({ total: 1, byGroup: [] });

    const { rerender } = renderHook(
      ({ token }: { token: string }) =>
        useAdmissionsCount({ access_token: token }, ALL_FILTERS),
      { initialProps: { token: "first" } },
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    rerender({ token: "second" });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(
      (fetchMock.mock.calls[1][1] as RequestInit).headers,
    ).toMatchObject({ Authorization: "Bearer second" });
  });
});

describe("usePendingPatientsCount", () => {
  it("requests the pending count endpoint", async () => {
    const fetchMock = mockFetchOnce({ total: 2, byGroup: [] });

    renderHook(() => usePendingPatientsCount(SESSION, ALL_FILTERS));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    expect(fetchMock.mock.calls[0][0] as string).toContain(
      "/api/Admissions/pending/count",
    );
  });

  it("exposes the total and a normalized group breakdown", async () => {
    mockFetchOnce({ total: 3, byGroup: [{ group: "PJP", count: 3 }] });

    const { result } = renderHook(() =>
      usePendingPatientsCount(SESSION, ALL_FILTERS),
    );

    await waitFor(() => expect(result.current.pendingPatientsCount).toBe(3));

    expect(
      result.current.pendingPatientsCountByGroup.find(
        (entry) => entry.group === "PJP",
      )?.count,
    ).toBe(3);
  });

  it("clears the count when the request fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    const { result } = renderHook(() =>
      usePendingPatientsCount(SESSION, ALL_FILTERS),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.pendingPatientsCount).toBeNull();
    expect(result.current.pendingPatientsCountByGroup).toEqual([]);
  });
});
