// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const getServerSession = vi.hoisted(() => vi.fn());
const redirect = vi.hoisted(() =>
  vi.fn((url: string) => {
    // next/navigation's redirect never returns; it throws to abort rendering.
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
);

vi.mock("next-auth", () => ({ getServerSession }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/app/api/auth/[...nextauth]/route", () => ({
  authOptions: { marker: "authOptions" },
}));

import { getAccessToken } from "@/lib/auth";

const SIGN_IN = "/api/auth/signin?callbackUrl=%2F";

beforeEach(() => {
  getServerSession.mockReset();
  redirect.mockClear();
});

describe("getAccessToken", () => {
  it("returns the access token from the server session", async () => {
    getServerSession.mockResolvedValue({ access_token: "access-1" });

    await expect(getAccessToken()).resolves.toBe("access-1");
    expect(getServerSession).toHaveBeenCalledWith({ marker: "authOptions" });
    expect(redirect).not.toHaveBeenCalled();
  });

  it("sends the user to sign in when there is no session", async () => {
    getServerSession.mockResolvedValue(null);

    await expect(getAccessToken()).rejects.toThrow(`NEXT_REDIRECT:${SIGN_IN}`);
  });

  it("sends the user to sign in when the session has no access token", async () => {
    getServerSession.mockResolvedValue({ user: { name: "Ada" } });

    await expect(getAccessToken()).rejects.toThrow(`NEXT_REDIRECT:${SIGN_IN}`);
  });

  it("sends the user to sign in when the token could not be refreshed", async () => {
    // The stale token is still on the session, but the API would reject it.
    getServerSession.mockResolvedValue({
      access_token: "expired",
      error: "RefreshAccessTokenError",
    });

    await expect(getAccessToken()).rejects.toThrow(`NEXT_REDIRECT:${SIGN_IN}`);
  });
});
