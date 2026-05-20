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

module {
  public func createValidatedOrder(
    orders : Map.Map<Common.OrderId, MarketTypes.Order>,
    products : Map.Map<Common.ProductId, MarketTypes.Product>,
    productShippingConfigs : Map.Map<Common.ProductId, ProductShipping.ProductShippingConfig>,
    orderShippingCents : Map.Map<Common.OrderId, Nat>,
    orderShippingAddresses : Map.Map<Common.OrderId, MarketTypes.ShippingAddress>,
    nextId : Nat,
    buyer : Principal,
    input : MarketTypes.CreateOrderInput,
  ) : Result.Result<MarketTypes.Order, Text> {
    if (input.items.size() == 0) return #err("Order must have at least one item");
    let hasShippable = ProductShipping.orderHasShippableItems(
      input.items, products, productShippingConfigs,
    );
    let shippingCents = ProductShipping.computeShippingCents(
      input.items, products, productShippingConfigs,
    );
    if (hasShippable) {
      switch (input.shipping) {
        case null return #err("Shipping address required for shippable items");
        case (?addr) {
          if (addr.full_name.size() == 0 or addr.street_line1.size() == 0
            or addr.city.size() == 0 or addr.state.size() == 0
            or addr.zip.size() == 0 or addr.phone.size() == 0) {
            return #err("Complete shipping address required");
          };
          orderShippingAddresses.add(nextId, addr);
        };
      };
    } else {
      switch (input.shipping) {
        case (?_) return #err("Shipping address not needed for pickup-only orders");
        case null {};
      };
    };
    var validatedItems : [MarketTypes.OrderItem] = [];
    var subtotal : Nat = 0;
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
    let total = subtotal + shippingCents;
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
      pickup = not hasShippable;
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
