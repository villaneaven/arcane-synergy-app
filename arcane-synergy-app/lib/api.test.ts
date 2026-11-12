import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * API_BASE_URL is resolved when the module first loads, so each case resets the
 * module registry and re-imports with the env it wants to exercise.
 */
async function importApi() {
  vi.resetModules();
  return import("@/lib/api");
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("API_BASE_URL", () => {
  it("uses the public base URL when it is set", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://api.example.test");

    const { API_BASE_URL } = await importApi();

    expect(API_BASE_URL).toBe("https://api.example.test");
  });

  it("falls back to the local API when the public base URL is unset", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", undefined);

    const { API_BASE_URL } = await importApi();

    expect(API_BASE_URL).toBe("http://localhost:5201");
  });
});

describe("getServerApiBaseUrl", () => {
  it("prefers the private API_BASE_URL so server code can use an internal host", async () => {
    vi.stubEnv("API_BASE_URL", "http://internal-api:8080");
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://api.example.test");

    const { getServerApiBaseUrl } = await importApi();

    expect(getServerApiBaseUrl()).toBe("http://internal-api:8080");
  });

  it("falls back to the public base URL when no private host is configured", async () => {
    vi.stubEnv("API_BASE_URL", undefined);
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://api.example.test");

    const { getServerApiBaseUrl } = await importApi();

    expect(getServerApiBaseUrl()).toBe("https://api.example.test");
  });

  it("falls back to localhost when neither is configured", async () => {
    vi.stubEnv("API_BASE_URL", undefined);
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", undefined);

    const { getServerApiBaseUrl } = await importApi();

    expect(getServerApiBaseUrl()).toBe("http://localhost:5201");
  });
});
