// @vitest-environment node
import type { Account, Session } from "next-auth";
import type { JWT } from "next-auth/jwt";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The route builds a NextAuth handler at import time; only the options it
// exports are under test here.
vi.mock("next-auth", () => ({ default: vi.fn(() => vi.fn()) }));

const NOW_SECONDS = 1_800_000_000;

function stubAzureEnv() {
  vi.stubEnv("AZURE_AD_CLIENT_ID", "client-id");
  vi.stubEnv("AZURE_AD_CLIENT_SECRET", "client-secret");
  vi.stubEnv("AZURE_AD_TENANT_ID", "tenant-id");
  vi.stubEnv("AZURE_AD_API_SCOPE", "api://backend/.default");
}

/** The route reads its env at module load, so each test re-imports it. */
async function importRoute() {
  vi.resetModules();
  return import("./route");
}

async function callbacks() {
  const { authOptions } = await importRoute();
  const { jwt, session } = authOptions.callbacks!;
  return {
    jwt: (params: { token: JWT; account?: Partial<Account> | null }) =>
      jwt!({ ...params, account: (params.account ?? null) as Account | null } as never),
    session: (params: { session: Session; token: JWT }) => session!(params as never),
  };
}

function mockTokenEndpoint(body: unknown, ok = true) {
  const fetchMock = vi.fn().mockResolvedValue({ ok, json: async () => body });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

beforeEach(() => {
  stubAzureEnv();
  vi.useFakeTimers();
  vi.setSystemTime(NOW_SECONDS * 1000);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("auth route configuration", () => {
  it.each(["AZURE_AD_CLIENT_ID", "AZURE_AD_CLIENT_SECRET", "AZURE_AD_TENANT_ID"])(
    "refuses to load without %s",
    async (name) => {
      vi.stubEnv(name, undefined);

      await expect(importRoute()).rejects.toThrow(
        "The Azure AD environment variables are not set.",
      );
    },
  );
});

describe("jwt callback", () => {
  it("stores the Azure tokens on first sign-in", async () => {
    const { jwt } = await callbacks();

    const token = await jwt({
      token: { name: "Ada" },
      account: {
        access_token: "access-1",
        refresh_token: "refresh-1",
        expires_at: NOW_SECONDS + 3600,
      },
    });

    expect(token).toEqual({
      name: "Ada",
      access_token: "access-1",
      refresh_token: "refresh-1",
      expires_at: NOW_SECONDS + 3600,
    });
  });

  it("returns an unexpired token unchanged without calling Azure", async () => {
    const fetchMock = mockTokenEndpoint({});
    const { jwt } = await callbacks();
    const token: JWT = {
      access_token: "access-1",
      refresh_token: "refresh-1",
      expires_at: NOW_SECONDS + 60,
    };

    expect(await jwt({ token })).toBe(token);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refreshes an expired token against the tenant's token endpoint", async () => {
    const fetchMock = mockTokenEndpoint({
      access_token: "access-2",
      refresh_token: "refresh-2",
      expires_in: 3600,
    });
    const { jwt } = await callbacks();

    const token = await jwt({
      token: { access_token: "access-1", refresh_token: "refresh-1", expires_at: NOW_SECONDS - 1 },
    });

    expect(token).toMatchObject({
      access_token: "access-2",
      refresh_token: "refresh-2",
      expires_at: NOW_SECONDS + 3600,
      error: undefined,
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://login.microsoftonline.com/tenant-id/oauth2/v2.0/token");
    const body = new URLSearchParams((init as RequestInit).body as URLSearchParams);
    expect(Object.fromEntries(body)).toEqual({
      client_id: "client-id",
      client_secret: "client-secret",
      grant_type: "refresh_token",
      refresh_token: "refresh-1",
      scope: "openid profile email offline_access api://backend/.default",
    });
  });

  it("treats a token at its exact expiry second as expired", async () => {
    const fetchMock = mockTokenEndpoint({ access_token: "access-2", expires_in: 3600 });
    const { jwt } = await callbacks();

    await jwt({ token: { refresh_token: "refresh-1", expires_at: NOW_SECONDS } });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("keeps the old refresh token when Azure does not rotate it", async () => {
    mockTokenEndpoint({ access_token: "access-2", expires_in: 3600 });
    const { jwt } = await callbacks();

    const token = await jwt({
      token: { refresh_token: "refresh-1", expires_at: NOW_SECONDS - 1 },
    });

    expect(token.refresh_token).toBe("refresh-1");
  });

  it("clears an earlier refresh error once a refresh succeeds", async () => {
    mockTokenEndpoint({ access_token: "access-2", expires_in: 3600 });
    const { jwt } = await callbacks();

    const token = await jwt({
      token: { refresh_token: "refresh-1", expires_at: NOW_SECONDS - 1, error: "RefreshAccessTokenError" },
    });

    expect(token.error).toBeUndefined();
  });

  it("flags the token when Azure rejects the refresh", async () => {
    mockTokenEndpoint({ error: "invalid_grant" }, false);
    const { jwt } = await callbacks();

    const token = await jwt({
      token: { access_token: "access-1", refresh_token: "refresh-1", expires_at: NOW_SECONDS - 1 },
    });

    expect(token).toMatchObject({
      access_token: "access-1",
      error: "RefreshAccessTokenError",
    });
  });

  it("flags the token when the refresh request itself fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("network down")));
    const { jwt } = await callbacks();

    const token = await jwt({
      token: { refresh_token: "refresh-1", expires_at: NOW_SECONDS - 1 },
    });

    expect(token.error).toBe("RefreshAccessTokenError");
  });

  it("flags the token without calling Azure when there is no refresh token", async () => {
    const fetchMock = mockTokenEndpoint({});
    const { jwt } = await callbacks();

    const token = await jwt({ token: { access_token: "access-1", expires_at: NOW_SECONDS - 1 } });

    expect(token.error).toBe("RefreshAccessTokenError");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("session callback", () => {
  it("exposes the access token under both names and the refresh error", async () => {
    const { session } = await callbacks();
    const base: Session = { user: { name: "Ada" }, expires: "2030-01-01T00:00:00.000Z" };

    const result = await session({
      session: base,
      token: { access_token: "access-1", refresh_token: "refresh-1", error: "RefreshAccessTokenError" },
    });

    expect(result).toEqual({
      ...base,
      access_token: "access-1",
      accessToken: "access-1",
      error: "RefreshAccessTokenError",
    });
  });

  it("never exposes the refresh token to the browser", async () => {
    const { session } = await callbacks();

    const result = await session({
      session: { expires: "2030-01-01T00:00:00.000Z" },
      token: { access_token: "access-1", refresh_token: "refresh-1" },
    });

    expect(JSON.stringify(result)).not.toContain("refresh-1");
  });

  it("does not mutate the session object it was given", async () => {
    const { session } = await callbacks();
    const base: Session = { expires: "2030-01-01T00:00:00.000Z" };

    await session({ session: base, token: { access_token: "access-1" } });

    expect(base).toEqual({ expires: "2030-01-01T00:00:00.000Z" });
  });
});
