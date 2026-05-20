import Common "common";

module {
  // Original shop category variants kept for existing products.
  // InventoryCategory mirrors ContainerSize for NIMS transplant items
  // and stays consistent with types/plants.mo ContainerSize.
  public type ProductCategory = {
    // Legacy shop categories (stable — do not remove)
    #Seedling;
    #Gallon1;
    #Gallon5;
    #Spice;
    #GardenInputs;
    // Phase 6 product types
    #LivePlant;
    #DriedPods;
    #GardenAmendment;
    #FreshPodsByLb;
    #FreshPodsFlatRate;
  };

  public type InventoryCategory = {
    #Oz16;
    #Gal1;
    #Gal3;
    #Gal5;
    #InGround;
    #OtherSize : Text;
  };

  public type Product = {
    id : Common.ProductId;
    var name : Text;
    var description : Text;
    var price_cents : Nat;
    category : ProductCategory;
    inventory_category : ?InventoryCategory; // set for NIMS-sourced items
    variety : ?Text;
    var active : Bool;
    var image_key : ?Text;       // legacy field — kept for backward compat
    var image_keys : [Text];     // canonical multi-image field (0–5 entries)
    var plant_id : ?Common.PlantId; // linked NIMS plant when applicable
  };

  public type ShippingAddress = {
    full_name : Text;
    street_line1 : Text;
    street_line2 : ?Text;
    city : Text;
    state : Text;
    zip : Text;
    phone : Text;
  };

  public type ProductPublic = {
    id : Common.ProductId;
    name : Text;
    description : Text;
    price_cents : Nat;
    category : ProductCategory;
    inventory_category : ?InventoryCategory;
    variety : ?Text;
    active : Bool;
    image_key : ?Text;
    image_keys : [Text];
    plant_id : ?Common.PlantId;
    nft_token_id : ?Nat;
    shippable : Bool;
    shipping_flat_rate_cents : ?Nat;
    weight_based : Bool;
    price_per_unit_cents : Nat;
    unit_label : ?Text;
  };

  public type CreateProductInput = {
    name : Text;
    description : Text;
    price_cents : Nat;
    category : ProductCategory;
    inventory_category : ?InventoryCategory;
    variety : ?Text;
    image_key : ?Text;
    image_keys : [Text];
    plant_id : ?Common.PlantId;
    shippable : Bool;
    shipping_flat_rate_cents : ?Nat;
    weight_based : Bool;
    price_per_unit_cents : ?Nat;
    unit_label : ?Text;
  };

  public type UpdateProductInput = {
    product_id : Common.ProductId;
    name : ?Text;
    description : ?Text;
    price_cents : ?Nat;
    active : ?Bool;
    image_key : ?Text;
    image_keys : ?[Text];    // when provided replaces the full image_keys array
  };

  // STABLE-MEMORY INVARIANT: do NOT add or remove variants — OrderStatus is
  // stored in a `var` field inside Order (invariant typing). Changing variants
  // requires an explicit migration function. Track payment confirmation via
  // icpaySessionsConsumed + audit log instead of a new #Paid variant.
  public type OrderStatus = {
    #Pending;
    #Shipped;
    #PickedUp;
    #Cancelled;
  };

  public type OrderItem = {
    product_id : Common.ProductId;
    plant_id : ?Common.PlantId;
    quantity : Nat;
    price_cents : Nat;
  };

  public type Order = {
    id : Common.OrderId;
    buyer : Principal;
    items : [OrderItem];
    total_cents : Nat;
    shipping_address : ?Text;
    pickup : Bool;
    var status : OrderStatus;
    created_at : Common.Timestamp;
  };

  public type OrderPublic = {
    id : Common.OrderId;
    buyer : Principal;
    items : [OrderItem];
    subtotal_cents : Nat;
    shipping_cents : Nat;
    total_cents : Nat;
    shipping_address : ?Text;
    shipping : ?ShippingAddress;
    pickup : Bool;
    status : OrderStatus;
    created_at : Common.Timestamp;
    line_nft_token_ids : [Nat];
  };

  public type CreateOrderInput = {
    items : [OrderItem];
    shipping : ?ShippingAddress;
    pickup : Bool;
  };

  public type BulkCreateResult = { #ok : ProductPublic; #err : Text };
};
