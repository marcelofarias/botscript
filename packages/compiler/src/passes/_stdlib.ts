/**
 * Shared stdlib namespace → capability mapping.
 * Canonical source — import from here to avoid drift.
 * Extracted from cap-check.ts to break the circular dependency between
 * cap-check.ts and _alias.ts.
 */
export const STDLIB_TO_CAP: Readonly<Record<string, string>> = {
  http: "net",
  time: "time",
  random: "random",
  fs: "fs",
  stdout: "stdout",
  stderr: "stderr",
};
