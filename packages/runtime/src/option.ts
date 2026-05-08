export type Some<T> = { readonly kind: "some"; readonly value: T };
export type None = { readonly kind: "none" };
export type Option<T> = Some<T> | None;

export const some = <T>(value: T): Some<T> => ({ kind: "some", value });
export const none: None = { kind: "none" };

export const isSome = <T>(o: Option<T>): o is Some<T> => o.kind === "some";
export const isNone = <T>(o: Option<T>): o is None => o.kind === "none";

export const mapOption = <T, U>(o: Option<T>, f: (t: T) => U): Option<U> =>
  isSome(o) ? some(f(o.value)) : none;

export const optionFromNullable = <T>(value: T | null | undefined): Option<T> =>
  value === null || value === undefined ? none : some(value);

export const unwrapOption = <T>(o: Option<T>): T => {
  if (isSome(o)) return o.value;
  throw new Error("unwrapOption on None");
};

export const unwrapOr = <T>(o: Option<T>, fallback: T): T =>
  isSome(o) ? o.value : fallback;
