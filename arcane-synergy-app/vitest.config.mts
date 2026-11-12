import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const rootDir = fileURLToPath(new URL(".", import.meta.url));

// No React plugin: Vite's esbuild transform already handles .tsx using the
// "jsx": "react-jsx" setting from tsconfig.json, and Fast Refresh is
// irrelevant under test. Adding @vitejs/plugin-react would pull a second copy
// of Vite into the tree, which breaks `tsc --noEmit` on this file.
export default defineConfig({
  resolve: {
    // Mirrors the "@/*" path alias in tsconfig.json.
    alias: [{ find: /^@\/(.*)$/, replacement: `${rootDir}$1` }],
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules/**", ".next/**", "out/**", "build/**"],
    // Keeps CI output deterministic when a test leaks a pending timer.
    restoreMocks: true,
    unstubEnvs: true,
  },
});
