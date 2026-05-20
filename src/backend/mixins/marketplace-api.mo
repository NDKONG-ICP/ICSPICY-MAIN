import Map "mo:core/Map";
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";
import Int "mo:core/Int";
import Time "mo:core/Time";
import Nat "mo:core/Nat";
import Array "mo:core/Array";
import AccessControl "../lib/access-control";
import Common "../types/common";
import MarketTypes "../types/marketplace";
import PlantTypes "../types/plants";
import MembershipTypes "../types/membership";
import ClaimTypes "../types/claim";
import MarketLib "../lib/marketplace";
import MarketOrder "../lib/marketplace-order";
import ProductNft "../lib/product-nft";
import ProductShipping "../lib/product-shipping";
import ProductInventory "../lib/product-inventory";
import ICRC7 "../types/icrc7";
import Set "mo:core/Set";

mixin (
  accessControlState : AccessControl.AccessControlState,
  products : Map.Map<Common.ProductId, MarketTypes.Product>,
  orders : Map.Map<Common.OrderId, MarketTypes.Order>,
  plants : Map.Map<Common.PlantId, PlantTypes.Plant>,
  memberships : Map.Map<Principal, MembershipTypes.MembershipNFT>,
  claimTokens : Map.Map<Common.ClaimTokenId, ClaimTypes.ClaimToken>,
  productNftTokenIds : Map.Map<Common.ProductId, Nat>,
  productInventoryRemaining : Map.Map<Common.ProductId, Nat>,
  productShippingConfigs : Map.Map<Common.ProductId, ProductShipping.ProductShippingConfig>,
  orderLineNftTokenIds : Map.Map<Common.OrderId, [Nat]>,
  orderPickupClaimTokens : Map.Map<Common.OrderId, [Text]>,
  orderShippingCents : Map.Map<Common.OrderId, Nat>,
  orderShippingAddresses : Map.Map<Common.OrderId, MarketTypes.ShippingAddress>,
  icrc7Owners : Map.Map<Nat, ICRC7.Account>,
  icrc7Balances : Map.Map<Principal, Set.Set<Nat>>,
  selfPrincipal : () -> Principal,
  nextProductId : { var value : Nat },
  nextOrderId : { var value : Nat },
) {
  func toPublic(p : MarketTypes.Product) : MarketTypes.ProductPublic {
    let config = productShippingConfigs.get(p.id);
    MarketLib.toPublicProduct(
      p,
      productNftTokenIds.get(p.id),
      config,
      ProductInventory.remainingForPublic(productInventoryRemaining, p.id, config),
    );
  };

  func toPublicOrder(order : MarketTypes.Order) : MarketTypes.OrderPublic {
    let shipping = orderShippingCents.get(order.id);
    let lineNfts = switch (orderLineNftTokenIds.get(order.id)) {
      case (?ids) ids;
      case null [];
    };
    {
      id = order.id;
      buyer = order.buyer;
      items = order.items;
      subtotal_cents = MarketOrder.subtotalCents(order);
      shipping_cents = switch shipping { case (?s) s; case null 0 };
      total_cents = order.total_cents;
      shipping_address = order.shipping_address;
      shipping = orderShippingAddresses.get(order.id);
      pickup = order.pickup;
      status = order.status;
      created_at = order.created_at;
      line_nft_token_ids = lineNfts;
    };
  };

  func saveProductConfig(productId : Common.ProductId, input : MarketTypes.CreateProductInput) {
    let cfg = ProductShipping.applyCategoryDefaults(
      input.category,
      ProductShipping.configFromInput(input),
    );
    productShippingConfigs.add(productId, cfg);
  };

  func placeOrderInternal(caller : Principal, input : MarketTypes.CreateOrderInput) : MarketTypes.Order {
    let orderId = nextOrderId.value;
    switch (
      MarketOrder.createValidatedOrder(
        orders, products, productShippingConfigs, productInventoryRemaining,
        orderShippingCents, orderShippingAddresses,
        icrc7Balances,
        orderId, caller, input,
      )
    ) {
      case (#err(e)) Runtime.trap(e);
      case (#ok(order)) {
        nextOrderId.value += 1;
        order;
      };
    };
  };

  // Admin: create product listing (NFT assigned per line item at checkout, not here)
  public shared ({ caller }) func createProduct(input : MarketTypes.CreateProductInput) : async MarketTypes.ProductPublic {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Admin only");
    };
    let productId = nextProductId.value;
    ignore MarketLib.createProduct(products, productId, input);
    saveProductConfig(productId, input);
    ProductInventory.initOnCreate(
      productInventoryRemaining,
      productId,
      input,
      ProductShipping.applyCategoryDefaults(
        input.category,
        ProductShipping.configFromInput(input),
      ),
    );
    ProductNft.linkPlantListingNft(products, productNftTokenIds, plants, productId);
    ProductNft.assignCatalogNftOnCreate(
      products, productNftTokenIds, icrc7Owners, selfPrincipal(), productId,
    );
    nextProductId.value += 1;
    switch (products.get(productId)) {
      case null Runtime.trap("Product missing after create");
      case (?p) toPublic(p);
    };
  };

  public shared ({ caller }) func bulkCreateProducts(inputs : [MarketTypes.CreateProductInput]) : async [MarketTypes.BulkCreateResult] {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Admin only");
    };
    var results : [MarketTypes.BulkCreateResult] = [];
    for (input in inputs.vals()) {
      let productId = nextProductId.value;
      nextProductId.value += 1;
      ignore MarketLib.createProduct(products, productId, input);
      saveProductConfig(productId, input);
      ProductInventory.initOnCreate(
        productInventoryRemaining,
        productId,
        input,
        ProductShipping.applyCategoryDefaults(
          input.category,
          ProductShipping.configFromInput(input),
        ),
      );
      ProductNft.linkPlantListingNft(products, productNftTokenIds, plants, productId);
      ProductNft.assignCatalogNftOnCreate(
        products, productNftTokenIds, icrc7Owners, selfPrincipal(), productId,
      );
      switch (products.get(productId)) {
        case null results := Array.concat(results, [#err("Product missing after create")]);
        case (?p) results := Array.concat(results, [#ok(toPublic(p))]);
      };
    };
    results;
  };

  public shared ({ caller }) func updateProduct(input : MarketTypes.UpdateProductInput) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Admin only");
    };
    MarketLib.updateProduct(products, input);
  };

  public shared ({ caller }) func deleteProduct(product_id : Common.ProductId) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Admin only");
    };
    MarketLib.deleteProduct(products, product_id);
  };

  public shared ({ caller }) func createOrder(buyer : Principal, input : MarketTypes.CreateOrderInput) : async MarketTypes.OrderPublic {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Admin only");
    };
    toPublicOrder(placeOrderInternal(buyer, input));
  };

  public shared ({ caller }) func updateOrderStatus(order_id : Common.OrderId, status : MarketTypes.OrderStatus) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Admin only");
    };
    MarketLib.updateOrderStatus(orders, order_id, status);
  };

  public query func getProduct(product_id : Common.ProductId) : async ?MarketTypes.ProductPublic {
    switch (products.get(product_id)) {
      case null null;
      case (?p) ?toPublic(p);
    };
  };

  public query func listProducts() : async [MarketTypes.ProductPublic] {
    var out : [MarketTypes.ProductPublic] = [];
    for ((_, p) in products.entries()) {
      if (p.active) {
        let pub = toPublic(p);
        switch (pub.inventory_remaining) {
          case (?0) {};
          case (_) { out := Array.concat(out, [pub]) };
        };
      };
    };
    out;
  };

  public query func listProductsByCategory(category : MarketTypes.ProductCategory) : async [MarketTypes.ProductPublic] {
    var out : [MarketTypes.ProductPublic] = [];
    for ((_, p) in products.entries()) {
      if (p.active and p.category == category) {
        let pub = toPublic(p);
        switch (pub.inventory_remaining) {
          case (?0) {};
          case (_) { out := Array.concat(out, [pub]) };
        };
      };
    };
    out;
  };

  public query ({ caller }) func getOrder(order_id : Common.OrderId) : async ?MarketTypes.OrderPublic {
    switch (orders.get(order_id)) {
      case null null;
      case (?order) {
        if (Principal.equal(order.buyer, caller) or AccessControl.isAdmin(accessControlState, caller)) {
          ?toPublicOrder(order);
        } else {
          null;
        };
      };
    };
  };

  public query ({ caller }) func getOrderPickupClaimTokens(order_id : Common.OrderId) : async [Text] {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      switch (orders.get(order_id)) {
        case null return [];
        case (?order) {
          if (not Principal.equal(order.buyer, caller)) return [];
        };
      };
    };
    switch (orderPickupClaimTokens.get(order_id)) {
      case (?tokens) tokens;
      case null [];
    };
  };

  public query ({ caller }) func listOrdersByBuyer() : async [MarketTypes.OrderPublic] {
    var out : [MarketTypes.OrderPublic] = [];
    for ((_, order) in orders.entries()) {
      if (order.buyer == caller) {
        out := Array.concat(out, [toPublicOrder(order)]);
      };
    };
    out;
  };

  public shared ({ caller }) func placeOrder(input : MarketTypes.CreateOrderInput) : async MarketTypes.OrderPublic {
    AccessControl.requireAuthenticated(caller);
    toPublicOrder(placeOrderInternal(caller, input));
  };
};
