import Common "common";
import MarketTypes "marketplace";
import Principal "mo:core/Principal";

module {
  public type AdminOrderItemPublic = {
    product_id : Common.ProductId;
    product_name : Text;
    plant_id : ?Common.PlantId;
    quantity : Nat;
    price_cents : Nat;
  };

  public type AdminOrderPublic = {
    id : Common.OrderId;
    buyer : Principal;
    items : [AdminOrderItemPublic];
    subtotal_cents : Nat;
    shipping_cents : Nat;
    total_cents : Nat;
    shipping_address : ?Text;
    shipping : ?MarketTypes.ShippingAddress;
    pickup : Bool;
    status : MarketTypes.OrderStatus;
    created_at : Common.Timestamp;
    line_nft_token_ids : [Nat];
    pickup_claim_tokens : [Text];
    is_paid : Bool;
  };

  public type AdminOrderStatusFilter = {
    #All;
    #Pending;
    #Paid;
    #PickedUp;
    #Shipped;
    #Cancelled;
  };

  public type ClaimTokenAdminPublic = {
    token : Text;
    token_id : Nat;
    plant_id : ?Common.PlantId;
    redeemed : Bool;
  };

  public type Icrc7PoolStats = {
    total : Nat;
    in_canister_pool : Nat;
    assigned_to_plants : Nat;
    assigned_to_products : Nat;
    sold_to_customers : Nat;
    pepperhead_total : Nat;
    pepperhead_in_pool : Nat;
    pepperhead_sold : Nat;
    missing_owner : Nat;
  };

  public type Icrc7TokenFilter = {
    #All;
    #Available;
    #Assigned;
    #Sold;
    #PepperHead;
    #Missing;
  };

  public type Icrc7TokenAdminPublic = {
    token_id : Nat;
    owner : Text;
    is_canister_pool : Bool;
    is_pepperhead : Bool;
    plant_id : ?Common.PlantId;
    product_id : ?Common.ProductId;
    rarity_label : Text;
  };

  public type AdminAirdropResult = {
    recipient : Principal;
    token_id : Nat;
    success : Bool;
    message : Text;
  };
};
