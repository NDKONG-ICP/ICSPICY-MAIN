/** Unwrap Candid optional `[] | [T]` from generated bindings. */
export function candidOpt<T>(
  value: [] | [T] | undefined | null,
): T | undefined {
  if (value == null || value.length === 0) return undefined;
  return value[0];
}
