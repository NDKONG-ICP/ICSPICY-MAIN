/** Optional `?from=midway` when entering a game from the carnival hub. */
export function gameEntrySearch(search: Record<string, unknown>) {
  return {
    from: search.from === "midway" ? ("midway" as const) : undefined,
  };
}
