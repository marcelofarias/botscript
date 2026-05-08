import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    // botscript's `test "name" { … }` rewrites to a global `$test` call that
    // forwards to vitest's global `test`. Enabling globals makes that work
    // without each test file having to import vitest by hand.
    globals: true,
  },
});
