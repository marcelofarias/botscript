/**
 * Capabilities — the set of side-effect categories a function declares it touches.
 *
 * In a real implementation this would be a static analysis. For now we use a
 * runtime tag: `fn ... uses { net, fs }` is rewritten by the compiler into a
 * function whose body is wrapped in `$enter([...])`. Calls to capability-
 * checked APIs (`http.get`, `fs.read`, `time.now`, `random.next`) consult the
 * current capability stack and throw `CapabilityViolation` if their category
 * was not declared by the calling function.
 *
 * `pure { ... }` enters with an empty stack frame; nothing capability-checked
 * may run inside.
 */
export type Capability =
  | "net"
  | "fs"
  | "time"
  | "random"
  | "process"
  | "stdout"
  | "stderr";

export class CapabilityViolation extends Error {
  constructor(
    public readonly required: Capability,
    public readonly granted: ReadonlyArray<Capability>,
  ) {
    super(
      `CapabilityViolation: this scope did not declare \`${required}\`.\n` +
        `  Granted: ${granted.length === 0 ? "(none — pure scope)" : granted.join(", ")}\n` +
        `  Idiom:   add \`${required}\` to the function's \`uses { ... }\` clause.\n` +
        `  Rewrite: fn name(...) uses { ${[...granted, required].join(", ")} } -> ...`,
    );
  }
}

const stack: Capability[][] = [];

export const $enter = <T>(caps: ReadonlyArray<Capability>, fn: () => T): T => {
  stack.push([...caps]);
  try {
    return fn();
  } finally {
    stack.pop();
  }
};

export const $require = (cap: Capability): void => {
  const top = stack[stack.length - 1];
  if (top === undefined) {
    // No frame — direct top-level call. Conservative default: allow, since
    // top-level is module init. Tests opt-in via $enter([]) for pure assertions.
    return;
  }
  if (!top.includes(cap)) {
    throw new CapabilityViolation(cap, top);
  }
};

export const $current = (): ReadonlyArray<Capability> | undefined => {
  const top = stack[stack.length - 1];
  return top === undefined ? undefined : [...top];
};

/** Test-only: clear the capability stack. Don't call this in app code. */
export const $reset = (): void => {
  stack.length = 0;
};
