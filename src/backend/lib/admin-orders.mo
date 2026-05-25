import Array "mo:core/Array";
import Iter "mo:core/Iter";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import AdminTypes "../types/admin";
import MarketTypes "../types/marketplace";
import Common "../types/common";

module {
  func orderIsPaid(
    orderId : Common.OrderId,
    lineNfts : [Nat],
    icpaySessionsConsumed : Map.Map<Text, Nat>,
  ) : Bool {
    if (lineNfts.size() > 0) return true;
    for ((_, oid) in icpaySessionsConsumed.entries()) {
      if (oid == orderId) return true;
    };
    false
  };

  func matchesAdminFilter(
    status : MarketTypes.OrderStatus,
    isPaid : Bool,
    filter : AdminTypes.AdminOrderStatusFilter,
  ) : Bool {
    switch (filter) {
      case (#All) true;
      case (#Pending) status == #Pending and not isPaid;
      case (#Paid) status == #Pending and isPaid;
      case (#PickedUp) status == #PickedUp;
      case (#Shipped) status == #Shipped;
      case (#Cancelled) status == #Cancelled;
    }
  };

  public func toAdminOrder(
    order : MarketTypes.Order,
    products : Map.Map<Common.ProductId, MarketTypes.Product>,
    orderLineNftTokenIds : Map.Map<Common.OrderId, [Nat]>,
    orderPickupClaimTokens : Map.Map<Common.OrderId, [Text]>,
    orderShippingCents : Map.Map<Common.OrderId, Nat>,
    orderShippingAddresses : Map.Map<Common.OrderId, MarketTypes.ShippingAddress>,
    icpaySessionsConsumed : Map.Map<Text, Nat>,
  ) : AdminTypes.AdminOrderPublic {
    let lineNfts = switch (orderLineNftTokenIds.get(order.id)) {
      case (?ids) ids;
      case null [];
    };
    let pickupTokens = switch (orderPickupClaimTokens.get(order.id)) {
      case (?t) t;
      case null [];
    };
    let shipping = orderShippingCents.get(order.id);
    let items = Array.map<MarketTypes.OrderItem, AdminTypes.AdminOrderItemPublic>(
      order.items,
      func(item : MarketTypes.OrderItem) : AdminTypes.AdminOrderItemPublic {
        let name = switch (products.get(item.product_id)) {
          case (?p) p.name;
          case null "Product #" # Nat.toText(item.product_id);
        };
        {
          product_id = item.product_id;
          product_name = name;
          plant_id = item.plant_id;
          quantity = item.quantity;
          price_cents = item.price_cents;
        };
      },
    );
    var subtotal : Nat = 0;
    for (item in order.items.vals()) {
      subtotal += item.price_cents * item.quantity;
    };
    {
      id = order.id;
      buyer = order.buyer;
      items;
      subtotal_cents = subtotal;
      shipping_cents = switch shipping { case (?s) s; case null 0 };
      total_cents = order.total_cents;
      shipping_address = order.shipping_address;
      shipping = orderShippingAddresses.get(order.id);
      pickup = order.pickup;
      status = order.status;
      created_at = order.created_at;
      line_nft_token_ids = lineNfts;
      pickup_claim_tokens = pickupTokens;
      is_paid = orderIsPaid(order.id, lineNfts, icpaySessionsConsumed);
    }
  };

  public func listOrders(
    orders : Map.Map<Common.OrderId, MarketTypes.Order>,
    products : Map.Map<Common.ProductId, MarketTypes.Product>,
    orderLineNftTokenIds : Map.Map<Common.OrderId, [Nat]>,
    orderPickupClaimTokens : Map.Map<Common.OrderId, [Text]>,
    orderShippingCents : Map.Map<Common.OrderId, Nat>,
    orderShippingAddresses : Map.Map<Common.OrderId, MarketTypes.ShippingAddress>,
    icpaySessionsConsumed : Map.Map<Text, Nat>,
    filter : AdminTypes.AdminOrderStatusFilter,
  ) : [AdminTypes.AdminOrderPublic] {
    let raw = Iter.toArray(
      Iter.map(
        orders.entries(),
        func((_, order) : (Common.OrderId, MarketTypes.Order)) : AdminTypes.AdminOrderPublic {
          toAdminOrder(
            order, products, orderLineNftTokenIds, orderPickupClaimTokens,
            orderShippingCents, orderShippingAddresses, icpaySessionsConsumed,
          )
        },
      ),
    );
    let filtered = Array.filter<AdminTypes.AdminOrderPublic>(
      raw,
      func(o : AdminTypes.AdminOrderPublic) : Bool {
        matchesAdminFilter(o.status, o.is_paid, filter)
      },
    );
    Array.sort(filtered, func(a : AdminTypes.AdminOrderPublic, b : AdminTypes.AdminOrderPublic) : { #less; #equal; #greater } {
      if (a.created_at > b.created_at) #less
      else if (a.created_at < b.created_at) #greater
      else #equal
    })
  };

  public func countOrdersSince(
    orders : Map.Map<Common.OrderId, MarketTypes.Order>,
    sinceOrderId : Nat,
  ) : Nat {
    var count : Nat = 0;
    for ((id, _) in orders.entries()) {
      if (id > sinceOrderId) {
        count += 1;
      };
    };
    count;
  };

  public func maxOrderId(
    orders : Map.Map<Common.OrderId, MarketTypes.Order>,
  ) : Nat {
    var maxId : Nat = 0;
    for ((id, _) in orders.entries()) {
      if (id > maxId) {
        maxId := id;
      };
    };
    maxId;
  };
};
