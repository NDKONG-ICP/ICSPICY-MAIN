// mixins/admin-shop-api.mo — admin Orders, QR claim tokens, ICRC-7 pool browser.

import AccessControl "../lib/access-control";
import AdminOrdersLib "../lib/admin-orders";
import AdminClaimsLib "../lib/admin-claims";
import AdminIcrc7Lib "../lib/admin-icrc7";
import AuditLog "../lib/audit-log";
import MarketLib "../lib/marketplace";
import AdminTypes "../types/admin";
import MarketTypes "../types/marketplace";
import ClaimTypes "../types/claim";
import Common "../types/common";
import ICRC7 "../types/icrc7";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Text "mo:core/Text";
import Time "mo:core/Time";

mixin (
  accessControlState : AccessControl.AccessControlState,
  agentPrincipalState : AccessControl.AgentPrincipalState,
  products : Map.Map<Common.ProductId, MarketTypes.Product>,
  orders : Map.Map<Common.OrderId, MarketTypes.Order>,
  orderLineNftTokenIds : Map.Map<Common.OrderId, [Nat]>,
  orderPickupClaimTokens : Map.Map<Common.OrderId, [Text]>,
  orderShippingCents : Map.Map<Common.OrderId, Nat>,
  orderShippingAddresses : Map.Map<Common.OrderId, MarketTypes.ShippingAddress>,
  icpaySessionsConsumed : Map.Map<Text, Nat>,
  adminOrdersSeenUpTo : Map.Map<Principal, Nat>,
  nftClaimTokens : Map.Map<Text, ClaimTypes.NftClaimEntry>,
  nftClaimPlantIds : Map.Map<Text, Common.PlantId>,
  nftClaimArms : Map.Map<Text, ClaimTypes.ClaimArm>,
  plantClaimTokens : Map.Map<Common.PlantId, Text>,
  icrc7Owners : Map.Map<Nat, ICRC7.Account>,
  nftTokenPlantIds : Map.Map<Nat, Common.PlantId>,
  productNftTokenIds : Map.Map<Common.ProductId, Nat>,
  selfPrincipal : () -> Principal,
  auditLog : { var value : AuditLog.AuditLog },
) {
  public shared query ({ caller }) func listAllOrdersAdmin(
    filter : AdminTypes.AdminOrderStatusFilter,
  ) : async [AdminTypes.AdminOrderPublic] {
    AccessControl.requireAdminOrAgent(accessControlState, agentPrincipalState, caller);
    AdminOrdersLib.listOrders(
      orders, products, orderLineNftTokenIds, orderPickupClaimTokens,
      orderShippingCents, orderShippingAddresses, icpaySessionsConsumed, filter,
    )
  };

  public shared query ({ caller }) func getAdminOrder(
    order_id : Common.OrderId,
  ) : async ?AdminTypes.AdminOrderPublic {
    AccessControl.requireAdminOrAgent(accessControlState, agentPrincipalState, caller);
    switch (orders.get(order_id)) {
      case null null;
      case (?order) {
        ?AdminOrdersLib.toAdminOrder(
          order, products, orderLineNftTokenIds, orderPickupClaimTokens,
          orderShippingCents, orderShippingAddresses, icpaySessionsConsumed,
        )
      };
    };
  };

  public shared query ({ caller }) func getNewOrderCount() : async Nat {
    AccessControl.requireAdminOrAgent(accessControlState, agentPrincipalState, caller);
    let seen = switch (adminOrdersSeenUpTo.get(caller)) {
      case (?n) n;
      case null 0;
    };
    AdminOrdersLib.countOrdersSince(orders, seen);
  };

  public shared ({ caller }) func markOrdersSeen(upToOrderId : Common.OrderId) : async () {
    AccessControl.requireAdmin(accessControlState, caller);
    let current = switch (adminOrdersSeenUpTo.get(caller)) {
      case (?n) n;
      case null 0;
    };
    let next = if (upToOrderId > current) upToOrderId else current;
    adminOrdersSeenUpTo.add(caller, next);
  };

  func statusText(status : MarketTypes.OrderStatus) : Text {
    switch (status) {
      case (#Pending) "Pending";
      case (#Shipped) "Shipped";
      case (#PickedUp) "PickedUp";
      case (#Cancelled) "Cancelled";
    }
  };

  public shared ({ caller }) func updateOrderStatusAdmin(
    order_id : Common.OrderId,
    status : MarketTypes.OrderStatus,
  ) : async () {
    AccessControl.requireAdmin(accessControlState, caller);
    MarketLib.updateOrderStatus(orders, order_id, status);
    auditLog.value := AuditLog.append(auditLog.value, {
      ts = Time.now();
      admin = caller;
      action = "order_status_updated";
      detail = "order=" # Nat.toText(order_id) # " status=" # statusText(status);
    });
  };

  public shared query ({ caller }) func listClaimTokensAdmin(
    search : ?Text,
  ) : async [AdminTypes.ClaimTokenAdminPublic] {
    AccessControl.requireAdmin(accessControlState, caller);
    AdminClaimsLib.listClaimTokens(nftClaimTokens, nftClaimPlantIds, nftClaimArms, search)
  };

  public shared ({ caller }) func revokeClaimTokenAdmin(
    token : Text,
  ) : async Bool {
    AccessControl.requireAdmin(accessControlState, caller);
    let ok = AdminClaimsLib.revokeClaimToken(
      nftClaimTokens, nftClaimPlantIds, plantClaimTokens, token,
    );
    if (ok) {
      ignore nftClaimArms.delete(token);
      auditLog.value := AuditLog.append(auditLog.value, {
        ts = Time.now();
        admin = caller;
        action = "claim_token_revoked";
        detail = "token=" # token;
      });
    };
    ok
  };

  public shared query ({ caller }) func getIcrc7PoolStatsAdmin() : async AdminTypes.Icrc7PoolStats {
    AccessControl.requireAdmin(accessControlState, caller);
    AdminIcrc7Lib.computeStats(
      icrc7Owners, nftTokenPlantIds, productNftTokenIds, selfPrincipal(),
    )
  };

  public shared query ({ caller }) func listIcrc7PoolTokensAdmin(
    filter : AdminTypes.Icrc7TokenFilter,
    offset : Nat,
    limit : Nat,
  ) : async [AdminTypes.Icrc7TokenAdminPublic] {
    AccessControl.requireAdmin(accessControlState, caller);
    AdminIcrc7Lib.listTokens(
      icrc7Owners, nftTokenPlantIds, productNftTokenIds, selfPrincipal(),
      filter, offset, limit,
    )
  };
};
