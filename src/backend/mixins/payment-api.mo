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
import JsonMini "../lib/json-mini";
import ICRC7Lib "../lib/icrc7";
import ICRC37Lib "../lib/icrc37";
import Common "../types/common";
import MarketTypes "../types/marketplace";
import ICRC7 "../types/icrc7";
import Result "mo:core/Result";
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

  // ── ICPay verification helper (shared by confirmICPayPayment + purchasePepperHead) ──
  //
  // Makes the HTTPS outcall, parses the JSON response, and validates the "id"
  // and "status" fields. Returns #ok(()) on a verified payment or #err(message)
  // on any failure. Does NOT touch icpaySessionsConsumed — callers are
  // responsible for idempotency guards on both sides of the await.

  func verifyICPayPayment(paymentId : Text) : async Result.Result<(), Text> {
    if (icpaySecretKey.value == "") return #err("ICPay not configured");
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
      return #err("ICPay API unreachable");
    };
    let entries : [(Text, ICRC7.Value)] = switch (JsonMini.parse(httpResult.body)) {
      case (#err(e)) return #err("ICPay response malformed: " # e);
      case (#ok(#Map(m))) m;
      case (#ok(_)) return #err("ICPay response malformed: expected JSON object");
    };
    let responseId = switch (getTextField(entries, "id")) {
      case null return #err("ICPay response missing 'id' field");
      case (?t) t;
    };
    if (responseId != paymentId) return #err("ICPay paymentId mismatch");
    let status = switch (getTextField(entries, "status")) {
      case null return #err("ICPay response missing 'status' field");
      case (?t) t;
    };
    if (status != "succeeded" and status != "completed") {
      return #err("ICPay payment status: " # status);
    };
    #ok(());
  };

  // ── ICPay payment confirmation ────────────────────────────────────────────

  /// Authenticated: confirm an ICPay payment and mark the order paid.
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
    // Pre-flight (no await)
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
    // Check idempotency before the outcall — paymentId already consumed?
    switch (icpaySessionsConsumed.get(paymentId)) {
      case (?_) return { success = false; message = "ICPay payment already confirmed" };
      case null {};
    };
    // Verify via ICPay (HTTPS outcall)
    switch (await verifyICPayPayment(paymentId)) {
      case (#err(e)) return { success = false; message = e };
      case (#ok) {};
    };
    // Post-await: double-check idempotency — a concurrent call may have settled
    // this paymentId during our await window.
    switch (icpaySessionsConsumed.get(paymentId)) {
      case (?_) return { success = false; message = "ICPay payment already used" };
      case null {};
    };
    // Mark consumed (status stays #Pending; confirmed via icpaySessionsConsumed + audit log).
    icpaySessionsConsumed.add(paymentId, orderId);
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
  // Phase 4: ICPay is the sole payment processor. The buyer initiates payment
  // via @ic-pay/icpay-sdk on the frontend, receives a paymentId on completion,
  // then calls this method to settle on-chain ownership.
  //
  // Fixed price: PH_PRICE_CENTS = 2500 ($25.00 USD). ICPay enforces the
  // charge amount on their end; this method verifies the payment succeeded
  // but does not re-validate the charge amount (ICPay is the source of truth
  // on what was collected).

  // PepperHead token 1-indexed range: 7839..8726 inclusive → pool IDs 7838..8725
  // PH_END is an exclusive upper sentinel; the last valid PepperHead is token 8726.
  // Loop: while (id < PH_END) visits 7839–8726. ✓
  // Range check: tokenId >= PH_END rejects 8727+. ✓
  // Matches isPepperHead in lib/icrc7.mo: poolId >= 7838 and poolId < 8726
  //   → tokenId = poolId+1 → 7839 ≤ tokenId ≤ 8726. ✓
  let PH_START       : Nat = 7839; // inclusive, 1-indexed token IDs
  let PH_END         : Nat = 8727; // exclusive upper sentinel — last valid PepperHead is token 8726
  let PH_PRICE_CENTS : Nat = 2500; // $25.00 USD; enforced by ICPay at charge time

  /// Authenticated: purchase a PepperHead NFT via ICPay.
  ///
  /// Flow:
  ///   1. CallerGuard acquired.
  ///   2. Pre-await: idempotency check.
  ///   3. await: verifyICPayPayment(paymentId) — HTTPS outcall.
  ///   4. Post-await: idempotency double-check (concurrent caller guard).
  ///   5. Find next available PepperHead (owned by canister, no subaccount).
  ///   6. Reserve: assignOwnership(open → subaccount[0x00]).
  ///   7. Consume paymentId atomically.
  ///   8. Transfer: assignOwnership(reserved → buyer).
  ///   9. On failure: compensate (reserved → open), un-consume; return error.
  ///  10. Clear approvals, audit log, return success.
  public shared ({ caller }) func purchasePepperHead(
    paymentId : Text,
  ) : async { success : Bool; tokenId : ?Nat; message : Text } {
    AccessControl.requireAuthenticated(caller);
    switch (CallerGuard.acquire(callerGuards, caller)) {
      case (#err(e)) { Runtime.trap("Request already in flight: " # e) };
      case (#ok) {};
    };
    try {
      let result = await doPurchasePepperHead(caller, paymentId);
      CallerGuard.release(callerGuards, caller);
      result;
    } catch (e) {
      CallerGuard.release(callerGuards, caller);
      { success = false; tokenId = null; message = "Unexpected error during PepperHead purchase" };
    };
  };

  func doPurchasePepperHead(
    caller    : Principal,
    paymentId : Text,
  ) : async { success : Bool; tokenId : ?Nat; message : Text } {
    // Idempotency pre-check
    switch (icpaySessionsConsumed.get(paymentId)) {
      case (?_) return { success = false; tokenId = null; message = "ICPay payment already used" };
      case null {};
    };
    // Verify payment via ICPay Protected API (HTTPS outcall)
    switch (await verifyICPayPayment(paymentId)) {
      case (#err(e)) return { success = false; tokenId = null; message = e };
      case (#ok) {};
    };
    // Post-await idempotency double-check: a concurrent call from a different
    // principal could have consumed this paymentId during our await window.
    switch (icpaySessionsConsumed.get(paymentId)) {
      case (?_) return { success = false; tokenId = null; message = "ICPay payment already used" };
      case null {};
    };
    // Find next available PepperHead owned by canister (open pool)
    let canister = selfPrincipal();
    var nextTokenId : ?Nat = null;
    var scanId = PH_START;
    label search while (scanId < PH_END) {
      switch (icrc7Owners.get(scanId)) {
        case (?(acc)) {
          if (Principal.equal(acc.owner, canister) and acc.subaccount == null) {
            nextTokenId := ?scanId;
            break search;
          };
        };
        case null {};
      };
      scanId += 1;
    };
    let tokenId = switch nextTokenId {
      case null return { success = false; tokenId = null; message = "No PepperHead NFTs available" };
      case (?t) t;
    };
    let canisterAccount : ICRC7.Account = { owner = canister; subaccount = null };
    let reservedAccount : ICRC7.Account = { owner = canister; subaccount = ?Blob.fromArray([0x00]) };
    let buyerAccount    : ICRC7.Account = { owner = caller;   subaccount = null };
    // Reserve: open pool → reservation subaccount [0x00]
    switch (ICRC7Lib.assignOwnership(icrc7Owners, icrc7Balances, tokenId, ?canisterAccount, reservedAccount)) {
      case (#err(e)) return { success = false; tokenId = null; message = "Reserve failed: " # e };
      case (#ok) {};
    };
    // Mark paymentId consumed atomically with the reservation — before the
    // synchronous transfer so any subsequent path sees it consumed.
    icpaySessionsConsumed.add(paymentId, tokenId);
    // Transfer: reserved → buyer
    switch (ICRC7Lib.assignOwnership(icrc7Owners, icrc7Balances, tokenId, ?reservedAccount, buyerAccount)) {
      case (#err(e)) {
        // Compensate: return to open pool and un-consume so the buyer can retry.
        ignore ICRC7Lib.assignOwnership(icrc7Owners, icrc7Balances, tokenId, ?reservedAccount, canisterAccount);
        ignore icpaySessionsConsumed.delete(paymentId);
        return { success = false; tokenId = null; message = "Transfer failed: " # e };
      };
      case (#ok) {};
    };
    ignore ICRC37Lib.removeAllApprovals(icrc37Approvals, tokenId);
    auditLog.value := AuditLog.append(auditLog.value, {
      ts     = Time.now();
      admin  = caller;
      action = "pepperhead_purchased";
      detail = "tokenId=" # Nat.toText(tokenId) #
               " buyer=" # Principal.toText(caller) #
               " ref=icpay:" # paymentId;
    });
    { success = true; tokenId = ?tokenId; message = "PepperHead #" # Nat.toText(tokenId) # " is yours" };
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
    if (order.status != #Pending) {
      return { success = false; message = "Order is not stuck — status is " # debug_show(order.status) };
    };
    order.status := #Pending;
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
