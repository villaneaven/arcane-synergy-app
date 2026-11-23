// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getToken = vi.hoisted(() => vi.fn());
vi.mock("next-auth/jwt", () => ({ getToken }));

import proxy, { config } from "@/proxy";

function request(path: string) {
  return new NextRequest(new URL(path, "https://app.example.test"));
}

/** Where a redirect response points, or null when the request passes through. */
function redirectTarget(response: Response) {
  const location = response.headers.get("location");
  return location ? new URL(location).pathname : null;
}

beforeEach(() => {
  getToken.mockReset();
});

describe("proxy", () => {
  it("sends a signed-out visitor on a protected page to /login", async () => {
    getToken.mockResolvedValue(null);

    const response = await proxy(request("/forms/patients"));

    expect(response.status).toBe(307);
    expect(redirectTarget(response)).toBe("/login");
  });

  it("protects the home page too", async () => {
    getToken.mockResolvedValue(null);

    expect(redirectTarget(await proxy(request("/")))).toBe("/login");
  });

  it("lets a signed-out visitor reach /login", async () => {
    getToken.mockResolvedValue(null);

    const response = await proxy(request("/login"));

    expect(redirectTarget(response)).toBeNull();
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("sends a signed-in user away from /login to the home page", async () => {
    getToken.mockResolvedValue({ sub: "user" });

    const response = await proxy(request("/login"));

    expect(redirectTarget(response)).toBe("/");
  });

  it("lets a signed-in user through to a protected page", async () => {
    getToken.mockResolvedValue({ sub: "user" });

    const response = await proxy(request("/forms/admissions/12"));

    expect(redirectTarget(response)).toBeNull();
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("treats only the exact /login path as public", async () => {
    getToken.mockResolvedValue(null);

    expect(redirectTarget(await proxy(request("/login/extra")))).toBe("/login");
  });

  it("reads the session with the NextAuth secret", async () => {
    vi.stubEnv("NEXTAUTH_SECRET", "test-secret");
    getToken.mockResolvedValue(null);

    await proxy(request("/"));

    expect(getToken).toHaveBeenCalledWith(
      expect.objectContaining({ secret: "test-secret" }),
    );
  });
});

describe("proxy matcher", () => {
  const matcher = new RegExp(`^${config.matcher[0]}$`);

  it.each(["/", "/login", "/forms/patients", "/reports"])(
    "runs on app page %s",
    (path) => {
      expect(matcher.test(path)).toBe(true);
    },
  );

  it.each([
    "/api/auth/session",
    "/api/auth/callback/azure-ad",
    "/_next/static/chunks/main.js",
    "/_next/image",
    "/logo.png",
  ])("skips %s", (path) => {
    expect(matcher.test(path)).toBe(false);
  });
});
