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
import AuditLog "../lib/audit-log";
import CallerGuard "../lib/caller-guard";
import ICRCPayment "../lib/icrc-payment";
import JsonMini "../lib/json-mini";
import ICRC7Lib "../lib/icrc7";
import ICRC37Lib "../lib/icrc37";
import Common "../types/common";
import MarketTypes "../types/marketplace";
import ICRC7 "../types/icrc7";
import ICRC37 "../types/icrc37";
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
  icrc37Approvals         : ICRC37Lib.ApprovalsMap,
  selfPrincipal           : () -> Principal,
  icpaySecretKey          : { var value : Text },
  icpaySessionsConsumed   : Map.Map<Text, Nat>,
  auditLog                : { var value : AuditLog.AuditLog },
) {

  // ── Admin key provisioning ─────────────────────────────────────────────────

  /// Admin: set the ICPay secret verification key.
  /// Never returns or logs the key — only its length is recorded in the audit log.
  public shared ({ caller }) func setICPaySecretKey(key : Text) : async () {
    AccessControl.requireAdmin(accessControlState, caller);
    if (Text.size(key) == 0) {
      Runtime.trap("Cannot set empty ICPay key — use a non-empty key or leave unset to disable payments");
    };
    icpaySecretKey.value := key;
    auditLog.value := AuditLog.append(auditLog.value, {
      ts     = Time.now();
      admin  = caller;
      action = "icpay_key_set";
      detail = "len=" # Nat.toText(Text.size(key));
    });
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

  // ── JSON field helpers ────────────────────────────────────────────────────

  /// Walks a parsed JSON object's entry list and returns the first #Text value
  /// whose key matches `key`. Returns null if the key is absent or the value
  /// is not a #Text variant.
  func getTextField(entries : [(Text, ICRC7.Value)], key : Text) : ?Text {
    for ((k, v) in entries.vals()) {
      if (k == key) {
        switch v {
          case (#Text t) return ?t;
          case _         return null;
        };
      };
    };
    null
  };

  // ── ICPay payment confirmation ────────────────────────────────────────────

  /// Authenticated: confirm an ICPay payment and mark the order paid.
  ///
  /// ICPay returns a paymentId after the user completes payment via the
  /// @ic-pay/icpay-widget. This method verifies the payment server-side
  /// via a signed HTTPS outcall to the ICPay Protected API.
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
    // ── Pre-flight checks (no await) ──────────────────────────────────────
    switch (icpaySessionsConsumed.get(paymentId)) {
      case (?_) return { success = false; message = "ICPay payment already used" };
      case null {};
    };
    let order = switch (orders.get(orderId)) {
      case null return { success = false; message = "Order not found" };
      case (?o) o;
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

    // ── HTTPS outcall to ICPay Protected API ──────────────────────────────
    let url = "https://api.icpay.org/v1/payments/" # paymentId;
    let httpResult = try {
      await (with cycles = 231_000_000_000) IC.http_request({
        url;
        max_response_bytes = ?(8_192 : Nat64);
        headers = [
          { name = "Authorization"; value = "Bearer " # icpaySecretKey.value },
          { name = "Accept";        value = "application/json" },
        ];
        body      = null;
        method    = #get;
        transform = ?{ function = icpayTransform; context = Blob.fromArray([]) };
        is_replicated = null;
      });
    } catch (_) {
      return { success = false; message = "ICPay API unreachable" };
    };

    // ── Parse JSON response body (Blob → ICRC7.Value) ─────────────────────
    // Pass the raw Blob directly — no Text conversion needed.
    let entries : [(Text, ICRC7.Value)] = switch (JsonMini.parse(httpResult.body)) {
      case (#err(e)) return { success = false; message = "ICPay response malformed: " # e };
      case (#ok(#Map(m))) m;
      case (#ok(_)) return { success = false; message = "ICPay response malformed: expected JSON object" };
    };

    // ── Validate "id" field (confused-deputy guard) ───────────────────────
    // Prevents a valid payment for a different order being replayed here.
    let responseId = switch (getTextField(entries, "id")) {
      case null return { success = false; message = "ICPay response missing 'id' field" };
      case (?t) t;
    };
    if (responseId != paymentId) {
      return { success = false; message = "ICPay paymentId mismatch" };
    };

    // ── Validate "status" field ───────────────────────────────────────────
    // ICPay docs use both "succeeded" and "completed" in different contexts.
    let status = switch (getTextField(entries, "status")) {
      case null return { success = false; message = "ICPay response missing 'status' field" };
      case (?t) t;
    };
    if (status != "succeeded" and status != "completed") {
      return { success = false; message = "ICPay payment status: " # status };
    };

    // ── Settle: mark order paid ───────────────────────────────────────────
    order.status      := #Paid;
    order.payment_ref := ?("icpay:" # paymentId);
    icpaySessionsConsumed.add(paymentId, orderId);

    // ── Audit log ─────────────────────────────────────────────────────────
    auditLog.value := AuditLog.append(auditLog.value, {
      ts     = Time.now();
      admin  = caller;
      action = "payment_confirmed";
      detail = "order=" # Nat.toText(orderId) # " ref=icpay:" # paymentId;
    });

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

  // PepperHead token 1-indexed range: 7839..8726 inclusive → pool IDs 7838..8725
  // PH_END is an exclusive upper sentinel; the last valid PepperHead is token 8726.
  // Loop: while (id < PH_END) visits 7839, 7840, …, 8726. ✓
  // Range check: tokenId >= PH_END rejects 8727+. ✓
  // Matches isPepperHead in lib/icrc7.mo: poolId >= 7838 and poolId < 8726
  //   → tokenId = poolId+1 → 7839 ≤ tokenId ≤ 8726. ✓
  let PH_START : Nat = 7839; // inclusive, 1-indexed token IDs
  let PH_END   : Nat = 8727; // exclusive upper sentinel — last valid PepperHead is token 8726

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

  // ── Admin recovery methods ────────────────────────────────────────────────

  /// Admin: reset a stuck order back to #Pending.
  ///
  /// An order can become stuck in #AwaitingPayment if the frontend redirected
  /// to ICPay but the user closed the tab before payment completed and
  /// confirmICPayPayment was never called. This method clears the status so
  /// the order can be retried or cancelled.
  public shared ({ caller }) func adminUnstickOrder(
    orderId : Nat,
  ) : async { success : Bool; message : Text } {
    AccessControl.requireAdmin(accessControlState, caller);
    switch (CallerGuard.acquire(callerGuards, caller)) {
      case (#err(e)) { Runtime.trap("Request already in flight: " # e) };
      case (#ok) {};
    };
    try {
      let result = doUnstickOrder(caller, orderId);
      CallerGuard.release(callerGuards, caller);
      result;
    } catch (e) {
      CallerGuard.release(callerGuards, caller);
      { success = false; message = "Unexpected error during order unstick" };
    };
  };

  func doUnstickOrder(
    caller  : Principal,
    orderId : Nat,
  ) : { success : Bool; message : Text } {
    let order = switch (orders.get(orderId)) {
      case null return { success = false; message = "Order not found" };
      case (?o) o;
    };
    if (order.status != #AwaitingPayment) {
      return { success = false; message = "Order is not stuck — status is " # debug_show(order.status) };
    };
    order.status      := #Pending;
    order.payment_ref := null;
    auditLog.value := AuditLog.append(auditLog.value, {
      ts     = Time.now();
      admin  = caller;
      action = "unstick_order";
      detail = "orderId=" # Nat.toText(orderId);
    });
    { success = true; message = "Order reset to Pending" };
  };

  /// Admin: return a reserved PepperHead NFT to the open pool.
  ///
  /// A PepperHead can become stuck in the reservation subaccount (owner =
  /// canister, subaccount = [0x00]) if purchasePepperHead began but the
  /// async path failed after reservation and compensation also failed (e.g.
  /// replica panic). This method clears the reservation so the token is
  /// available for purchase again.
  public shared ({ caller }) func adminUnstickPepperHead(
    tokenId : Nat,
  ) : async { success : Bool; message : Text } {
    AccessControl.requireAdmin(accessControlState, caller);
    switch (CallerGuard.acquire(callerGuards, caller)) {
      case (#err(e)) { Runtime.trap("Request already in flight: " # e) };
      case (#ok) {};
    };
    try {
      let result = doUnstickPepperHead(caller, tokenId);
      CallerGuard.release(callerGuards, caller);
      result;
    } catch (e) {
      CallerGuard.release(callerGuards, caller);
      { success = false; message = "Unexpected error during PepperHead unstick" };
    };
  };

  func doUnstickPepperHead(
    caller  : Principal,
    tokenId : Nat,
  ) : { success : Bool; message : Text } {
    if (tokenId < PH_START or tokenId >= PH_END) {
      return { success = false; message = "Not a PepperHead token" };
    };
    let canister = selfPrincipal();
    let reservedAccount : ICRC7.Account = {
      owner      = canister;
      subaccount = ?Blob.fromArray([0x00]);
    };
    let openAccount : ICRC7.Account = { owner = canister; subaccount = null };
    // Verify the token is currently in the reservation subaccount.
    switch (icrc7Owners.get(tokenId)) {
      case null return { success = false; message = "Token not found in owner map" };
      case (?current) {
        if (not (Principal.equal(current.owner, canister) and current.subaccount == ?Blob.fromArray([0x00]))) {
          return { success = false; message = "Token is not in reserved state" };
        };
      };
    };
    // Return to open pool: reserved subaccount → canister (no subaccount).
    switch (ICRC7Lib.assignOwnership(icrc7Owners, icrc7Balances, tokenId, ?reservedAccount, openAccount)) {
      case (#err(e)) return { success = false; message = "assignOwnership failed: " # e };
      case (#ok) {};
    };
    // Clear any lingering approvals on this token.
    ignore ICRC37Lib.removeAllApprovals(icrc37Approvals, tokenId);
    auditLog.value := AuditLog.append(auditLog.value, {
      ts     = Time.now();
      admin  = caller;
      action = "unstick_pepperhead";
      detail = "tokenId=" # Nat.toText(tokenId);
    });
    { success = true; message = "PepperHead returned to pool" };
  };
};
