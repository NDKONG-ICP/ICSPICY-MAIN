// lib/product-inventory.mo — catalog stock tracking (side map; Product record is stable).

import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Result "mo:core/Result";
import Common "../types/common";
import MarketTypes "../types/marketplace";
import ProductShipping "../lib/product-shipping";

module {
  public func initOnCreate(
    productInventoryRemaining : Map.Map<Common.ProductId, Nat>,
    productId : Common.ProductId,
    input : MarketTypes.CreateProductInput,
    config : ProductShipping.ProductShippingConfig,
  ) : () {
    switch (input.plant_id) {
      case (?_) return;
      case null {};
    };
    if (config.weight_based) return;
    let qty = switch (input.inventory_quantity) {
      case (?q) { if (q > 0) q else 1 };
      case null 1;
    };
    productInventoryRemaining.add(productId, qty);
  };

  public func remainingForPublic(
    productInventoryRemaining : Map.Map<Common.ProductId, Nat>,
    productId : Common.ProductId,
    config : ?ProductShipping.ProductShippingConfig,
  ) : ?Nat {
    switch (config) {
      case (?c) { if (c.weight_based) return null };
      case null {};
    };
    productInventoryRemaining.get(productId);
  };

  public func validateOrderQuantity(
    productInventoryRemaining : Map.Map<Common.ProductId, Nat>,
    product : MarketTypes.Product,
    config : ProductShipping.ProductShippingConfig,
    totalQuantity : Nat,
  ) : Result.Result<(), Text> {
    if (config.weight_based) return #ok(());
    switch (product.plant_id) {
      case (?_) return #ok(());
      case null {};
    };
    switch (productInventoryRemaining.get(product.id)) {
      case null {
        if (totalQuantity > 1) {
          return #err("Insufficient stock for: " # product.name);
        };
        #ok(());
      };
      case (?rem) {
        if (totalQuantity > rem) {
          return #err(
            "Insufficient stock for: " # product.name #
            " (available: " # Nat.toText(rem) # ")",
          );
        };
        #ok(());
      };
    };
  };

  public func consumeOnSettlement(
    products : Map.Map<Common.ProductId, MarketTypes.Product>,
    productInventoryRemaining : Map.Map<Common.ProductId, Nat>,
    productId : Common.ProductId,
    config : ProductShipping.ProductShippingConfig,
    quantity : Nat,
  ) : Bool {
    if (config.weight_based) return false;
    switch (products.get(productId)) {
      case null return false;
      case (?product) {
        switch (product.plant_id) {
          case (?_) return false;
          case null {};
        };
        switch (productInventoryRemaining.get(productId)) {
          case null {
            product.active := false;
            true;
          };
          case (?rem) {
            if (quantity >= rem) {
              product.active := false;
              ignore productInventoryRemaining.delete(productId);
            } else {
              productInventoryRemaining.add(productId, rem - quantity);
            };
            true;
          };
        };
      };
    };
  };

  public func hasRemainingStock(
    productInventoryRemaining : Map.Map<Common.ProductId, Nat>,
    productId : Common.ProductId,
    config : ?ProductShipping.ProductShippingConfig,
  ) : Bool {
    switch (config) {
      case (?c) { if (c.weight_based) return true };
      case null {};
    };
    switch (productInventoryRemaining.get(productId)) {
      case (?0) false;
      case (?_) true;
      case null true;
    };
  };
};
