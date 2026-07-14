// lib/ingredient-inventory.mo — Soft-bridge pantry persistence (JSON blob).
//
// ANTI-CHEAT NOTE: Inventory is client-attested. Server enforces size cap +
// sanitize + JSON-object shape only. Do NOT attach real-world value to pantry
// items yet — caps + sanity, not cryptographic provenance.
//
// Documented shape (frontend-enforced array caps of 60/60):
// { version:1,
//   raw:    [{id, variety, podColor, shu, careQuality, harvestedAt}],
//   sliced: [{id, variety, podColor, shu, careQuality, sliceQuality, slicedAt}] }

import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Result "mo:core/Result";
import Text "mo:core/Text";
import Sanitize "../lib/sanitize";
import Types "../types/ingredient-inventory";

module {
  public let MAX_INVENTORY_JSON_CHARS : Nat = 8_192;

  public func saveInventory(
    inventory : Map.Map<Principal, Types.IngredientInventoryBlob>,
    caller : Principal,
    jsonRaw : Text,
  ) : Result.Result<(), Text> {
    let json = Sanitize.sanitizeText(jsonRaw, MAX_INVENTORY_JSON_CHARS);
    if (json.size() < 10) {
      return #err("Ingredient inventory too small");
    };
    if (not Text.startsWith(json, #text "{")) {
      return #err("Ingredient inventory must be JSON object");
    };
    inventory.add(caller, json);
    #ok(());
  };

  public func getInventory(
    inventory : Map.Map<Principal, Types.IngredientInventoryBlob>,
    caller : Principal,
  ) : ?Types.IngredientInventoryBlob {
    inventory.get(caller);
  };
};
