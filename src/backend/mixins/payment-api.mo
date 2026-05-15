// mixins/payment-api.mo
//
// Phase 4 payment settlement methods for IC SPICY.
//
// ICPay is the sole payment processor. It mediates crypto wallet transfers
// today and (via ICPay's Stripe Connect integration) card payments later.
// The backend never speaks to Stripe directly, and never pulls ICRC-2
// funds from buyer wallets — ICPay's canister does that.
//
// Methods:
//   - setICPaySecretKey(key)       — admin-only key provisioning
//   - confirmICPayPayment(...)     — HTTPS outcall verification + order paid
//   - purchasePepperHead(...)      — PepperHead NFT purchase (reworked in
//                                    Step 4a to flow payment through ICPay)
//
// Security invariant: no secret key is ever logged or returned to callers.
// All settlement methods are guarded by CallerGuard (no overlapping calls
// from the same principal) and require authentication.

import AccessControl "../lib/access-control";
import CallerGuard "../lib/caller-guard";
import ICRCPayment "../lib/icrc-payment";
import ICRC7Lib "../lib/icrc7";
import Common "../types/common";
import MarketTypes "../types/marketplace";
import ICRC7 "../types/icrc7";
import Map "mo:core/Map";
import Set "mo:core/Set";
import Blob "mo:core/Blob";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Text "mo:core/Text";
import Nat "mo:core/Nat";
import Time "mo:core/Time";
import IC "ic:aaaaa-aa";

mixin (
  accessControlState      : AccessControl.AccessControlState,
  callerGuards            : CallerGuard.GuardMap,
  orders                  : Map.Map<Common.OrderId, MarketTypes.Order>,
  icrc7Owners             : Map.Map<Nat, ICRC7.Account>,
  icrc7Balances           : Map.Map<Principal, Set.Set<Nat>>,
  selfPrincipal           : () -> Principal,
  icpaySecretKey          : { var value : Text },
  icpaySessionsConsumed   : Map.Map<Text, Nat>,
) {

  // ── Admin key provisioning ─────────────────────────────────────────────────

  /// Admin: set the ICPay verification key.
  public shared ({ caller }) func setICPaySecretKey(key : Text) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Admin only");
    };
    icpaySecretKey.value := key;
  };

  // ── Transform callback (required by IC HTTPS outcall consensus) ────────────

  /// Strips response headers so all replicas produce identical results.
  public query func icpayTransform({
    context  : Blob;
    response : IC.http_request_result;
  }) : async IC.http_request_result {
    ignore context;
    { response with headers = [] };
  };

  // ── ICPay payment confirmation ────────────────────────────────────────────

  /// Authenticated: confirm an ICPay payment and mark the order paid.
  ///
  /// ICPay returns a paymentId after the user completes payment via the
  /// @ic-pay/icpay-widget. This method verifies the payment server-side.
  public shared ({ caller }) func confirmICPayPayment(
    orderId   : Nat,
    paymentId : Text,
  ) : async { success : Bool; message : Text } {
    AccessControl.requireAuthenticated(caller);
    switch (CallerGuard.acquire(callerGuards, caller)) {
      case (#err(e)) { Runtime.trap("Request already in flight: " # e) };
      case (#ok) {};
    };
    try {
      let result = await doConfirmICPay(caller, orderId, paymentId);
      CallerGuard.release(callerGuards, caller);
      result;
    } catch (e) {
      CallerGuard.release(callerGuards, caller);
      { success = false; message = "Unexpected error during ICPay verification" };
    };
  };

  func doConfirmICPay(
    caller    : Principal,
    orderId   : Nat,
    paymentId : Text,
  ) : async { success : Bool; message : Text } {
    switch (icpaySessionsConsumed.get(paymentId)) {
      case (?_) {
        return { success = false; message = "ICPay payment already used" };
      };
      case null {};
    };
    let order = switch (orders.get(orderId)) {
      case null { return { success = false; message = "Order not found" } };
      case (?o) { o };
    };
    if (not Principal.equal(order.buyer, caller) and
        not AccessControl.isAdmin(accessControlState, caller)) {
      return { success = false; message = "Not your order" };
    };
    if (order.status == #Paid) {
      return { success = false; message = "Order already paid" };
    };
    if (icpaySecretKey.value == "") {
      return { success = false; message = "ICPay not configured" };
    };
    // HTTPS outcall to ICPay payment verification endpoint.
    // Step 2a will replace the substring match below with JsonMini.parse +
    // shape validation (status == "succeeded", id == paymentId, amount match).
    let url = "https://api.icpay.app/v1/payments/" # paymentId;
    let httpResult = try {
      await (with cycles = 231_000_000_000) IC.http_request({
        url;
        max_response_bytes = ?(8_192 : Nat64);
        headers = [
          { name = "Authorization"; value = "Bearer " # icpaySecretKey.value },
          { name = "Accept";        value = "application/json" },
        ];
        body    = null;
        method  = #get;
        transform = ?{ function = icpayTransform; context = Blob.fromArray([]) };
        is_replicated = null;
      });
    } catch (_) {
      return { success = false; message = "ICPay API unreachable" };
    };
    let body = switch (httpResult.body.decodeUtf8()) {
      case null { return { success = false; message = "ICPay response unreadable" } };
      case (?t) t;
    };
    if (not body.contains(#text "\"status\":\"succeeded\"")) {
      return { success = false; message = "ICPay payment not succeeded" };
    };
    order.status := #Paid;
    order.payment_ref := ?("icpay:" # paymentId);
    icpaySessionsConsumed.add(paymentId, orderId);
    { success = true; message = "ICPay payment confirmed" };
  };

  // ── PepperHead NFT purchase ───────────────────────────────────────────────
  //
  // Current implementation uses a direct ICRC-2 transfer-from. Step 4a
  // reworks this to verify an ICPay paymentId before transferring NFT
  // ownership, so all token flow is mediated by ICPay. Body retained
  // verbatim until then.

  /// Authenticated: purchase a PepperHead NFT via wallet (ICRC-2).
  ///
  /// PepperHead NFTs are token IDs 7839–8726 (1-indexed) in the IC SPICY
  /// collection (pool IDs 7838–8725). The first available token still owned
  /// by the canister is sold to the caller.
  ///
  /// Flow:
  ///   1. CallerGuard acquired.
  ///   2. Find and reserve next available PepperHead NFT (owned by canister).
  ///   3. await: icrc2_transfer_from(buyer → selfPrincipal, amount).
  ///   4. Success: assignOwnership(tokenId, buyer).
  ///   5. Failure: un-reserve (restore canister ownership).
  public shared ({ caller }) func purchasePepperHead(
    token  : ICRCPayment.PaymentToken,
    amount : Nat,
  ) : async { success : Bool; tokenId : ?Nat; message : Text } {
    AccessControl.requireAuthenticated(caller);
    switch (CallerGuard.acquire(callerGuards, caller)) {
      case (#err(e)) { Runtime.trap("Request already in flight: " # e) };
      case (#ok) {};
    };
    try {
      let result = await doPurchasePepperHead(caller, token, amount);
      CallerGuard.release(callerGuards, caller);
      result;
    } catch (e) {
      CallerGuard.release(callerGuards, caller);
      { success = false; tokenId = null; message = "Unexpected error during PepperHead purchase" };
    };
  };

  // PepperHead token 1-indexed range: 7839..8726 → pool index 7838..8725
  let PH_START : Nat = 7839; // inclusive, 1-indexed token IDs
  let PH_END   : Nat = 8726; // exclusive (last PepperHead is 8725)

  func doPurchasePepperHead(
    caller : Principal,
    token  : ICRCPayment.PaymentToken,
    amount : Nat,
  ) : async { success : Bool; tokenId : ?Nat; message : Text } {
    // Find next available PepperHead owned by canister
    let canister = selfPrincipal();
    var nextTokenId : ?Nat = null;
    var id = PH_START;
    label search while (id < PH_END) {
      switch (icrc7Owners.get(id)) {
        case (?(acc)) {
          if (Principal.equal(acc.owner, canister) and acc.subaccount == null) {
            nextTokenId := ?id;
            break search;
          };
        };
        case null {};
      };
      id += 1;
    };
    let tokenId = switch nextTokenId {
      case null { return { success = false; tokenId = null; message = "No PepperHead NFTs available" } };
      case (?t) t;
    };
    // Reserve: transfer ownership to a temporary "reserved" state by using
    // the canister principal with a non-null subaccount (marker = [0x00]).
    // This is a pure state mutation BEFORE the await.
    let canisterAccount : ICRC7.Account = { owner = canister; subaccount = null };
    let reservedAccount : ICRC7.Account = {
      owner      = canister;
      subaccount = ?Blob.fromArray([0x00]);
    };
    let buyerAccount : ICRC7.Account = { owner = caller; subaccount = null };
    // Reserve: move from canister (open) → canister (reserved subaccount)
    switch (ICRC7Lib.assignOwnership(icrc7Owners, icrc7Balances, tokenId, ?canisterAccount, reservedAccount)) {
      case (#err(e)) {
        return { success = false; tokenId = null; message = "Reserve failed: " # e };
      };
      case (#ok) {};
    };
    // Pull funds from buyer
    let transferResult = await ICRCPayment.transferFrom(
      token,
      caller,
      canister,
      amount,
      null,
      null,
    );
    switch transferResult {
      case (#ok(_blockIndex)) {
        // Finalize: reserved → buyer
        ignore ICRC7Lib.assignOwnership(icrc7Owners, icrc7Balances, tokenId, ?reservedAccount, buyerAccount);
        { success = true; tokenId = ?tokenId; message = "PepperHead #" # Nat.toText(tokenId) # " purchased" };
      };
      case (#err(msg)) {
        // Compensate: reserved → canister (open)
        ignore ICRC7Lib.assignOwnership(icrc7Owners, icrc7Balances, tokenId, ?reservedAccount, canisterAccount);
        { success = false; tokenId = null; message = "Payment failed: " # msg };
      };
    };
  };
};
