import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Tests import from "vitest" explicitly rather than relying on globals, so
// Testing Library's automatic cleanup is not registered for us.
afterEach(() => {
  cleanup();
});
