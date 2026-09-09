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
import ProductShipping "../lib/product-shipping";
import ProductNft "../lib/product-nft";
import NimsLib "../lib/nims";
import PlantTypes "../types/plants";
import ClaimTypes "../types/claim";
import ICRC7 "../types/icrc7";
import IcrcPayment "../lib/icrc-payment";
import PriceOracleLib "../lib/price-oracle";
import PriceOracleTypes "../types/price-oracle";
import Result "mo:core/Result";
import Map "mo:core/Map";
import List "mo:core/List";
import Set "mo:core/Set";
import Blob "mo:core/Blob";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Text "mo:core/Text";
import Nat "mo:core/Nat";
import Nat32 "mo:core/Nat32";
import Nat64 "mo:core/Nat64";
import Nat8 "mo:core/Nat8";
import Array "mo:core/Array";
import Int "mo:core/Int";
import Char "mo:core/Char";
import Time "mo:core/Time";
import Error "mo:core/Error";
import IC "ic:aaaaa-aa";
import RateLimits "../lib/rate-limits";
import RateLimit "../lib/rate-limit";
import PayPalPayment "../lib/paypal-payment";
import CoopLib "../lib/coop";
import CoopTypes "../types/coop";

mixin (
  accessControlState      : AccessControl.AccessControlState,
  callerGuards            : CallerGuard.GuardMap,
  rateLimits              : RateLimits.Bundle,
  orders                  : Map.Map<Common.OrderId, MarketTypes.Order>,
  products                : Map.Map<Common.ProductId, MarketTypes.Product>,
  productNftTokenIds      : Map.Map<Common.ProductId, Nat>,
  productInventoryRemaining : Map.Map<Common.ProductId, Nat>,
  productShippingConfigs  : Map.Map<Common.ProductId, ProductShipping.ProductShippingConfig>,
  orderLineNftTokenIds    : Map.Map<Common.OrderId, [Nat]>,
  orderPickupClaimTokens  : Map.Map<Common.OrderId, [Text]>,
  nftClaimTokens          : Map.Map<Text, ClaimTypes.NftClaimEntry>,
  nftClaimPlantIds        : Map.Map<Text, Common.PlantId>,
  nftClaimArms            : Map.Map<Text, ClaimTypes.ClaimArm>,
  plantClaimTokens        : Map.Map<Common.PlantId, Text>,
  nftTokenPlantIds        : Map.Map<Nat, Common.PlantId>,
  icrc7Owners             : Map.Map<Nat, ICRC7.Account>,
  icrc7Balances           : Map.Map<Principal, Set.Set<Nat>>,
  icrc37Approvals         : ICRC37Lib.ApprovalsMap,
  selfPrincipal           : () -> Principal,
  icpaySecretKey          : { var value : Text },
  icpaySessionsConsumed   : Map.Map<Text, Nat>,
  paypalClientId          : { var value : Text },
  paypalClientSecret      : { var value : Text },
  paypalSandbox           : { var value : Bool },
  paypalOrdersConsumed    : Map.Map<Text, Nat>,
  auditLog                : { var value : AuditLog.AuditLog },
  // Phase 6 plant purchase settlement state
  plants                  : Map.Map<Common.PlantId, PlantTypes.Plant>,
  feedings                : Map.Map<Common.FeedingId, PlantTypes.Feeding>,
  plantVarietyIds         : Map.Map<Common.PlantId, Nat>,
  plantOwners             : Map.Map<Common.PlantId, Principal>,
  plantPrices             : Map.Map<Common.PlantId, Nat>,
  plantSoldAt             : Map.Map<Common.PlantId, Common.Timestamp>,
  plantTransplantedOneGal : Map.Map<Common.PlantId, Common.Timestamp>,
  plantTransplantedFiveGal : Map.Map<Common.PlantId, Common.Timestamp>,
  plantNotesLog           : Map.Map<Common.PlantId, List.List<PlantTypes.PlantNote>>,
  plantWateringLog        : Map.Map<Common.PlantId, List.List<PlantTypes.WateringEntry>>,
  plantPestLog            : Map.Map<Common.PlantId, List.List<PlantTypes.PestEntry>>,
  plantPhotoLog           : Map.Map<Common.PlantId, List.List<PlantTypes.PlantPhotoEntry>>,
  plantWeatherSnapshots   : Map.Map<Common.PlantId, List.List<PlantTypes.WeatherSnapshot>>,
  plantDeathRecords       : Map.Map<Common.PlantId, PlantTypes.PlantDeathRecord>,
  priceOracleState        : PriceOracleTypes.PriceOracleState,
  coopSeats               : Map.Map<Nat, CoopTypes.CoopSeat>,
  coopDesignatedSeats     : Map.Map<Nat, Bool>,
  coopPendingSeats        : Map.Map<Nat, Principal>,
  coopSeatPriceCents      : { var value : Nat },
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

  // ── JSON escape + ICPay response normalization (HTTPS transform consensus) ─
  //
  // ICPay varies JSON ordering and timestamps → different hashes unless the
  // transform emits a deterministic body with fixed field order.

  func concatAll(parts : [Text]) : Text {
    Array.foldLeft<Text, Text>(
      parts,
      "",
      func(acc : Text, p : Text) : Text { acc # p },
    );
  };

  func escapeJsonSegment(t : Text) : Text {
    Text.foldLeft(
      t,
      "",
      func(acc : Text, ch : Char) : Text {
        if (ch == '\\') acc # "\\\\"
        else if (Char.toNat32(ch) == (34 : Nat32)) acc # "\\\""
        else acc # Char.toText(ch);
      },
    );
  };

  /// Pull id / status / amount from a flattened object map. Amount may be nested
  /// or string-vs-number-shaped per json-mini conventions.
  func absorbIcPayFieldMap(entries : [(Text, ICRC7.Value)], out : {
    var id : Text;
    var status : Text;
    var amount : Text;
  }) {
    for ((k, v) in entries.vals()) {
      if (k == "id") {
        switch v {
          case (#Text(txt)) out.id := txt;
          case (_) {};
        };
      } else if (k == "status") {
        switch v {
          case (#Text(txt)) out.status := txt;
          case (_) {};
        };
      } else if (k == "amount") {
        switch v {
          case (#Text(txt)) out.amount := txt;
          case (#Nat(n)) out.amount := Nat.toText(n);
          case (#Int(i)) out.amount := Int.toText(i);
          case (_) {};
        };
      };
    };
  };

  /// Strips varying headers AND reduces body to deterministic JSON subset:
  ///   { "id", "status", "amount" } fixed key order — identical on all replicas.
  public query func icpayTransform({
    context  : Blob;
    response : IC.http_request_result;
  }) : async IC.http_request_result {
    ignore context;
    // Fallback body when JsonMini rejects the HTTPS payload — fixed bytes ⇒ consensus.
    let PARSE_FAILED : Blob =
      Blob.fromArray(
        [
          (0x7b : Nat8),
          (0x22 : Nat8),
          (0x65 : Nat8),
          (0x72 : Nat8),
          (0x72 : Nat8),
          (0x6f : Nat8),
          (0x72 : Nat8),
          (0x22 : Nat8),
          (0x3a : Nat8),
          (0x22 : Nat8),
          (0x70 : Nat8),
          (0x61 : Nat8),
          (0x72 : Nat8),
          (0x73 : Nat8),
          (0x65 : Nat8),
          (0x5f : Nat8),
          (0x66 : Nat8),
          (0x61 : Nat8),
          (0x69 : Nat8),
          (0x6c : Nat8),
          (0x65 : Nat8),
          (0x64 : Nat8),
          (0x22 : Nat8),
          (0x7d : Nat8),
        ],
      );

    let out : {
      var id : Text;
      var status : Text;
      var amount : Text;
    } = { var id = ""; var status = ""; var amount = "" };
    switch (JsonMini.parse(response.body)) {
      case (#err(_)) {
        return {
          response with
          headers = [];
          body = PARSE_FAILED;
        };
      };
      case (#ok(#Map(outerEntries))) {
        absorbIcPayFieldMap(outerEntries, out);
        for ((k, v) in outerEntries.vals()) {
          if (k == "payment") {
            switch v {
              case (#Map(innerEntries)) absorbIcPayFieldMap(innerEntries, out);
              case (_) {};
            };
          };
        };
      };
      case (_) {
        return {
          response with
          headers = [];
          body = PARSE_FAILED;
        };
      };
    };
    let deterministicBody = concatAll([
      Char.toText('{'),
      "\"",
      "id",
      "\"",
      ":",
      "\"",
      escapeJsonSegment(out.id),
      "\"",
      ",",
      "\"",
      "status",
      "\"",
      ":",
      "\"",
      escapeJsonSegment(out.status),
      "\"",
      ",",
      "\"",
      "amount",
      "\"",
      ":",
      "\"",
      escapeJsonSegment(out.amount),
      "\"",
      Char.toText('}'),
    ]);

    {
      response with
      headers = [];
      body = deterministicBody.encodeUtf8();
    };
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
    // Protected API — matches @ic-pay/icpay-sdk getPaymentById: GET /sdk/payments/:id
    let url = "https://api.icpay.org/sdk/payments/" # paymentId;
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
    } catch (e) {
      return #err("ICPay http_request failed: " # Error.message(e));
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
    if (not RateLimit.check(rateLimits.icpay, caller)) {
      return { success = false; message = "Rate limited. Try again in a minute." };
    };
    switch (CallerGuard.acquire(callerGuards, caller)) {
      case (#err(e)) { Runtime.trap("Request already in flight: " # e) };
      case (#ok(_)) {};
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
      case (#ok(_)) {};
    };
    // Post-await: double-check idempotency — a concurrent call may have settled
    // this paymentId during our await window.
    switch (icpaySessionsConsumed.get(paymentId)) {
      case (?_) return { success = false; message = "ICPay payment already used" };
      case null {};
    };
    // Mark consumed (status stays #Pending; confirmed via icpaySessionsConsumed + audit log).
    icpaySessionsConsumed.add(paymentId, orderId);
    let canister = selfPrincipal();
    switch (
      ProductNft.settleOrderLineItems(
        orderId, order, products, productNftTokenIds, productInventoryRemaining, productShippingConfigs, plants, nimsSideMaps(),
        icrc7Owners, icrc7Balances, icrc37Approvals,
        nftClaimTokens, nftClaimPlantIds, plantClaimTokens, nftTokenPlantIds,
        order.buyer, canister,
      )
    ) {
      case (#err(e)) {
        ignore icpaySessionsConsumed.delete(paymentId);
        return { success = false; message = e };
      };
      case (#ok(settlements)) {
        var tokenIds : [Nat] = [];
        var claimTokens : [Text] = [];
        for (s in settlements.vals()) {
          tokenIds := Array.concat(tokenIds, [s.tokenId]);
          switch (s.pickup_claim_token) {
            case (?t) claimTokens := Array.concat(claimTokens, [t]);
            case null {};
          };
        };
        orderLineNftTokenIds.add(orderId, tokenIds);
        if (claimTokens.size() > 0) {
          orderPickupClaimTokens.add(orderId, claimTokens);
          // Auto-arm paid-order pickup tokens — payment proves entitlement,
          // no staff arming needed and no expiry.
          for (t in claimTokens.vals()) {
            nftClaimArms.add(t, { armedAt = Time.now(); expiresAt = null });
          };
        };
      };
    };
    auditLog.value := AuditLog.append(auditLog.value, {
      ts     = Time.now();
      admin  = caller;
      action = "payment_confirmed";
      detail = "order=" # Nat.toText(orderId) # " ref=icpay:" # paymentId;
    });
    { success = true; message = "ICPay payment confirmed" };
  };

  // ── Direct ICRC-2 stablecoin order payment ────────────────────────────────

  public type ConfirmOrderPaymentDirectResult = {
    success : Bool;
    message : Text;
    claim_tokens : [Text];
    nft_token_ids : [Nat];
  };

  public shared ({ caller }) func confirmOrderPaymentDirect(
    orderId : Nat,
    ledgerCanisterId : Text,
    amount : Nat,
  ) : async ConfirmOrderPaymentDirectResult {
    AccessControl.requireAuthenticated(caller);
    switch (CallerGuard.acquire(callerGuards, caller)) {
      case (#err(e)) { Runtime.trap("Request already in flight: " # e) };
      case (#ok(_)) {};
    };
    try {
      let result = await doConfirmOrderPaymentDirect(
        caller, orderId, ledgerCanisterId, amount,
      );
      CallerGuard.release(callerGuards, caller);
      result;
    } catch (e) {
      CallerGuard.release(callerGuards, caller);
      { success = false; message = "Unexpected error during payment"; claim_tokens = []; nft_token_ids = [] };
    };
  };

  func tokenFromLedgerId(id : Text) : ?IcrcPayment.PaymentToken {
    if (id == IcrcPayment.ledgerCanisterId(#ICP)) { ?#ICP }
    else if (id == IcrcPayment.ledgerCanisterId(#ckBTC)) { ?#ckBTC }
    else if (id == IcrcPayment.ledgerCanisterId(#ckETH)) { ?#ckETH }
    else if (id == IcrcPayment.ledgerCanisterId(#ckUSDC)) { ?#ckUSDC }
    else if (id == IcrcPayment.ledgerCanisterId(#ckUSDT)) { ?#ckUSDT }
    else null;
  };

  // Returns null for tokens without oracle price support (e.g. RAVEN — client validates price via ICPSwap).
  func oracleTokenFromPayment(token : IcrcPayment.PaymentToken) : ?PriceOracleTypes.OracleToken {
    switch (token) {
      case (#ICP) ?#ICP;
      case (#ckBTC) ?#ckBTC;
      case (#ckETH) ?#ckETH;
      case (#ckUSDC) ?#ckUSDC;
      case (#ckUSDT) ?#ckUSDT;
      case (#RAVEN) null;
    };
  };

  func doConfirmOrderPaymentDirect(
    caller : Principal,
    orderId : Nat,
    ledgerCanisterId : Text,
    amount : Nat,
  ) : async ConfirmOrderPaymentDirectResult {
    switch (orderLineNftTokenIds.get(orderId)) {
      case (?_) {
        return { success = false; message = "Order already paid"; claim_tokens = []; nft_token_ids = [] };
      };
      case null {};
    };
    let order = switch (orders.get(orderId)) {
      case null return { success = false; message = "Order not found"; claim_tokens = []; nft_token_ids = [] };
      case (?o) o;
    };
    if (not Principal.equal(order.buyer, caller)) {
      return { success = false; message = "Not your order"; claim_tokens = []; nft_token_ids = [] };
    };
    let token = switch (tokenFromLedgerId(ledgerCanisterId)) {
      case null {
        return {
          success = false;
          message = "Unsupported ledger";
          claim_tokens = [];
          nft_token_ids = [];
        };
      };
      case (?t) t;
    };
    switch (oracleTokenFromPayment(token)) {
      case (?oracleToken) {
        if (
          not PriceOracleLib.isPaymentAmountSufficient(
            priceOracleState, oracleToken, order.total_cents, amount,
          )
        ) {
          let expected = PriceOracleLib.usdCentsToTokenBase(
            priceOracleState, oracleToken, order.total_cents,
          );
          let msg = if (IcrcPayment.isStableLedgerId(ledgerCanisterId)) {
            "Payment amount mismatch: expected exactly " # Nat.toText(expected);
          } else {
            "Payment amount insufficient: expected at least " #
            Nat.toText((expected * 95) / 100);
          };
          return {
            success = false;
            message = msg;
            claim_tokens = [];
            nft_token_ids = [];
          };
        };
      };
      case null {}; // RAVEN: no oracle price tracked — client validated amount via ICPSwap + 2% buffer
    };
    let canister = selfPrincipal();
    switch (
      await IcrcPayment.transferFrom(
        token,
        caller,
        canister,
        amount,
        ?Nat64.fromNat(Int.abs(Time.now())),
        ?("order:" # Nat.toText(orderId)).encodeUtf8(),
      )
    ) {
      case (#err(e)) return { success = false; message = e; claim_tokens = []; nft_token_ids = [] };
      case (#ok(_block)) {};
    };
    var settledTokenIds : [Nat] = [];
    switch (
      ProductNft.settleOrderLineItems(
        orderId, order, products, productNftTokenIds, productInventoryRemaining, productShippingConfigs, plants, nimsSideMaps(),
        icrc7Owners, icrc7Balances, icrc37Approvals,
        nftClaimTokens, nftClaimPlantIds, plantClaimTokens, nftTokenPlantIds,
        order.buyer, canister,
      )
    ) {
      case (#err(e)) {
        return { success = false; message = e; claim_tokens = []; nft_token_ids = [] };
      };
      case (#ok(settlements)) {
        var claimTokens : [Text] = [];
        for (s in settlements.vals()) {
          settledTokenIds := Array.concat(settledTokenIds, [s.tokenId]);
          switch (s.pickup_claim_token) {
            case (?t) claimTokens := Array.concat(claimTokens, [t]);
            case null {};
          };
        };
        orderLineNftTokenIds.add(orderId, settledTokenIds);
        if (claimTokens.size() > 0) {
          orderPickupClaimTokens.add(orderId, claimTokens);
          // Auto-arm paid-order pickup tokens — payment proves entitlement,
          // no staff arming needed and no expiry.
          for (t in claimTokens.vals()) {
            nftClaimArms.add(t, { armedAt = Time.now(); expiresAt = null });
          };
        };
      };
    };
    auditLog.value := AuditLog.append(auditLog.value, {
      ts     = Time.now();
      admin  = caller;
      action = "order_payment_direct";
      detail = "order=" # Nat.toText(orderId) # " ledger=" # ledgerCanisterId;
    });
    let stored = switch (orderPickupClaimTokens.get(orderId)) {
      case (?t) t;
      case null [];
    };
    { success = true; message = "Payment confirmed"; claim_tokens = stored; nft_token_ids = settledTokenIds };
  };

  // ── Canister treasury (on-ledger balances + admin withdrawal) ─────────────

  public type CanisterTreasuryBalance = {
    ledgerCanisterId : Text;
    symbol : Text;
    balance : Nat;
  };

  public type AdminWithdrawTokensResult = {
    success : Bool;
    blockIndex : ?Nat;
    message : Text;
  };

  /// Admin: query icrc1_balance_of on each supported ledger for this canister.
  public shared ({ caller }) func getCanisterTreasuryBalances() : async [CanisterTreasuryBalance] {
    AccessControl.requireAdmin(accessControlState, caller);
    let owner = selfPrincipal();
    var out : [CanisterTreasuryBalance] = [];
    for (token in IcrcPayment.allPaymentTokens().vals()) {
      let ledgerId = IcrcPayment.ledgerCanisterId(token);
      let balance = await IcrcPayment.balanceOf(ledgerId, owner);
      out := Array.concat(out, [{
        ledgerCanisterId = ledgerId;
        symbol = IcrcPayment.tokenSymbol(token);
        balance;
      }]);
    };
    out;
  };

  /// Admin: icrc1_transfer from canister treasury to an external principal.
  public shared ({ caller }) func adminWithdrawTokens(
    ledgerCanisterId : Text,
    to : Principal,
    amount : Nat,
  ) : async AdminWithdrawTokensResult {
    AccessControl.requireAdmin(accessControlState, caller);
    if (not RateLimit.check(rateLimits.withdrawal, caller)) {
      return {
        success = false;
        blockIndex = null;
        message = "Withdrawal rate limited. Max 3 per hour.";
      };
    };
    switch (CallerGuard.acquire(callerGuards, caller)) {
      case (#err(e)) { Runtime.trap("Request already in flight: " # e) };
      case (#ok(_)) {};
    };
    try {
      let result = await doAdminWithdrawTokens(caller, ledgerCanisterId, to, amount);
      CallerGuard.release(callerGuards, caller);
      result;
    } catch (e) {
      CallerGuard.release(callerGuards, caller);
      { success = false; blockIndex = null; message = "Withdrawal failed" };
    };
  };

  func doAdminWithdrawTokens(
    caller : Principal,
    ledgerCanisterId : Text,
    to : Principal,
    amount : Nat,
  ) : async AdminWithdrawTokensResult {
    if (not IcrcPayment.isAllowedLedgerId(ledgerCanisterId)) {
      return {
        success = false;
        blockIndex = null;
        message = "Unsupported ledger — must be ICP, ckBTC, ckETH, ckUSDC, ckUSDT, or RAVEN";
      };
    };
    if (amount == 0) {
      return { success = false; blockIndex = null; message = "Amount must be greater than zero" };
    };
    let canister = selfPrincipal();
    let balance = await IcrcPayment.balanceOf(ledgerCanisterId, canister);
    let fee = await IcrcPayment.icrc1Fee(ledgerCanisterId);
    if (amount + fee > balance) {
      return {
        success = false;
        blockIndex = null;
        message = "Insufficient balance: have " # Nat.toText(balance) #
          ", need " # Nat.toText(amount + fee) # " (amount + fee)";
      };
    };
    switch (
      await IcrcPayment.transferOut(
        ledgerCanisterId,
        to,
        amount,
        ?Nat64.fromNat(Int.abs(Time.now())),
        ?"treasury_withdraw".encodeUtf8(),
      )
    ) {
      case (#err(e)) return { success = false; blockIndex = null; message = e };
      case (#ok(blockIndex)) {
        auditLog.value := AuditLog.append(auditLog.value, {
          ts     = Time.now();
          admin  = caller;
          action = "treasury_withdrawal";
          detail = "ledger=" # ledgerCanisterId #
            " to=" # Principal.toText(to) #
            " amount=" # Nat.toText(amount) #
            " block=" # Nat.toText(blockIndex);
        });
        {
          success = true;
          blockIndex = ?blockIndex;
          message = "Withdrawal confirmed";
        };
      };
    };
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
  let PH_PRICE_CENTS : Nat = 2500; // $25.00 USD

  func transferNextPepperHeadToBuyer(
    caller : Principal,
    auditRef : Text,
  ) : { success : Bool; tokenId : ?Nat; message : Text } {
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
    let buyerAccount : ICRC7.Account = { owner = caller; subaccount = null };
    switch (ICRC7Lib.assignOwnership(icrc7Owners, icrc7Balances, tokenId, ?canisterAccount, reservedAccount)) {
      case (#err(e)) return { success = false; tokenId = null; message = "Reserve failed: " # e };
      case (#ok(_)) {};
    };
    switch (ICRC7Lib.assignOwnership(icrc7Owners, icrc7Balances, tokenId, ?reservedAccount, buyerAccount)) {
      case (#err(e)) {
        ignore ICRC7Lib.assignOwnership(icrc7Owners, icrc7Balances, tokenId, ?reservedAccount, canisterAccount);
        return { success = false; tokenId = null; message = "Transfer failed: " # e };
      };
      case (#ok(_)) {};
    };
    ignore ICRC37Lib.removeAllApprovals(icrc37Approvals, tokenId);
    auditLog.value := AuditLog.append(auditLog.value, {
      ts     = Time.now();
      admin  = caller;
      action = "pepperhead_purchased";
      detail = "tokenId=" # Nat.toText(tokenId) #
               " buyer=" # Principal.toText(caller) #
               " ref=" # auditRef;
    });
    { success = true; tokenId = ?tokenId; message = "PepperHead #" # Nat.toText(tokenId) # " is yours" };
  };

  /// Authenticated: purchase a PepperHead NFT via ICPay.
  ///
  /// Flow:
  ///   1. CallerGuard acquired.
  ///   2. Pre-await: idempotency check.
  ///   3. await: verifyICPayPayment(paymentId) — HTTPS outcall.
  ///   4. Post-await: idempotency double-check (concurrent caller guard).
  ///   5. Mint next available PepperHead to buyer.
  public shared ({ caller }) func purchasePepperHead(
    paymentId : Text,
  ) : async { success : Bool; tokenId : ?Nat; message : Text } {
    AccessControl.requireAuthenticated(caller);
    if (not RateLimit.check(rateLimits.icpay, caller)) {
      return { success = false; tokenId = null; message = "Rate limited. Try again in a minute." };
    };
    switch (CallerGuard.acquire(callerGuards, caller)) {
      case (#err(e)) { Runtime.trap("Request already in flight: " # e) };
      case (#ok(_)) {};
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

  /// Authenticated: purchase PepperHead via ICRC-2 direct transfer (Internet Identity).
  public shared ({ caller }) func purchasePepperHeadDirect(
    ledgerCanisterId : Text,
    amount : Nat,
  ) : async { success : Bool; tokenId : ?Nat; message : Text } {
    AccessControl.requireAuthenticated(caller);
    if (not RateLimit.check(rateLimits.payment, caller)) {
      return { success = false; tokenId = null; message = "Rate limited. Try again in a minute." };
    };
    switch (CallerGuard.acquire(callerGuards, caller)) {
      case (#err(e)) { Runtime.trap("Request already in flight: " # e) };
      case (#ok(_)) {};
    };
    try {
      let result = await doPurchasePepperHeadDirect(caller, ledgerCanisterId, amount);
      CallerGuard.release(callerGuards, caller);
      result;
    } catch (e) {
      CallerGuard.release(callerGuards, caller);
      { success = false; tokenId = null; message = "Unexpected error during PepperHead purchase" };
    };
  };

  func doPurchasePepperHeadDirect(
    caller : Principal,
    ledgerCanisterId : Text,
    amount : Nat,
  ) : async { success : Bool; tokenId : ?Nat; message : Text } {
    let token = switch (tokenFromLedgerId(ledgerCanisterId)) {
      case null return { success = false; tokenId = null; message = "Unsupported ledger" };
      case (?t) t;
    };
    switch (oracleTokenFromPayment(token)) {
      case (?oracleToken) {
        if (
          not PriceOracleLib.isPaymentAmountSufficient(
            priceOracleState, oracleToken, PH_PRICE_CENTS, amount,
          )
        ) {
          let expected = PriceOracleLib.usdCentsToTokenBase(
            priceOracleState, oracleToken, PH_PRICE_CENTS,
          );
          let msg = if (IcrcPayment.isStableLedgerId(ledgerCanisterId)) {
            "Payment amount mismatch: expected exactly " # Nat.toText(expected);
          } else {
            "Payment amount insufficient: expected at least " #
            Nat.toText((expected * 95) / 100);
          };
          return {
            success = false;
            tokenId = null;
            message = msg;
          };
        };
      };
      case null {}; // RAVEN: no oracle price tracked — client validated amount via ICPSwap + 2% buffer
    };
    let canister = selfPrincipal();
    switch (
      await IcrcPayment.transferFrom(
        token,
        caller,
        canister,
        amount,
        ?Nat64.fromNat(Int.abs(Time.now())),
        ?("pepperhead").encodeUtf8(),
      )
    ) {
      case (#err(e)) return { success = false; tokenId = null; message = e };
      case (#ok(_block)) {};
    };
    transferNextPepperHeadToBuyer(caller, "icrc2:" # ledgerCanisterId);
  };

  func doPurchasePepperHead(
    caller    : Principal,
    paymentId : Text,
  ) : async { success : Bool; tokenId : ?Nat; message : Text } {
    switch (icpaySessionsConsumed.get(paymentId)) {
      case (?_) return { success = false; tokenId = null; message = "ICPay payment already used" };
      case null {};
    };
    switch (await verifyICPayPayment(paymentId)) {
      case (#err(e)) return { success = false; tokenId = null; message = e };
      case (#ok(_)) {};
    };
    switch (icpaySessionsConsumed.get(paymentId)) {
      case (?_) return { success = false; tokenId = null; message = "ICPay payment already used" };
      case null {};
    };
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
    switch (ICRC7Lib.assignOwnership(icrc7Owners, icrc7Balances, tokenId, ?canisterAccount, reservedAccount)) {
      case (#err(e)) return { success = false; tokenId = null; message = "Reserve failed: " # e };
      case (#ok(_)) {};
    };
    icpaySessionsConsumed.add(paymentId, tokenId);
    switch (ICRC7Lib.assignOwnership(icrc7Owners, icrc7Balances, tokenId, ?reservedAccount, buyerAccount)) {
      case (#err(e)) {
        ignore ICRC7Lib.assignOwnership(icrc7Owners, icrc7Balances, tokenId, ?reservedAccount, canisterAccount);
        ignore icpaySessionsConsumed.delete(paymentId);
        return { success = false; tokenId = null; message = "Transfer failed: " # e };
      };
      case (#ok(_)) {};
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
      case (#ok(_)) {};
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
      case (#ok(_)) {};
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
      case (#ok(_)) {};
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

  func nimsSideMaps() : NimsLib.SideMaps {
    {
      plantVarietyIds;
      plantOwners;
      plantPrices;
      plantSoldAt;
      plantTransplantedOneGal;
      plantTransplantedFiveGal;
      plantNotesLog;
      plantWateringLog;
      plantPestLog;
      plantPhotoLog;
      plantWeatherSnapshots;
      plantDeathRecords;
    };
  };

  /// Authenticated: purchase a plant listing via ICPay.
  public shared ({ caller }) func purchasePlantICPay(
    plantId : Common.PlantId,
    paymentId : Text,
  ) : async PlantTypes.PurchasePlantResult {
    AccessControl.requireAuthenticated(caller);
    if (not RateLimit.check(rateLimits.icpay, caller)) {
      return {
        success = false;
        nftTokenId = null;
        claimToken = null;
        message = "Rate limited. Try again in a minute.";
      };
    };
    switch (CallerGuard.acquire(callerGuards, caller)) {
      case (#err(e)) { Runtime.trap("Request already in flight: " # e) };
      case (#ok(_)) {};
    };
    try {
      let result = await doPurchasePlantICPay(caller, plantId, paymentId);
      CallerGuard.release(callerGuards, caller);
      result;
    } catch (e) {
      CallerGuard.release(callerGuards, caller);
      { success = false; nftTokenId = null; claimToken = null; message = "Purchase failed" };
    };
  };

  func doPurchasePlantICPay(
    caller : Principal,
    plantId : Common.PlantId,
    paymentId : Text,
  ) : async PlantTypes.PurchasePlantResult {
    switch (icpaySessionsConsumed.get(paymentId)) {
      case (?_) return { success = false; nftTokenId = null; claimToken = null; message = "Payment already used" };
      case null {};
    };
    switch (await verifyICPayPayment(paymentId)) {
      case (#err(e)) return { success = false; nftTokenId = null; claimToken = null; message = e };
      case (#ok(_)) {};
    };
    switch (icpaySessionsConsumed.get(paymentId)) {
      case (?_) return { success = false; nftTokenId = null; claimToken = null; message = "Payment already used" };
      case null {};
    };
    let canister = selfPrincipal();
    switch (NimsLib.settlePlantPurchase(
      plants, nimsSideMaps(), icrc7Owners, icrc7Balances, icrc37Approvals,
      nftClaimTokens, plantClaimTokens, canister, caller, plantId,
    )) {
      case (#err(e)) return { success = false; nftTokenId = null; claimToken = null; message = e };
      case (#ok(settled)) {
        icpaySessionsConsumed.add(paymentId, plantId);
        auditLog.value := AuditLog.append(auditLog.value, {
          ts = Time.now();
          admin = caller;
          action = "plant_purchased_icpay";
          detail = "plantId=" # Nat.toText(plantId) # " ref=" # paymentId;
        });
        {
          success = true;
          nftTokenId = ?settled.nftTokenId;
          claimToken = ?settled.claimToken;
          message = "Plant purchased via ICPay";
        };
      };
    };
  };

  // ── PayPal admin + HTTPS transform ────────────────────────────────────────

  public shared ({ caller }) func setPayPalCredentials(
    clientId : Text,
    clientSecret : Text,
    sandbox : Bool,
  ) : async () {
    AccessControl.requireAdmin(accessControlState, caller);
    if (Text.size(clientId) == 0 or Text.size(clientSecret) == 0) {
      Runtime.trap("PayPal clientId and clientSecret must be non-empty");
    };
    paypalClientId.value := clientId;
    paypalClientSecret.value := clientSecret;
    paypalSandbox.value := sandbox;
    auditLog.value := AuditLog.append(auditLog.value, {
      ts = Time.now();
      admin = caller;
      action = "paypal_credentials_set";
      detail = "clientIdLen=" # Nat.toText(Text.size(clientId)) #
        " secretLen=" # Nat.toText(Text.size(clientSecret)) #
        " sandbox=" # (if sandbox "true" else "false");
    });
  };

  public query func paypalTransform({
    context : Blob;
    response : IC.http_request_result;
  }) : async IC.http_request_result {
    ignore context;
    let PARSE_FAILED : Blob =
      "{\"error\":\"parse_failed\"}".encodeUtf8();
    let out : {
      var id : Text;
      var status : Text;
      var customId : Text;
      var amount : Text;
    } = { var id = ""; var status = ""; var customId = ""; var amount = "" };
    switch (JsonMini.parse(response.body)) {
      case (#err(_)) {
        return { response with headers = []; body = PARSE_FAILED };
      };
      case (#ok(#Map(entries))) {
        PayPalPayment.absorbOrderFields(entries, out);
      };
      case (_) {
        return { response with headers = []; body = PARSE_FAILED };
      };
    };
    let deterministicBody = concatAll([
      Char.toText('{'),
      "\"id\":\"", escapeJsonSegment(out.id), "\",",
      "\"status\":\"", escapeJsonSegment(out.status), "\",",
      "\"custom_id\":\"", escapeJsonSegment(out.customId), "\",",
      "\"amount\":\"", escapeJsonSegment(out.amount), "\"",
      Char.toText('}'),
    ]);
    { response with headers = []; body = deterministicBody.encodeUtf8() };
  };

  public query func paypalOAuthTransform({
    context : Blob;
    response : IC.http_request_result;
  }) : async IC.http_request_result {
    ignore context;
    let PARSE_FAILED : Blob =
      "{\"access_token\":\"\"}".encodeUtf8();
    var token = "";
    switch (JsonMini.parse(response.body)) {
      case (#ok(#Map(entries))) {
        switch (getTextField(entries, "access_token")) {
          case (?t) token := t;
          case null {};
        };
      };
      case (_) {
        return { response with headers = []; body = PARSE_FAILED };
      };
    };
    let bodyBlob = (
      "{\"access_token\":\"" # escapeJsonSegment(token) # "\"}"
    ).encodeUtf8();
    { response with headers = []; body = bodyBlob };
  };

  func paypalConfigured() : Bool {
    paypalClientId.value.size() > 0 and paypalClientSecret.value.size() > 0;
  };

  public type PayPalCheckoutConfig = {
    enabled : Bool;
    clientId : Text;
    sandbox : Bool;
  };

  /// Public client ID for PayPal JS SDK — secret never exposed.
  public query func getPayPalCheckoutConfig() : async PayPalCheckoutConfig {
    {
      enabled = paypalConfigured();
      clientId = if (paypalConfigured()) paypalClientId.value else "";
      sandbox = paypalSandbox.value;
    };
  };

  func paypalConfig() : PayPalPayment.PayPalConfig {
    {
      clientId = paypalClientId.value;
      clientSecret = paypalClientSecret.value;
      sandbox = paypalSandbox.value;
    };
  };

  func paypalHttpGet(url : Text, token : Text) : async Result.Result<IC.http_request_result, Text> {
    try {
      #ok(await (with cycles = 231_000_000_000) IC.http_request({
        url;
        max_response_bytes = ?(16_384 : Nat64);
        headers = [
          { name = "Authorization"; value = "Bearer " # token },
          { name = "Accept"; value = "application/json" },
        ];
        body = null;
        method = #get;
        transform = ?{ function = paypalTransform; context = Blob.fromArray([]) };
        is_replicated = null;
      }));
    } catch (e) {
      #err("PayPal http GET failed: " # Error.message(e));
    };
  };

  func paypalHttpPost(
    url : Text,
    token : Text,
    bodyText : Text,
  ) : async Result.Result<IC.http_request_result, Text> {
    try {
      #ok(await (with cycles = 231_000_000_000) IC.http_request({
        url;
        max_response_bytes = ?(16_384 : Nat64);
        headers = [
          { name = "Authorization"; value = "Bearer " # token },
          { name = "Accept"; value = "application/json" },
          { name = "Content-Type"; value = "application/json" },
        ];
        body = ?bodyText.encodeUtf8();
        method = #post;
        transform = ?{ function = paypalTransform; context = Blob.fromArray([]) };
        is_replicated = null;
      }));
    } catch (e) {
      #err("PayPal http POST failed: " # Error.message(e));
    };
  };

  func fetchPayPalAccessToken() : async Result.Result<Text, Text> {
    if (not paypalConfigured()) return #err("PayPal not configured");
    let cfg = paypalConfig();
    let url = PayPalPayment.oauthTokenUrl(cfg.sandbox);
    try {
      let httpResult = await (with cycles = 231_000_000_000) IC.http_request({
        url;
        max_response_bytes = ?(4_096 : Nat64);
        headers = [
          {
            name = "Authorization";
            value = PayPalPayment.basicAuthHeader(cfg.clientId, cfg.clientSecret);
          },
          { name = "Accept"; value = "application/json" },
          { name = "Content-Type"; value = "application/x-www-form-urlencoded" },
        ];
        body = ?"grant_type=client_credentials".encodeUtf8();
        method = #post;
        transform = ?{ function = paypalOAuthTransform; context = Blob.fromArray([]) };
        is_replicated = null;
      });
      PayPalPayment.parseAccessToken(httpResult.body);
    } catch (e) {
      #err("PayPal OAuth failed: " # Error.message(e));
    };
  };

  func orderStatusFromBody(body : Blob) : ?Text {
    switch (JsonMini.parse(body)) {
      case (#ok(#Map(entries))) getTextField(entries, "status");
      case (_) null;
    };
  };

  func verifyPayPalOrder(
    paypalOrderId : Text,
    expectedCents : Nat,
    expectedCustomId : ?Text,
  ) : async Result.Result<PayPalPayment.VerifiedOrder, Text> {
    if (not paypalConfigured()) return #err("PayPal not configured");
    let cfg = paypalConfig();
    let token = switch (await fetchPayPalAccessToken()) {
      case (#err(e)) return #err(e);
      case (#ok(t)) t;
    };
    let getUrl = PayPalPayment.orderUrl(cfg.sandbox, paypalOrderId);
    let getResult = switch (await paypalHttpGet(getUrl, token)) {
      case (#err(e)) return #err(e);
      case (#ok(r)) r;
    };
    if (getResult.status != 200 and getResult.status != 201) {
      return #err("PayPal order lookup failed: HTTP " # Nat.toText(getResult.status));
    };
    var body = getResult.body;
    switch (orderStatusFromBody(body)) {
      case null return #err("PayPal order missing status");
      case (?status) {
        if (status == "APPROVED") {
          let captureUrl = PayPalPayment.captureUrl(cfg.sandbox, paypalOrderId);
          let capResult = switch (await paypalHttpPost(captureUrl, token, "{}")) {
            case (#err(e)) return #err(e);
            case (#ok(r)) r;
          };
          if (capResult.status != 200 and capResult.status != 201) {
            return #err("PayPal capture failed: HTTP " # Nat.toText(capResult.status));
          };
          body := capResult.body;
        };
      };
    };
    let verified = switch (PayPalPayment.parseOrderVerification(body)) {
      case (#err(e)) return #err(e);
      case (#ok(v)) v;
    };
    if (verified.paypalOrderId != paypalOrderId) {
      return #err("PayPal order id mismatch");
    };
    switch (expectedCustomId) {
      case null {
        if (verified.amountCents != expectedCents) {
          return #err("PayPal amount mismatch");
        };
      };
      case (?customId) {
        switch (PayPalPayment.verifyExpected(verified, expectedCents, customId)) {
          case (#err(e)) return #err(e);
          case (#ok(_)) {};
        };
      };
    };
    #ok(verified);
  };

  func reserveCoopSeatForBuyer(buyer : Principal) : ?Nat {
    switch (
      CoopLib.pickNextAvailableSeat(
        coopDesignatedSeats, coopSeats, coopPendingSeats, icrc7Owners, selfPrincipal(),
      )
    ) {
      case null null;
      case (?tokenId) {
        coopPendingSeats.add(tokenId, buyer);
        ?tokenId;
      };
    };
  };

  func activateCoopSeat(tokenId : Nat) {
    coopSeats.add(tokenId, {
      activatedAt = Time.now();
      growerName = null;
      growerLocation = null;
      licenseInfo = null;
      revoked = false;
    });
    ignore coopDesignatedSeats.delete(tokenId);
  };

  func transferCoopSeatToBuyer(
    tokenId : Nat,
    buyer : Principal,
    auditRef : Text,
  ) : CoopTypes.PurchaseCoopSeatResult {
    let canister = selfPrincipal();
    let canisterAccount : ICRC7.Account = { owner = canister; subaccount = null };
    let reservedAccount : ICRC7.Account = { owner = canister; subaccount = ?Blob.fromArray([0x00]) };
    let buyerAccount : ICRC7.Account = { owner = buyer; subaccount = null };
    switch (ICRC7Lib.assignOwnership(icrc7Owners, icrc7Balances, tokenId, ?canisterAccount, reservedAccount)) {
      case (#err(e)) {
        ignore coopPendingSeats.delete(tokenId);
        return { success = false; tokenId = null; message = "Reserve failed: " # e };
      };
      case (#ok(_)) {};
    };
    switch (ICRC7Lib.assignOwnership(icrc7Owners, icrc7Balances, tokenId, ?reservedAccount, buyerAccount)) {
      case (#err(e)) {
        ignore ICRC7Lib.assignOwnership(icrc7Owners, icrc7Balances, tokenId, ?reservedAccount, canisterAccount);
        ignore coopPendingSeats.delete(tokenId);
        return { success = false; tokenId = null; message = "Transfer failed: " # e };
      };
      case (#ok(_)) {};
    };
    ignore ICRC37Lib.removeAllApprovals(icrc37Approvals, tokenId);
    ignore coopPendingSeats.delete(tokenId);
    activateCoopSeat(tokenId);
    auditLog.value := AuditLog.append(auditLog.value, {
      ts = Time.now();
      admin = buyer;
      action = "coop_seat_purchased";
      detail = "tokenId=" # Nat.toText(tokenId) #
        " buyer=" # Principal.toText(buyer) #
        " ref=" # auditRef;
    });
    { success = true; tokenId = ?tokenId; message = "Founding Grower seat #" # Nat.toText(tokenId) # " activated" };
  };

  // ── PayPal cart order confirmation ────────────────────────────────────────

  public shared ({ caller }) func confirmPayPalOrderPayment(
    orderId : Nat,
    paypalOrderId : Text,
  ) : async { success : Bool; message : Text } {
    AccessControl.requireAuthenticated(caller);
    if (not RateLimit.check(rateLimits.paypal, caller)) {
      return { success = false; message = "Rate limited. Try again in a minute." };
    };
    switch (CallerGuard.acquire(callerGuards, caller)) {
      case (#err(e)) { Runtime.trap("Request already in flight: " # e) };
      case (#ok(_)) {};
    };
    try {
      let result = await doConfirmPayPalOrder(caller, orderId, paypalOrderId);
      CallerGuard.release(callerGuards, caller);
      result;
    } catch (_) {
      CallerGuard.release(callerGuards, caller);
      { success = false; message = "Unexpected error during PayPal verification" };
    };
  };

  func doConfirmPayPalOrder(
    caller : Principal,
    orderId : Nat,
    paypalOrderId : Text,
  ) : async { success : Bool; message : Text } {
    switch (paypalOrdersConsumed.get(paypalOrderId)) {
      case (?_) return { success = false; message = "PayPal order already used" };
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
    let expectedCustomId = PayPalPayment.customIdOrder(orderId);
    switch (await verifyPayPalOrder(paypalOrderId, order.total_cents, ?expectedCustomId)) {
      case (#err(e)) return { success = false; message = e };
      case (#ok(_)) {};
    };
    switch (paypalOrdersConsumed.get(paypalOrderId)) {
      case (?_) return { success = false; message = "PayPal order already used" };
      case null {};
    };
    paypalOrdersConsumed.add(paypalOrderId, orderId);
    let canister = selfPrincipal();
    switch (
      ProductNft.settleOrderLineItems(
        orderId, order, products, productNftTokenIds, productInventoryRemaining, productShippingConfigs, plants, nimsSideMaps(),
        icrc7Owners, icrc7Balances, icrc37Approvals,
        nftClaimTokens, nftClaimPlantIds, plantClaimTokens, nftTokenPlantIds,
        order.buyer, canister,
      )
    ) {
      case (#err(e)) {
        ignore paypalOrdersConsumed.delete(paypalOrderId);
        return { success = false; message = e };
      };
      case (#ok(settlements)) {
        var tokenIds : [Nat] = [];
        var claimTokens : [Text] = [];
        for (s in settlements.vals()) {
          tokenIds := Array.concat(tokenIds, [s.tokenId]);
          switch (s.pickup_claim_token) {
            case (?t) claimTokens := Array.concat(claimTokens, [t]);
            case null {};
          };
        };
        orderLineNftTokenIds.add(orderId, tokenIds);
        if (claimTokens.size() > 0) {
          orderPickupClaimTokens.add(orderId, claimTokens);
          // Auto-arm paid-order pickup tokens — payment proves entitlement,
          // no staff arming needed and no expiry.
          for (t in claimTokens.vals()) {
            nftClaimArms.add(t, { armedAt = Time.now(); expiresAt = null });
          };
        };
      };
    };
    auditLog.value := AuditLog.append(auditLog.value, {
      ts = Time.now();
      admin = caller;
      action = "payment_confirmed";
      detail = "order=" # Nat.toText(orderId) # " ref=paypal:" # paypalOrderId;
    });
    { success = true; message = "PayPal payment confirmed" };
  };

  // ── PayPal plant purchase ─────────────────────────────────────────────────

  public shared ({ caller }) func purchasePlantPayPal(
    plantId : Common.PlantId,
    paypalOrderId : Text,
  ) : async PlantTypes.PurchasePlantResult {
    AccessControl.requireAuthenticated(caller);
    if (not RateLimit.check(rateLimits.paypal, caller)) {
      return {
        success = false;
        nftTokenId = null;
        claimToken = null;
        message = "Rate limited. Try again in a minute.";
      };
    };
    switch (CallerGuard.acquire(callerGuards, caller)) {
      case (#err(e)) { Runtime.trap("Request already in flight: " # e) };
      case (#ok(_)) {};
    };
    try {
      let result = await doPurchasePlantPayPal(caller, plantId, paypalOrderId);
      CallerGuard.release(callerGuards, caller);
      result;
    } catch (_) {
      CallerGuard.release(callerGuards, caller);
      { success = false; nftTokenId = null; claimToken = null; message = "Purchase failed" };
    };
  };

  func doPurchasePlantPayPal(
    caller : Principal,
    plantId : Common.PlantId,
    paypalOrderId : Text,
  ) : async PlantTypes.PurchasePlantResult {
    switch (paypalOrdersConsumed.get(paypalOrderId)) {
      case (?_) return { success = false; nftTokenId = null; claimToken = null; message = "PayPal order already used" };
      case null {};
    };
    let priceCents = switch (plantPrices.get(plantId)) {
      case null return { success = false; nftTokenId = null; claimToken = null; message = "Plant price not set" };
      case (?p) p;
    };
    let expectedCustomId = PayPalPayment.customIdPlant(plantId);
    switch (await verifyPayPalOrder(paypalOrderId, priceCents, ?expectedCustomId)) {
      case (#err(e)) return { success = false; nftTokenId = null; claimToken = null; message = e };
      case (#ok(_)) {};
    };
    switch (paypalOrdersConsumed.get(paypalOrderId)) {
      case (?_) return { success = false; nftTokenId = null; claimToken = null; message = "PayPal order already used" };
      case null {};
    };
    let canister = selfPrincipal();
    switch (NimsLib.settlePlantPurchase(
      plants, nimsSideMaps(), icrc7Owners, icrc7Balances, icrc37Approvals,
      nftClaimTokens, plantClaimTokens, canister, caller, plantId,
    )) {
      case (#err(e)) return { success = false; nftTokenId = null; claimToken = null; message = e };
      case (#ok(settled)) {
        paypalOrdersConsumed.add(paypalOrderId, plantId);
        auditLog.value := AuditLog.append(auditLog.value, {
          ts = Time.now();
          admin = caller;
          action = "plant_purchased_paypal";
          detail = "plantId=" # Nat.toText(plantId) # " ref=paypal:" # paypalOrderId;
        });
        {
          success = true;
          nftTokenId = ?settled.nftTokenId;
          claimToken = ?settled.claimToken;
          message = "Plant purchased via PayPal";
        };
      };
    };
  };

  // ── PayPal PepperHead purchase ────────────────────────────────────────────

  public shared ({ caller }) func purchasePepperHeadPayPal(
    paypalOrderId : Text,
  ) : async { success : Bool; tokenId : ?Nat; message : Text } {
    AccessControl.requireAuthenticated(caller);
    if (not RateLimit.check(rateLimits.paypal, caller)) {
      return { success = false; tokenId = null; message = "Rate limited. Try again in a minute." };
    };
    switch (CallerGuard.acquire(callerGuards, caller)) {
      case (#err(e)) { Runtime.trap("Request already in flight: " # e) };
      case (#ok(_)) {};
    };
    try {
      let result = await doPurchasePepperHeadPayPal(caller, paypalOrderId);
      CallerGuard.release(callerGuards, caller);
      result;
    } catch (_) {
      CallerGuard.release(callerGuards, caller);
      { success = false; tokenId = null; message = "Unexpected error during PepperHead purchase" };
    };
  };

  func doPurchasePepperHeadPayPal(
    caller : Principal,
    paypalOrderId : Text,
  ) : async { success : Bool; tokenId : ?Nat; message : Text } {
    switch (paypalOrdersConsumed.get(paypalOrderId)) {
      case (?_) return { success = false; tokenId = null; message = "PayPal order already used" };
      case null {};
    };
    switch (await verifyPayPalOrder(paypalOrderId, PH_PRICE_CENTS, ?PayPalPayment.CUSTOM_ID_PEPPERHEAD)) {
      case (#err(e)) return { success = false; tokenId = null; message = e };
      case (#ok(_)) {};
    };
    switch (paypalOrdersConsumed.get(paypalOrderId)) {
      case (?_) return { success = false; tokenId = null; message = "PayPal order already used" };
      case null {};
    };
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
    let buyerAccount : ICRC7.Account = { owner = caller; subaccount = null };
    switch (ICRC7Lib.assignOwnership(icrc7Owners, icrc7Balances, tokenId, ?canisterAccount, reservedAccount)) {
      case (#err(e)) return { success = false; tokenId = null; message = "Reserve failed: " # e };
      case (#ok(_)) {};
    };
    paypalOrdersConsumed.add(paypalOrderId, tokenId);
    switch (ICRC7Lib.assignOwnership(icrc7Owners, icrc7Balances, tokenId, ?reservedAccount, buyerAccount)) {
      case (#err(e)) {
        ignore ICRC7Lib.assignOwnership(icrc7Owners, icrc7Balances, tokenId, ?reservedAccount, canisterAccount);
        ignore paypalOrdersConsumed.delete(paypalOrderId);
        return { success = false; tokenId = null; message = "Transfer failed: " # e };
      };
      case (#ok(_)) {};
    };
    ignore ICRC37Lib.removeAllApprovals(icrc37Approvals, tokenId);
    auditLog.value := AuditLog.append(auditLog.value, {
      ts = Time.now();
      admin = caller;
      action = "pepperhead_purchased";
      detail = "tokenId=" # Nat.toText(tokenId) #
        " buyer=" # Principal.toText(caller) #
        " ref=paypal:" # paypalOrderId;
    });
    { success = true; tokenId = ?tokenId; message = "PepperHead #" # Nat.toText(tokenId) # " is yours" };
  };

  // ── PayPal Grower Co-op seat ──────────────────────────────────────────────

  public shared ({ caller }) func prepareCoopPayPalCheckout() : async {
    success : Bool;
    tokenId : ?Nat;
    customId : ?Text;
    usdCents : Nat;
    message : Text;
  } {
    AccessControl.requireAuthenticated(caller);
    if (not RateLimit.check(rateLimits.paypal, caller)) {
      return {
        success = false;
        tokenId = null;
        customId = null;
        usdCents = coopSeatPriceCents.value;
        message = "Rate limited. Try again in a minute.";
      };
    };
    let reserved = switch (reserveCoopSeatForBuyer(caller)) {
      case null {
        return {
          success = false;
          tokenId = null;
          customId = null;
          usdCents = coopSeatPriceCents.value;
          message = "No founding seats available";
        };
      };
      case (?t) t;
    };
    {
      success = true;
      tokenId = ?reserved;
      customId = ?PayPalPayment.customIdCoop(reserved);
      usdCents = coopSeatPriceCents.value;
      message = "Seat reserved for PayPal checkout";
    };
  };

  public shared ({ caller }) func purchaseCoopSeatPayPal(
    paypalOrderId : Text,
  ) : async CoopTypes.PurchaseCoopSeatResult {
    AccessControl.requireAuthenticated(caller);
    if (not RateLimit.check(rateLimits.paypal, caller)) {
      return { success = false; tokenId = null; message = "Rate limited. Try again in a minute." };
    };
    switch (CallerGuard.acquire(callerGuards, caller)) {
      case (#err(e)) { Runtime.trap("Request already in flight: " # e) };
      case (#ok(_)) {};
    };
    try {
      let result = await doPurchaseCoopSeatPayPal(caller, paypalOrderId);
      CallerGuard.release(callerGuards, caller);
      result;
    } catch (_) {
      CallerGuard.release(callerGuards, caller);
      { success = false; tokenId = null; message = "Unexpected error during seat purchase" };
    };
  };

  func parseCoopTokenFromCustomId(customId : Text) : ?Nat {
    let prefix = "icspicy:coop:";
    if (not Text.startsWith(customId, #text prefix)) return null;
    switch (Text.stripStart(customId, #text prefix)) {
      case null null;
      case (?rest) Nat.fromText(rest);
    };
  };

  func doPurchaseCoopSeatPayPal(
    caller : Principal,
    paypalOrderId : Text,
  ) : async CoopTypes.PurchaseCoopSeatResult {
    switch (paypalOrdersConsumed.get(paypalOrderId)) {
      case (?_) return { success = false; tokenId = null; message = "PayPal order already used" };
      case null {};
    };
    let price = coopSeatPriceCents.value;
    let verified = switch (await verifyPayPalOrder(paypalOrderId, price, null)) {
      case (#err(e)) return { success = false; tokenId = null; message = e };
      case (#ok(v)) v;
    };
    let tokenId = switch (parseCoopTokenFromCustomId(verified.customId)) {
      case null return { success = false; tokenId = null; message = "Invalid coop custom_id" };
      case (?t) t;
    };
    if (verified.customId != PayPalPayment.customIdCoop(tokenId)) {
      return { success = false; tokenId = null; message = "Coop custom_id mismatch" };
    };
    switch (coopPendingSeats.get(tokenId)) {
      case null return { success = false; tokenId = null; message = "No pending reservation for this seat" };
      case (?buyer) {
        if (not Principal.equal(buyer, caller)) {
          return { success = false; tokenId = null; message = "Seat reserved by another buyer" };
        };
      };
    };
    switch (paypalOrdersConsumed.get(paypalOrderId)) {
      case (?_) return { success = false; tokenId = null; message = "PayPal order already used" };
      case null {};
    };
    paypalOrdersConsumed.add(paypalOrderId, tokenId);
    transferCoopSeatToBuyer(tokenId, caller, "paypal:" # paypalOrderId);
  };
};
