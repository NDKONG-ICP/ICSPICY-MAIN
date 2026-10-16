/** @param {Array<[string, import('@dfinity/candid').IDL.Value]>} entries */
export function rarityFromMetadataEntries(entries) {
  if (!entries?.length) return "Unknown";
  for (const [key, val] of entries) {
    if (!/rarity|tier|grade/i.test(key)) continue;
    if ("Text" in val) return val.Text;
    if ("Nat" in val) {
      const n = Number(val.Nat);
      if (n >= 15) return "Rare";
      if (n >= 12) return "Uncommon";
      return "Common";
    }
  }
  return "Unknown";
}

/** @param {import('@dfinity/candid').IDL.Value} v */
function unwrapValue(v) {
  if (v && typeof v === "object") {
    if ("Text" in v) return v.Text;
    if ("Nat" in v) return String(v.Nat);
  }
  return null;
}

export function traitsFromMetadataEntries(entries) {
  const out = [];
  if (!entries) return out;
  for (const [key, val] of entries) {
    const text = unwrapValue(val);
    if (text != null) out.push({ trait: key, value: text });
  }
  return out;
}
