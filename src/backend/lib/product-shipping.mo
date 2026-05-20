// lib/product-shipping.mo — product shipping/weight config + order validation.

import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Text "mo:core/Text";
import Runtime "mo:core/Runtime";
import Result "mo:core/Result";
import Common "../types/common";
import MarketTypes "../types/marketplace";

module {
  public let USPS_SMALL_FLAT_RATE_CENTS : Nat = 1020;

  public type ProductShippingConfig = {
    shippable : Bool;
    shipping_flat_rate_cents : ?Nat;
    weight_based : Bool;
    price_per_unit_cents : Nat;
    unit_label : ?Text;
  };

  public func configFromInput(input : MarketTypes.CreateProductInput) : ProductShippingConfig {
    let unitPrice = switch (input.price_per_unit_cents) {
      case (?p) p;
      case null input.price_cents;
    };
    {
      shippable = input.shippable;
      shipping_flat_rate_cents = input.shipping_flat_rate_cents;
      weight_based = input.weight_based;
      price_per_unit_cents = unitPrice;
      unit_label = input.unit_label;
    };
  };

  public func defaultFreshPodsByLb() : ProductShippingConfig {
    {
      shippable = false;
      shipping_flat_rate_cents = null;
      weight_based = true;
      price_per_unit_cents = 1299;
      unit_label = ?"lb";
    };
  };

  public func defaultFreshPodsFlatRate() : ProductShippingConfig {
    {
      shippable = true;
      shipping_flat_rate_cents = ?USPS_SMALL_FLAT_RATE_CENTS;
      weight_based = false;
      price_per_unit_cents = 2599;
      unit_label = null;
    };
  };

  public func applyCategoryDefaults(
    category : MarketTypes.ProductCategory,
    config : ProductShippingConfig,
  ) : ProductShippingConfig {
    switch (category) {
      case (#FreshPodsByLb) defaultFreshPodsByLb();
      case (#FreshPodsFlatRate) defaultFreshPodsFlatRate();
      case (_) config;
    };
  };

  public func lineUnitPriceCents(
    product : MarketTypes.Product,
    config : ProductShippingConfig,
  ) : Nat {
    if (config.weight_based) config.price_per_unit_cents else product.price_cents;
  };

  public func lineTotalCents(
    product : MarketTypes.Product,
    config : ProductShippingConfig,
    quantity : Nat,
  ) : Nat {
    lineUnitPriceCents(product, config) * quantity;
  };

  public func isUniqueListing(product : MarketTypes.Product) : Bool {
    switch (product.plant_id) {
      case (?_) true;
      case null false;
    };
  };

  public func validateLineQuantity(
    product : MarketTypes.Product,
    config : ProductShippingConfig,
    quantity : Nat,
  ) : Result.Result<(), Text> {
    if (quantity == 0) return #err("Quantity must be at least 1");
    if (isUniqueListing(product) and quantity != 1) {
      return #err("Live plant listings must have quantity 1");
    };
    if (config.weight_based and quantity == 0) {
      return #err("Weight must be at least 1");
    };
    #ok(());
  };

  public func orderHasShippableItems(
    items : [MarketTypes.OrderItem],
    products : Map.Map<Common.ProductId, MarketTypes.Product>,
    configs : Map.Map<Common.ProductId, ProductShippingConfig>,
  ) : Bool {
    var found = false;
    for (item in items.vals()) {
      switch (products.get(item.product_id)) {
        case null {};
        case (?p) {
          switch (configs.get(p.id)) {
            case (?cfg) { if (cfg.shippable) found := true };
            case null {};
          };
        };
      };
    };
    found;
  };

  public func computeShippingCents(
    items : [MarketTypes.OrderItem],
    products : Map.Map<Common.ProductId, MarketTypes.Product>,
    configs : Map.Map<Common.ProductId, ProductShippingConfig>,
  ) : Nat {
    if (orderHasShippableItems(items, products, configs)) {
      USPS_SMALL_FLAT_RATE_CENTS;
    } else {
      0;
    };
  };

  public func formatShippingAddress(addr : MarketTypes.ShippingAddress) : Text {
    let line2 = switch (addr.street_line2) {
      case (?l) l # "\n";
      case null "";
    };
    addr.full_name # "\n" #
    addr.street_line1 # "\n" #
    line2 #
    addr.city # ", " # addr.state # " " # addr.zip # "\n" #
    addr.phone;
  };

  public func enrichProductPublic(
    pub : MarketTypes.ProductPublic,
    config : ?ProductShippingConfig,
    nftTokenId : ?Nat,
  ) : MarketTypes.ProductPublic {
    switch (config) {
      case null {
        {
          pub with
          nft_token_id = nftTokenId;
        };
      };
      case (?cfg) {
        {
          pub with
          nft_token_id = nftTokenId;
          shippable = cfg.shippable;
          shipping_flat_rate_cents = cfg.shipping_flat_rate_cents;
          weight_based = cfg.weight_based;
          price_per_unit_cents = cfg.price_per_unit_cents;
          unit_label = cfg.unit_label;
        };
      };
    };
  };
};
