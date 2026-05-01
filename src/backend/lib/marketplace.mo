import Common "../types/common";
import Types "../types/marketplace";
import PlantTypes "../types/plants";
import MembershipTypes "../types/membership";
import ClaimTypes "../types/claim";
import ClaimLib "claim";
import Map "mo:core/Map";
import List "mo:core/List";
import Time "mo:core/Time";
import Runtime "mo:core/Runtime";
import Result "mo:core/Result";
import Principal "mo:core/Principal";

module {
  // ---------------------------------------------------------------------------
  // helpers
  // ---------------------------------------------------------------------------

  // Derive the canonical image_keys array from a CreateProductInput.
  // When the caller provides a non-empty image_keys array, use it directly.
  // When only the legacy image_key field is set, wrap it in a single-element array.
  // Otherwise return an empty array.
  func resolveImageKeys(input : Types.CreateProductInput) : [Text] {
    if (input.image_keys.size() > 0) {
      input.image_keys;
    } else {
      switch (input.image_key) {
        case (?k) { [k] };
        case null { [] };
      };
    };
  };

  // ---------------------------------------------------------------------------
  // products
  // ---------------------------------------------------------------------------

  public func createProduct(
    products : Map.Map<Common.ProductId, Types.Product>,
    nextId : Nat,
    input : Types.CreateProductInput,
  ) : Types.Product {
    let keys = resolveImageKeys(input);
    let product : Types.Product = {
      id = nextId;
      var name = input.name;
      var description = input.description;
      var price_cents = input.price_cents;
      category = input.category;
      inventory_category = input.inventory_category;
      variety = input.variety;
      var active = true;
      var image_key = input.image_key;
      var image_keys = keys;
      var plant_id = input.plant_id;
    };
    products.add(nextId, product);
    product;
  };

  public func updateProduct(
    products : Map.Map<Common.ProductId, Types.Product>,
    input : Types.UpdateProductInput,
  ) : () {
    switch (products.get(input.product_id)) {
      case null { Runtime.trap("Product not found") };
      case (?product) {
        switch (input.name) {
          case (?n) { product.name := n };
          case null {};
        };
        switch (input.description) {
          case (?d) { product.description := d };
          case null {};
        };
        switch (input.price_cents) {
          case (?p) { product.price_cents := p };
          case null {};
        };
        switch (input.active) {
          case (?a) { product.active := a };
          case null {};
        };
        switch (input.image_key) {
          case (?k) { product.image_key := ?k };
          case null {};
        };
        switch (input.image_keys) {
          case (?keys) { product.image_keys := keys };
          case null {};
        };
      };
    };
  };

  public func deleteProduct(
    products : Map.Map<Common.ProductId, Types.Product>,
    product_id : Common.ProductId,
  ) : () {
    switch (products.get(product_id)) {
      case null { Runtime.trap("Product not found") };
      case (?product) { product.active := false };
    };
  };

  /// Create multiple products in one call.
  /// Returns per-item Result — failures do not abort the whole batch.
  public func bulkCreateProducts(
    products : Map.Map<Common.ProductId, Types.Product>,
    nextId : { var value : Nat },
    inputs : [Types.CreateProductInput],
  ) : [Types.BulkCreateResult] {
    inputs.map<Types.CreateProductInput, Types.BulkCreateResult>(func(input) {
      let id = nextId.value;
      nextId.value += 1;
      let product = createProduct(products, id, input);
      #ok(toPublicProduct(product));
    });
  };

  // ---------------------------------------------------------------------------
  // orders
  // ---------------------------------------------------------------------------

  public func createOrder(
    orders : Map.Map<Common.OrderId, Types.Order>,
    _plants : Map.Map<Common.PlantId, PlantTypes.Plant>,
    _memberships : Map.Map<Principal, MembershipTypes.MembershipNFT>,
    _claimTokens : Map.Map<Common.ClaimTokenId, ClaimTypes.ClaimToken>,
    nextId : Nat,
    buyer : Principal,
    input : Types.CreateOrderInput,
  ) : Types.Order {
    var total : Nat = 0;
    for (item in input.items.values()) {
      total += item.price_cents * item.quantity;
    };
    let order : Types.Order = {
      id = nextId;
      buyer = buyer;
      items = input.items;
      total_cents = total;
      shipping_address = input.shipping_address;
      pickup = input.pickup;
      var status = #Pending;
      created_at = Time.now();
    };
    orders.add(nextId, order);
    order;
  };

  public func updateOrderStatus(
    orders : Map.Map<Common.OrderId, Types.Order>,
    order_id : Common.OrderId,
    status : Types.OrderStatus,
  ) : () {
    switch (orders.get(order_id)) {
      case null { Runtime.trap("Order not found") };
      case (?order) { order.status := status };
    };
  };

  // ---------------------------------------------------------------------------
  // queries
  // ---------------------------------------------------------------------------

  public func getProduct(
    products : Map.Map<Common.ProductId, Types.Product>,
    product_id : Common.ProductId,
  ) : ?Types.ProductPublic {
    switch (products.get(product_id)) {
      case null { null };
      case (?p) { ?toPublicProduct(p) };
    };
  };

  public func listProducts(
    products : Map.Map<Common.ProductId, Types.Product>,
  ) : [Types.ProductPublic] {
    let results = List.empty<Types.ProductPublic>();
    for ((_, p) in products.entries()) {
      if (p.active) {
        results.add(toPublicProduct(p));
      };
    };
    results.toArray();
  };

  public func listProductsByCategory(
    products : Map.Map<Common.ProductId, Types.Product>,
    category : Types.ProductCategory,
  ) : [Types.ProductPublic] {
    let results = List.empty<Types.ProductPublic>();
    for ((_, p) in products.entries()) {
      if (p.active and p.category == category) {
        results.add(toPublicProduct(p));
      };
    };
    results.toArray();
  };

  public func getOrder(
    orders : Map.Map<Common.OrderId, Types.Order>,
    order_id : Common.OrderId,
  ) : ?Types.OrderPublic {
    switch (orders.get(order_id)) {
      case null { null };
      case (?o) { ?toPublicOrder(o) };
    };
  };

  public func listOrdersByBuyer(
    orders : Map.Map<Common.OrderId, Types.Order>,
    buyer : Principal,
  ) : [Types.OrderPublic] {
    let results = List.empty<Types.OrderPublic>();
    for ((_, o) in orders.entries()) {
      if (Principal.equal(o.buyer, buyer)) {
        results.add(toPublicOrder(o));
      };
    };
    results.toArray();
  };

  public func toPublicProduct(p : Types.Product) : Types.ProductPublic {
    // Backward compat: if image_keys is empty but image_key is set, surface [image_key]
    let keys : [Text] = if (p.image_keys.size() > 0) {
      p.image_keys;
    } else {
      switch (p.image_key) {
        case (?k) { [k] };
        case null { [] };
      };
    };
    {
      id = p.id;
      name = p.name;
      description = p.description;
      price_cents = p.price_cents;
      category = p.category;
      inventory_category = p.inventory_category;
      variety = p.variety;
      active = p.active;
      image_key = p.image_key;
      image_keys = keys;
      plant_id = p.plant_id;
    };
  };

  public func toPublicOrder(o : Types.Order) : Types.OrderPublic {
    {
      id = o.id;
      buyer = o.buyer;
      items = o.items;
      total_cents = o.total_cents;
      shipping_address = o.shipping_address;
      pickup = o.pickup;
      status = o.status;
      created_at = o.created_at;
    };
  };
};
