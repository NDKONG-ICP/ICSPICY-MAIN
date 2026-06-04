// lib/marketplace-order.mo — validated order creation with shipping + pricing.

import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Array "mo:core/Array";
import Time "mo:core/Time";
import Principal "mo:core/Principal";
import Result "mo:core/Result";
import Runtime "mo:core/Runtime";
import Common "../types/common";
import MarketTypes "../types/marketplace";
import PlantTypes "../types/plants";
import ProductShipping "../lib/product-shipping";
import ProductInventory "../lib/product-inventory";
import NftDiscount "../lib/nft-discount";
import Set "mo:core/Set";

module {
  // 100K RAVEN in base units (8 decimals = 10_000_000_000_000). Holders earn a 5% shop discount.
  let RAVEN_MEMBER_THRESHOLD : Nat = 10_000_000_000_000;

  /// Return 5% discount if the buyer (or a linked wallet) holds ≥ 100K RAVEN.
  /// Reads from a balance cache populated by `refreshRavenBalance()`.
  func ravenDiscountPercent(
    cache : Map.Map<Principal, Nat>,
    linkedWallets : Map.Map<Principal, [Principal]>,
    buyer : Principal,
  ) : Nat {
    let check = func(p : Principal) : Bool {
      switch (cache.get(p)) {
        case (?bal) bal >= RAVEN_MEMBER_THRESHOLD;
        case null false;
      };
    };
    if (check(buyer)) return 5;
    switch (linkedWallets.get(buyer)) {
      case null {};
      case (?wallets) {
        for (wallet in wallets.vals()) {
          if (check(wallet)) return 5;
        };
      };
    };
    0;
  };

  public func createValidatedOrder(
    orders : Map.Map<Common.OrderId, MarketTypes.Order>,
    products : Map.Map<Common.ProductId, MarketTypes.Product>,
    productShippingConfigs : Map.Map<Common.ProductId, ProductShipping.ProductShippingConfig>,
    productInventoryRemaining : Map.Map<Common.ProductId, Nat>,
    orderShippingCents : Map.Map<Common.OrderId, Nat>,
    orderShippingAddresses : Map.Map<Common.OrderId, MarketTypes.ShippingAddress>,
    icrc7Balances : Map.Map<Principal, Set.Set<Nat>>,
    linkedWallets : Map.Map<Principal, [Principal]>,
    ravenBalanceCache : Map.Map<Principal, Nat>,
    nextId : Nat,
    buyer : Principal,
    input : MarketTypes.CreateOrderInput,
  ) : Result.Result<MarketTypes.Order, Text> {
    if (input.items.size() == 0) return #err("Order must have at least one item");
    if (input.pickup) {
      switch (input.shipping) {
        case (?_) return #err("Shipping address not needed for pickup orders");
        case null {};
      };
    } else {
      switch (input.shipping) {
        case null return #err("Shipping address required");
        case (?addr) {
          if (addr.full_name.size() == 0 or addr.street_line1.size() == 0
            or addr.city.size() == 0 or addr.state.size() == 0
            or addr.zip.size() == 0 or addr.phone.size() == 0) {
            return #err("Complete shipping address required");
          };
          orderShippingAddresses.add(nextId, addr);
        };
      };
    };
    let shippingCents = if (input.pickup) {
      0;
    } else {
      ProductShipping.USPS_SMALL_FLAT_RATE_CENTS;
    };
    var validatedItems : [MarketTypes.OrderItem] = [];
    var subtotal : Nat = 0;
    var requestedQtyByProduct = Map.empty<Common.ProductId, Nat>();
    for (item in input.items.vals()) {
      let product = switch (products.get(item.product_id)) {
        case null return #err("Product not found: " # Nat.toText(item.product_id));
        case (?p) p;
      };
      if (not product.active) return #err("Product inactive: " # product.name);
      let config = switch (productShippingConfigs.get(product.id)) {
        case (?c) c;
        case null {
          {
            shippable = false;
            shipping_flat_rate_cents = null;
            weight_based = false;
            price_per_unit_cents = product.price_cents;
            unit_label = null;
          };
        };
      };
      switch (ProductShipping.validateLineQuantity(product, config, item.quantity)) {
        case (#err(e)) return #err(e);
        case (#ok) {};
      };
      let priorQty = switch (requestedQtyByProduct.get(item.product_id)) {
        case (?q) q;
        case null 0;
      };
      let totalRequested = priorQty + item.quantity;
      switch (
        ProductInventory.validateOrderQuantity(
          productInventoryRemaining, product, config, totalRequested,
        )
      ) {
        case (#err(e)) return #err(e);
        case (#ok) {};
      };
      requestedQtyByProduct.add(item.product_id, totalRequested);
      let unitPrice = ProductShipping.lineUnitPriceCents(product, config);
      let lineTotal = unitPrice * item.quantity;
      subtotal += lineTotal;
      let validated : MarketTypes.OrderItem = {
        product_id = item.product_id;
        plant_id = item.plant_id;
        quantity = item.quantity;
        price_cents = unitPrice;
      };
      validatedItems := Array.concat(validatedItems, [validated]);
    };
    let nftDiscount = NftDiscount.callerDiscountFromBalances(icrc7Balances, linkedWallets, buyer);
    let ravenBonus = ravenDiscountPercent(ravenBalanceCache, linkedWallets, buyer);
    let totalDiscountPct = Nat.min(nftDiscount.discountPercent + ravenBonus, 20);
    let discountedSubtotal = NftDiscount.discountedSubtotalCents(subtotal, totalDiscountPct);
    let total = discountedSubtotal + shippingCents;
    orderShippingCents.add(nextId, shippingCents);
    let shippingText = switch (orderShippingAddresses.get(nextId)) {
      case (?a) ?ProductShipping.formatShippingAddress(a);
      case null null;
    };
    let order : MarketTypes.Order = {
      id = nextId;
      buyer = buyer;
      items = validatedItems;
      total_cents = total;
      shipping_address = shippingText;
      pickup = input.pickup;
      var status = #Pending;
      created_at = Time.now();
    };
    orders.add(nextId, order);
    #ok(order);
  };

  public func subtotalCents(order : MarketTypes.Order) : Nat {
    var sum : Nat = 0;
    for (item in order.items.vals()) {
      sum += item.price_cents * item.quantity;
    };
    sum;
  };
};
