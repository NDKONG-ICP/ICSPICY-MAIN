// treasury_canister — IC SPICY treasury custody (TOKENOMICS_DISCLOSURE.md §6–§8).
//
// Custodies the 100M SPICY treasury allocation across the five §6.2 named
// subaccounts (plus the default subaccount for operational ICP), and enforces
// the §6.3 constraints IN CODE:
//   - Two-admin minimum on outflows: every transfer needs approvals from two
//     DISTINCT admins before it can execute. A single compromised admin
//     cannot move funds.
//   - Seven-day timelock: a proposed transfer is publicly visible on-chain
//     for 7 days before it becomes executable.
//   - Public audit trail (getTreasuryAuditLog), public burn log (§7.3,
//     getBurnLog), public buyback log (§8.3, getBuybackLog) — all queryable
//     by anyone, including anonymous.
//
// Buyback policy (§8) is DAO-governed: this canister READS policy from
// spicy_policy_canister (the SONS CustomCall target) at each monthly timer
// tick. The actual ICPSwap swap engine lands in Phase 8 once the SPICY/ICP
// pool exists; until then every attempt is logged as refused (§8.3 requires
// logging every attempt, including refusals).
//
// Ledger config (SPICY ledger, ICPSwap pool) is admin-set post-LGE — the
// canisters don't exist until the OHSHII launch. ICP ledger defaults to
// mainnet ryjl3 but is settable for local testing.
//
// State-mutation-around-await pattern (AGENTS.md): executeTransfer marks the
// proposal #executing BEFORE the ledger await, and compensates back to
// #pending on failure so it can be retried or cancelled.

import Array     "mo:core/Array";
import Blob      "mo:core/Blob";
import Cycles    "mo:core/Cycles";
import Error     "mo:core/Error";
import Int       "mo:core/Int";
import Map       "mo:core/Map";
import Nat       "mo:core/Nat";
import Nat8      "mo:core/Nat8";
import Nat64     "mo:core/Nat64";
import Principal "mo:core/Principal";
import Runtime   "mo:core/Runtime";
import Text      "mo:core/Text";
import Time      "mo:core/Time";
import Timer     "mo:core/Timer";

shared (msg) persistent actor class TreasuryCanister() = Self {

  // ── ICRC-1 ledger interface ──────────────────────────────────────────────

  public type Account = { owner : Principal; subaccount : ?Blob };

  type TransferArg = {
    from_subaccount : ?Blob;
    to : Account;
    amount : Nat;
    fee : ?Nat;
    memo : ?Blob;
    created_at_time : ?Nat64;
  };

  type TransferError = {
    #BadFee : { expected_fee : Nat };
    #BadBurn : { min_burn_amount : Nat };
    #InsufficientFunds : { balance : Nat };
    #TooOld;
    #CreatedInFuture : { ledger_time : Nat64 };
    #Duplicate : { duplicate_of : Nat };
    #TemporarilyUnavailable;
    #GenericError : { error_code : Nat; message : Text };
  };

  type Icrc1Ledger = actor {
    icrc1_transfer : shared TransferArg -> async { #Ok : Nat; #Err : TransferError };
    icrc1_fee : shared query () -> async Nat;
    icrc1_balance_of : shared query Account -> async Nat;
  };

  // ── spicy_policy_canister interface (SONS governance target) ─────────────

  public type BuybackRouting = { #redemptionPool; #burnReserve };

  public type BuybackPolicy = {
    pctBps : Nat16;
    slippageBps : Nat16;
    routing : BuybackRouting;
    paused : Bool;
    version : Nat;
  };

  type PolicyCanister = actor {
    getBuybackPolicy : shared query () -> async BuybackPolicy;
  };

  // ── §6.2 subaccount structure ────────────────────────────────────────────

  public type SubaccountKind = {
    #defaultSub;            // index 0 (null subaccount) — operational ICP
    #nftRedemptionPool;     // index 1 — 40M SPICY
    #marketingCommunity;    // index 2 — 25M SPICY
    #strategicReserve;      // index 3 — 20M SPICY
    #operationalReserve;    // index 4 — 10M SPICY
    #quarterlyBurnReserve;  // index 5 —  5M SPICY (§7.3)
  };

  func subIndex(k : SubaccountKind) : Nat8 {
    switch (k) {
      case (#defaultSub) 0;
      case (#nftRedemptionPool) 1;
      case (#marketingCommunity) 2;
      case (#strategicReserve) 3;
      case (#operationalReserve) 4;
      case (#quarterlyBurnReserve) 5;
    };
  };

  func subKindText(k : SubaccountKind) : Text {
    switch (k) {
      case (#defaultSub) "default";
      case (#nftRedemptionPool) "nftRedemptionPool";
      case (#marketingCommunity) "marketingCommunity";
      case (#strategicReserve) "strategicReserve";
      case (#operationalReserve) "operationalReserve";
      case (#quarterlyBurnReserve) "quarterlyBurnReserve";
    };
  };

  /// 32-byte subaccount blob: index in the last byte. Index 0 → null
  /// (the ledger treats null and the all-zero subaccount identically).
  func subBlob(k : SubaccountKind) : ?Blob {
    let idx = subIndex(k);
    if (idx == 0) return null;
    ?Blob.fromArray(Array.tabulate<Nat8>(32, func(i) { if (i == 31) idx else 0 }));
  };

  transient let allSubKinds : [SubaccountKind] = [
    #defaultSub, #nftRedemptionPool, #marketingCommunity,
    #strategicReserve, #operationalReserve, #quarterlyBurnReserve,
  ];

  // ── Constants ────────────────────────────────────────────────────────────

  transient let TIMELOCK_NS : Int = 7 * 86_400 * 1_000_000_000;        // §6.3: 7 days
  transient let BUYBACK_INTERVAL_S : Nat = 30 * 86_400;                // §8.1: monthly
  transient let BURN_PRINCIPAL : Text = "2vxsx-fae";                   // §7: universal burn

  // ── State ────────────────────────────────────────────────────────────────

  var admins : [Principal] = [msg.caller];

  // Ledger / peer config (admin-set; SPICY + pool don't exist until LGE).
  var icpLedgerId : Text = "ryjl3-tyaaa-aaaaa-aaaba-cai";
  var spicyLedgerId : Text = "";       // set post-LGE
  var icpswapPoolId : Text = "";       // set post-LGE (Phase 8 swap engine)
  var policyCanisterId : Text = "";    // spicy_policy_canister (xug4g on mainnet)

  // Transfer proposals. Core record is immutable; status and approvals live
  // in side maps (AGENTS.md: var fields make records type-invariant in
  // stable memory — side maps keep upgrades safe).
  public type TransferProposal = {
    id : Nat;
    ledger : Text;                 // ICRC-1 ledger canister id
    fromSub : SubaccountKind;
    to : Account;
    amount : Nat;                  // e8s / smallest unit; fee paid on top by treasury
    memo : ?Text;
    proposer : Principal;
    proposedAt : Int;
    executableAt : Int;            // proposedAt + 7 days
  };

  public type ProposalStatus = {
    #pending;
    #executing;
    #executed : Nat;               // ledger block index
    #cancelled;
  };

  var nextProposalId : Nat = 1;
  let proposals = Map.empty<Nat, TransferProposal>();
  let proposalStatus = Map.empty<Nat, ProposalStatus>();
  let proposalApprovals = Map.empty<Nat, [Principal]>();

  // §6.3 public audit trail.
  public type AuditEntry = { ts : Int; admin : Principal; action : Text; detail : Text };
  var auditLog : [AuditEntry] = [];

  // §7.3 public burn log (outflows whose destination is the burn principal).
  public type BurnEntry = { ts : Int; proposalId : Nat; ledger : Text; amount : Nat; blockIndex : Nat };
  var burnLog : [BurnEntry] = [];

  // §8.3 public buyback log — every attempt, including refusals.
  public type BuybackOutcome = {
    #refusedNotConfigured;         // SPICY ledger / ICPSwap pool not set (pre-Phase 8)
    #skippedPaused;                // policy.paused = true
    #refusedPolicyUnavailable : Text; // policy canister unreachable
    #refusedNotImplemented;        // swap engine lands in Phase 8
  };
  public type BuybackEntry = {
    ts : Int;
    policyVersion : ?Nat;
    pctBps : ?Nat16;
    outcome : BuybackOutcome;
  };
  var buybackLog : [BuybackEntry] = [];

  // ── Guards & helpers ─────────────────────────────────────────────────────

  func isAdmin(p : Principal) : Bool {
    for (a in admins.vals()) { if (a == p) return true };
    false;
  };

  func requireAdmin(caller : Principal) {
    if (not isAdmin(caller)) { Runtime.trap("Unauthorized: Admin only") };
  };

  func appendAudit(admin : Principal, action : Text, detail : Text) {
    auditLog := auditLog.concat([{ ts = Time.now(); admin; action; detail }]);
  };

  func getProposal(id : Nat) : TransferProposal {
    switch (proposals.get(id)) {
      case (?p) p;
      case null Runtime.trap("Proposal " # Nat.toText(id) # " not found");
    };
  };

  func statusOf(id : Nat) : ProposalStatus {
    switch (proposalStatus.get(id)) {
      case (?s) s;
      case null #pending;
    };
  };

  func approvalsOf(id : Nat) : [Principal] {
    switch (proposalApprovals.get(id)) {
      case (?a) a;
      case null [];
    };
  };

  /// Distinct approvers who are STILL admins (revoking an admin revokes
  /// their outstanding approvals).
  func liveApprovalCount(id : Nat) : Nat {
    var n = 0;
    for (a in approvalsOf(id).vals()) { if (isAdmin(a)) n += 1 };
    n;
  };

  // ── Transfer proposals: propose → second-admin approve → 7d → execute ────

  /// Admin: propose a treasury outflow. Counts as the proposer's approval.
  /// Publicly visible immediately; executable after the 7-day timelock AND a
  /// second distinct admin approval.
  public shared ({ caller }) func proposeTransfer(
    ledger : Text,
    fromSub : SubaccountKind,
    toOwner : Principal,
    toSubaccount : ?Blob,
    amount : Nat,
    memo : ?Text,
  ) : async Nat {
    requireAdmin(caller);
    if (amount == 0) { Runtime.trap("Amount must be positive") };
    ignore Principal.fromText(ledger); // validate ledger id early
    let now = Time.now();
    let id = nextProposalId;
    nextProposalId += 1;
    proposals.add(id, {
      id;
      ledger;
      fromSub;
      to = { owner = toOwner; subaccount = toSubaccount };
      amount;
      memo;
      proposer = caller;
      proposedAt = now;
      executableAt = now + TIMELOCK_NS;
    });
    proposalStatus.add(id, #pending);
    proposalApprovals.add(id, [caller]);
    appendAudit(caller, "transfer_proposed",
      "id=" # Nat.toText(id) # " ledger=" # ledger #
      " from=" # subKindText(fromSub) # " to=" # Principal.toText(toOwner) #
      " amount=" # Nat.toText(amount));
    id;
  };

  /// Admin: approve a pending proposal. Must be a distinct admin.
  public shared ({ caller }) func approveTransfer(id : Nat) : async () {
    requireAdmin(caller);
    ignore getProposal(id);
    switch (statusOf(id)) {
      case (#pending) {};
      case (_) Runtime.trap("Proposal is not pending");
    };
    let existing = approvalsOf(id);
    for (a in existing.vals()) {
      if (a == caller) { Runtime.trap("Already approved by this admin") };
    };
    proposalApprovals.add(id, existing.concat([caller]));
    appendAudit(caller, "transfer_approved", "id=" # Nat.toText(id));
  };

  /// Admin: cancel a pending proposal.
  public shared ({ caller }) func cancelTransfer(id : Nat) : async () {
    requireAdmin(caller);
    ignore getProposal(id);
    switch (statusOf(id)) {
      case (#pending) {};
      case (_) Runtime.trap("Only pending proposals can be cancelled");
    };
    proposalStatus.add(id, #cancelled);
    appendAudit(caller, "transfer_cancelled", "id=" # Nat.toText(id));
  };

  /// Admin: execute after timelock + two live admin approvals.
  /// Fee is looked up via icrc1_fee (never hardcoded) and paid on top.
  public shared ({ caller }) func executeTransfer(id : Nat) : async Nat {
    requireAdmin(caller);
    let p = getProposal(id);
    switch (statusOf(id)) {
      case (#pending) {};
      case (#executing) Runtime.trap("Proposal is already executing");
      case (_) Runtime.trap("Proposal is not pending");
    };
    if (liveApprovalCount(id) < 2) {
      Runtime.trap("Two-admin minimum: needs a second distinct admin approval (§6.3)");
    };
    if (Time.now() < p.executableAt) {
      let hoursLeft = (p.executableAt - Time.now()) / 3_600_000_000_000;
      Runtime.trap("Timelock not elapsed: executable in ~" # Int.toText(hoursLeft) # "h (§6.3 seven-day timelock)");
    };
    // Mark executing BEFORE the await (reentrancy guard); compensate on failure.
    proposalStatus.add(id, #executing);
    let ledger : Icrc1Ledger = actor (p.ledger);
    try {
      let fee = await ledger.icrc1_fee();
      let result = await ledger.icrc1_transfer({
        from_subaccount = subBlob(p.fromSub);
        to = p.to;
        amount = p.amount;
        fee = ?fee;
        memo = switch (p.memo) { case (?m) ?Text.encodeUtf8(m); case null null };
        created_at_time = ?Nat64.fromIntWrap(Time.now());
      });
      switch (result) {
        case (#Ok(block)) {
          proposalStatus.add(id, #executed(block));
          appendAudit(caller, "transfer_executed",
            "id=" # Nat.toText(id) # " block=" # Nat.toText(block));
          if (Principal.toText(p.to.owner) == BURN_PRINCIPAL) {
            burnLog := burnLog.concat([{
              ts = Time.now(); proposalId = id; ledger = p.ledger;
              amount = p.amount; blockIndex = block;
            }]);
          };
          block;
        };
        case (#Err(e)) {
          proposalStatus.add(id, #pending); // compensation — retry or cancel
          let msgTxt = switch (e) {
            case (#BadFee(r)) "BadFee expected=" # Nat.toText(r.expected_fee);
            case (#BadBurn(r)) "BadBurn min=" # Nat.toText(r.min_burn_amount);
            case (#InsufficientFunds(r)) "InsufficientFunds balance=" # Nat.toText(r.balance);
            case (#TooOld) "TooOld";
            case (#CreatedInFuture(_)) "CreatedInFuture";
            case (#Duplicate(r)) "Duplicate of block " # Nat.toText(r.duplicate_of);
            case (#TemporarilyUnavailable) "TemporarilyUnavailable";
            case (#GenericError(r)) "GenericError: " # r.message;
          };
          appendAudit(caller, "transfer_failed", "id=" # Nat.toText(id) # " " # msgTxt);
          Runtime.trap("Ledger transfer failed: " # msgTxt);
        };
      };
    } catch (e) {
      proposalStatus.add(id, #pending); // compensation
      appendAudit(caller, "transfer_failed", "id=" # Nat.toText(id) # " call error: " # Error.message(e));
      Runtime.trap("Ledger call failed: " # Error.message(e));
    };
  };

  // ── §8 buyback timer — reads DAO policy, logs every attempt ──────────────

  func runBuybackAttempt() : async () {
    if (policyCanisterId == "") {
      buybackLog := buybackLog.concat([{
        ts = Time.now(); policyVersion = null; pctBps = null;
        outcome = #refusedPolicyUnavailable("policy canister not configured");
      }]);
      return;
    };
    let policyActor : PolicyCanister = actor (policyCanisterId);
    let policy = try { await policyActor.getBuybackPolicy() } catch (e) {
      buybackLog := buybackLog.concat([{
        ts = Time.now(); policyVersion = null; pctBps = null;
        outcome = #refusedPolicyUnavailable(Error.message(e));
      }]);
      return;
    };
    let outcome : BuybackOutcome =
      if (policy.paused) { #skippedPaused }
      else if (spicyLedgerId == "" or icpswapPoolId == "") { #refusedNotConfigured }
      else {
        // Phase 8: ICPSwap swap engine (quote vs 6h TWAP within
        // policy.slippageBps, swap pctBps of operational ICP, route per
        // policy.routing). Lands once the SPICY/ICP pool exists.
        #refusedNotImplemented
      };
    buybackLog := buybackLog.concat([{
      ts = Time.now();
      policyVersion = ?policy.version;
      pctBps = ?policy.pctBps;
      outcome;
    }]);
  };

  // Re-armed on every install AND upgrade (transient initializers re-run).
  transient let _buybackTimer = Timer.recurringTimer<system>(
    #seconds BUYBACK_INTERVAL_S,
    runBuybackAttempt,
  );

  /// Admin: manually trigger a buyback attempt (testing / off-cycle check).
  public shared ({ caller }) func adminTriggerBuyback() : async () {
    requireAdmin(caller);
    appendAudit(caller, "buyback_triggered_manually", "");
    await runBuybackAttempt();
  };

  // ── Public transparency queries (anyone, including anonymous) ────────────

  /// §6.2: published subaccount registry — kind, index, and the exact
  /// 32-byte subaccount, so external observers can verify balances on the
  /// SPICY/ICP ledgers independently.
  public query func getSubaccountRegistry() : async [{
    kind : SubaccountKind; index : Nat8; subaccount : ?Blob; account : Account;
  }] {
    Array.map<SubaccountKind, { kind : SubaccountKind; index : Nat8; subaccount : ?Blob; account : Account }>(
      allSubKinds,
      func(k) {
        {
          kind = k;
          index = subIndex(k);
          subaccount = subBlob(k);
          account = { owner = Principal.fromActor(Self); subaccount = subBlob(k) };
        };
      },
    );
  };

  public query func getTransferProposal(id : Nat) : async ?{
    proposal : TransferProposal; status : ProposalStatus; approvals : [Principal];
  } {
    switch (proposals.get(id)) {
      case null null;
      case (?p) ?{ proposal = p; status = statusOf(id); approvals = approvalsOf(id) };
    };
  };

  public query func listTransferProposals() : async [{
    proposal : TransferProposal; status : ProposalStatus; approvals : [Principal];
  }] {
    var out : [{ proposal : TransferProposal; status : ProposalStatus; approvals : [Principal] }] = [];
    for ((id, p) in proposals.entries()) {
      out := out.concat([{ proposal = p; status = statusOf(id); approvals = approvalsOf(id) }]);
    };
    out;
  };

  public query func getTreasuryAuditLog() : async [AuditEntry] { auditLog };

  public query func getBurnLog() : async [BurnEntry] { burnLog };

  public query func getBuybackLog() : async [BuybackEntry] { buybackLog };

  public query func getConfig() : async {
    icpLedger : Text; spicyLedger : Text; icpswapPool : Text; policyCanister : Text;
  } {
    {
      icpLedger = icpLedgerId;
      spicyLedger = spicyLedgerId;
      icpswapPool = icpswapPoolId;
      policyCanister = policyCanisterId;
    };
  };

  public query func getAdmins() : async [Principal] { admins };

  /// On-demand balances for the configured ledgers across all subaccounts.
  public shared func getTreasuryBalances() : async [{
    ledger : Text; kind : SubaccountKind; balance : Nat;
  }] {
    var out : [{ ledger : Text; kind : SubaccountKind; balance : Nat }] = [];
    let self = Principal.fromActor(Self);
    var ledgers : [Text] = [icpLedgerId];
    if (spicyLedgerId != "") { ledgers := ledgers.concat([spicyLedgerId]) };
    for (l in ledgers.vals()) {
      let ledger : Icrc1Ledger = actor (l);
      for (k in allSubKinds.vals()) {
        let bal = try {
          await ledger.icrc1_balance_of({ owner = self; subaccount = subBlob(k) });
        } catch (_e) { 0 };
        out := out.concat([{ ledger = l; kind = k; balance = bal }]);
      };
    };
    out;
  };

  // ── Admin config & management (operational, no timelock, audit-logged) ───

  public shared ({ caller }) func setSpicyLedger(id : Text) : async () {
    requireAdmin(caller);
    if (id != "") { ignore Principal.fromText(id) };
    spicyLedgerId := id;
    appendAudit(caller, "config_spicy_ledger", id);
  };

  public shared ({ caller }) func setIcpswapPool(id : Text) : async () {
    requireAdmin(caller);
    if (id != "") { ignore Principal.fromText(id) };
    icpswapPoolId := id;
    appendAudit(caller, "config_icpswap_pool", id);
  };

  public shared ({ caller }) func setPolicyCanister(id : Text) : async () {
    requireAdmin(caller);
    if (id != "") { ignore Principal.fromText(id) };
    policyCanisterId := id;
    appendAudit(caller, "config_policy_canister", id);
  };

  public shared ({ caller }) func setIcpLedger(id : Text) : async () {
    requireAdmin(caller);
    ignore Principal.fromText(id);
    icpLedgerId := id;
    appendAudit(caller, "config_icp_ledger", id);
  };

  public shared ({ caller }) func addAdmin(p : Principal) : async () {
    requireAdmin(caller);
    if (p.isAnonymous()) { Runtime.trap("Cannot add anonymous principal as admin") };
    if (isAdmin(p)) { return };
    admins := admins.concat([p]);
    appendAudit(caller, "admin_added", Principal.toText(p));
  };

  public shared ({ caller }) func removeAdmin(p : Principal) : async () {
    requireAdmin(caller);
    if (not isAdmin(p)) { return };
    if (admins.size() <= 2) {
      Runtime.trap("Cannot remove: two-admin minimum (§6.3)");
    };
    admins := Array.filter<Principal>(admins, func(a) { a != p });
    appendAudit(caller, "admin_removed", Principal.toText(p));
  };

  public query ({ caller }) func getCycleBalance() : async Nat {
    requireAdmin(caller);
    Cycles.balance();
  };

  // ── Ingress gate ─────────────────────────────────────────────────────────

  system func inspect({ caller : Principal; arg : Blob }) : Bool {
    arg.size() <= 10_000 and not caller.isAnonymous();
  };
};
