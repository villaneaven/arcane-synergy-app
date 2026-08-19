export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5201";

// Server Components/route handlers can point at a private API_BASE_URL
// (e.g. an internal service hostname) that isn't exposed to the browser;
// falls back to the public URL used by client components otherwise.
export function getServerApiBaseUrl(): string {
  return process.env.API_BASE_URL ?? API_BASE_URL;
}
