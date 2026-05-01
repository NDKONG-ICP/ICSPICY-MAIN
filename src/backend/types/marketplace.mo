import Common "common";

module {
  // Original shop category variants kept for existing products.
  // InventoryCategory mirrors ContainerSize for NIMS transplant items
  // and stays consistent with types/plants.mo ContainerSize.
  public type ProductCategory = {
    #Seedling;
    #Gallon1;
    #Gallon5;
    #Spice;
    #GardenInputs;
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
  };

  public type CreateProductInput = {
    name : Text;
    description : Text;
    price_cents : Nat;
    category : ProductCategory;
    inventory_category : ?InventoryCategory;
    variety : ?Text;
    image_key : ?Text;       // legacy single-image; ignored when image_keys is non-empty
    image_keys : [Text];     // preferred multi-image (0–5)
    plant_id : ?Common.PlantId;
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
    total_cents : Nat;
    shipping_address : ?Text;
    pickup : Bool;
    status : OrderStatus;
    created_at : Common.Timestamp;
  };

  public type CreateOrderInput = {
    items : [OrderItem];
    shipping_address : ?Text;
    pickup : Bool;
  };

  public type BulkCreateResult = { #ok : ProductPublic; #err : Text };
};
