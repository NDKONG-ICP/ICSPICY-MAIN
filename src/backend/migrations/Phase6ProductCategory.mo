// migrations/Phase6ProductCategory.mo
// One-time stable upgrade: ProductCategory 5 → 10 variants (Phase 6).
//
// Attach in main.mo ONLY when upgrading FROM pre-Phase-6 mainnet wasm:
//   import { migration } "migrations/Phase6ProductCategory";
//   (with migration)
//
// After that cutover succeeds, remove the hook — subsequent upgrades use
// MarketTypes.ProductCategory directly (10 variants already in stable memory).
//
// Do NOT import types/marketplace.mo here — Old/New types must stay isolated
// so the stable checker sees exactly 5 variants in the migration domain.

import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Common "../types/common";

module {
  // ── Mainnet-stable types (retired wasm) ───────────────────────────────────

  type OldProductCategory = {
    #Gallon1;
    #Gallon5;
    #GardenInputs;
    #Seedling;
    #Spice;
  };

  type OldInventoryCategory = {
    #Oz16;
    #Gal1;
    #Gal3;
    #Gal5;
    #InGround;
    #OtherSize : Text;
  };

  type OldProduct = {
    id : Common.ProductId;
    var name : Text;
    var description : Text;
    var price_cents : Nat;
    category : OldProductCategory;
    inventory_category : ?OldInventoryCategory;
    variety : ?Text;
    var active : Bool;
    var image_key : ?Text;
    var image_keys : [Text];
    var plant_id : ?Common.PlantId;
  };

  // ── Post-upgrade types (new wasm) ─────────────────────────────────────────

  type NewProductCategory = {
    #Gallon1;
    #Gallon5;
    #GardenInputs;
    #Seedling;
    #Spice;
    #LivePlant;
    #DriedPods;
    #FreshPodsByLb;
    #FreshPodsFlatRate;
    #GardenAmendment;
  };

  type NewInventoryCategory = {
    #Oz16;
    #Gal1;
    #Gal3;
    #Gal5;
    #InGround;
    #OtherSize : Text;
  };

  type NewProduct = {
    id : Common.ProductId;
    var name : Text;
    var description : Text;
    var price_cents : Nat;
    category : NewProductCategory;
    inventory_category : ?NewInventoryCategory;
    variety : ?Text;
    var active : Bool;
    var image_key : ?Text;
    var image_keys : [Text];
    var plant_id : ?Common.PlantId;
  };

  func migrateCategory(c : OldProductCategory) : NewProductCategory {
    switch (c) {
      case (#Gallon1) #Gallon1;
      case (#Gallon5) #Gallon5;
      case (#GardenInputs) #GardenInputs;
      case (#Seedling) #Seedling;
      case (#Spice) #Spice;
    };
  };

  func migrateInventoryCategory(c : OldInventoryCategory) : NewInventoryCategory {
    switch (c) {
      case (#Oz16) #Oz16;
      case (#Gal1) #Gal1;
      case (#Gal3) #Gal3;
      case (#Gal5) #Gal5;
      case (#InGround) #InGround;
      case (#OtherSize(t)) #OtherSize(t);
    };
  };

  func migrateProduct(old : OldProduct) : NewProduct {
    {
      id = old.id;
      var name = old.name;
      var description = old.description;
      var price_cents = old.price_cents;
      category = migrateCategory(old.category);
      inventory_category = switch (old.inventory_category) {
        case null null;
        case (?c) ?migrateInventoryCategory(c);
      };
      variety = old.variety;
      var active = old.active;
      var image_key = old.image_key;
      var image_keys = old.image_keys;
      var plant_id = old.plant_id;
    };
  };

  func migrateProductsMap(
    old : Map.Map<Common.ProductId, OldProduct>,
  ) : Map.Map<Common.ProductId, NewProduct> {
    let next = Map.empty<Common.ProductId, NewProduct>();
    for ((id, p) in old.entries()) {
      Map.add(next, Nat.compare, id, migrateProduct(p));
    };
    next;
  };

  public func migration(
    old : { products : Map.Map<Common.ProductId, OldProduct> },
  ) : { products : Map.Map<Common.ProductId, NewProduct> } {
    { products = migrateProductsMap(old.products) };
  };
};
