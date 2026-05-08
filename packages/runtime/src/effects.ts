import { $require } from "./capabilities.js";

/**
 * Capability-checked wrappers around the few side effects botscript blesses
 * with built-in syntax. App code can extend this set by writing thin wrappers
 * that call `$require(...)` themselves.
 *
 * The `fs` wrappers live in a separate entry — `@mbfarias/botscript-runtime/fs`
 * — so importing this module is safe in the browser. Server-only code that
 * needs filesystem access imports both:
 *   import { http } from "@mbfarias/botscript-runtime";
 *   import { fs }   from "@mbfarias/botscript-runtime/fs";
 */

export const http = {
  get: async (url: string, init?: RequestInit): Promise<Response> => {
    $require("net");
    return fetch(url, init);
  },
  post: async (url: string, init?: RequestInit): Promise<Response> => {
    $require("net");
    return fetch(url, { method: "POST", ...init });
  },
};

// Mockable sources. `with mocks { time, random }` swaps these in tests; in
// app code they default to the real wallclock and Math.random.
let timeSource: () => number = () => Date.now();
let randomSource: () => number = () => Math.random();

export const time = {
  now: (): number => {
    $require("time");
    return timeSource();
  },
  iso: (): string => {
    $require("time");
    return new Date(timeSource()).toISOString();
  },
};

export const random = {
  next: (): number => {
    $require("random");
    return randomSource();
  },
  int: (min: number, max: number): number => {
    $require("random");
    return Math.floor(randomSource() * (max - min)) + min;
  },
};

// Internal — used by $withMocks. Don't import from app code.
export const __setTimeSource = (fn: () => number): void => {
  timeSource = fn;
};
export const __setRandomSource = (fn: () => number): void => {
  randomSource = fn;
};
export const __resetSources = (): void => {
  timeSource = () => Date.now();
  randomSource = () => Math.random();
};

export const stdout = {
  println: (s: string): void => {
    $require("stdout");
    console.log(s);
  },
  write: (s: string): void => {
    $require("stdout");
    process.stdout.write(s);
  },
};

export const stderr = {
  println: (s: string): void => {
    $require("stderr");
    console.error(s);
  },
};
