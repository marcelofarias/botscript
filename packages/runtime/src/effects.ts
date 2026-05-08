import { $require } from "./capabilities.js";

/**
 * Capability-checked wrappers around the few side effects botscript blesses
 * with built-in syntax. App code can extend this set by writing thin wrappers
 * that call `$require(...)` themselves.
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

export const time = {
  now: (): number => {
    $require("time");
    return Date.now();
  },
  iso: (): string => {
    $require("time");
    return new Date().toISOString();
  },
};

export const random = {
  next: (): number => {
    $require("random");
    return Math.random();
  },
  int: (min: number, max: number): number => {
    $require("random");
    return Math.floor(Math.random() * (max - min)) + min;
  },
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
