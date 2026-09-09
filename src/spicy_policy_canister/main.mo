// spicy_policy_canister — SONS CustomCall governance target for IC SPICY.
//
// This canister is the ONE sanctioned surface for DAO-controlled parameters.
// It stores buyback policy (TOKENOMICS_DISCLOSURE.md §8); the future
// treasury_canister (Phase 6/8) READS policy from here and runs the actual
// buyback timer. This canister is deliberately tiny and rarely upgraded:
// SONS pins our module hash at proposal creation and re-verifies it at
// dispatch, so any upgrade kills open proposals targeting us.
//
// Design contract (agreed with OHSHII dev, see PROJECT_CONTEXT.md
// "SONS CustomCall governance target"):
//   - Governed methods gate on caller == governancePrincipal (admin-set
//     post-LGE; the per-campaign SONS principal is created at launch).
//   - Every governed method takes expected_version : Nat and TRAPS unless it
//     equals configVersion + 1. The value appears verbatim in the voter-facing
//     render (correlator), makes re-fires after outcome_unknown a harmless
//     refusal, and serializes concurrent proposals.
//   - TRAP on invariant violations (stale version, cap exceeded, wrong
//     caller): under SONS outcome policy a trap = proposal Failed (provably no
//     effect), while a reply — even #err — = Executed. Bad proposals must
//     read as Failed.
//   - Synchronous setters only, no awaits — fits the 20 s bounded wait.
//   - No validate_* render methods (SONS derives the render from our candid
//     metadata) and no proposal-id parameter (blob is frozen before the id
//     exists). Reconciliation is pull-based: SONS stores the dispatched
//     method_args blob; third parties decode it against our published candid
//     and compare to our decoded-args audit log below.
//
// Security posture:
//   - inspect blocks anonymous ingress (governed calls arrive inter-canister
//     and bypass inspect; the governance gate is checked in-method).
//   - Multi-admin, deployer captured via shared(msg); no hardcoded principals.
//   - Public audit log: (caller, method, decoded params, timestamp).

import Array     "mo:core/Array";
import Cycles    "mo:core/Cycles";
import Nat       "mo:core/Nat";
import Nat16     "mo:core/Nat16";
import Principal "mo:core/Principal";
import Runtime   "mo:core/Runtime";
import Time      "mo:core/Time";

shared (msg) persistent actor class SpicyPolicyCanister() = Self {

  // ── Types ────────────────────────────────────────────────────────────────

  // Frozen variant: it lives in a stable `var`, so adding cases later would
  // break upgrades (type-invariant). A new routing target needs a migration.
  public type BuybackRouting = {
    #redemptionPool; // NFT redemption pool subaccount (§6.2) — default
    #burnReserve;    // quarterly burn reserve subaccount (§6.2)
  };

  public type BuybackPolicy = {
    pctBps      : Nat16;          // % of operational ICP per month, basis points
    slippageBps : Nat16;          // max deviation from 6h TWAP, basis points
    routing     : BuybackRouting;
    paused      : Bool;
    version     : Nat;            // configVersion at last change
  };

  public type AuditEntry = {
    ts     : Int;
    caller : Principal;
    method : Text;
    detail : Text; // decoded params, human-readable
  };

  // ── Hard caps (raising these requires a canister upgrade) ────────────────

  transient let MAX_BUYBACK_PCT_BPS : Nat16 = 500; // 5% of treasury ICP / month
  transient let MAX_SLIPPAGE_BPS    : Nat16 = 500; // 5% TWAP deviation

  // ── State ────────────────────────────────────────────────────────────────

  var admins : [Principal] = [msg.caller];

  // Per-campaign SONS governance principal. null until set post-LGE; all
  // governed methods refuse while unset.
  var governancePrincipal : ?Principal = null;

  // Monotonic version guard for governed setters.
  var configVersion : Nat = 0;

  // Defaults per TOKENOMICS_DISCLOSURE.md §8. Paused until the Phase 6/8
  // treasury_canister exists and is wired to read this policy.
  var buybackPctBps      : Nat16 = 200;  // 2%
  var buybackSlippageBps : Nat16 = 200;  // 2%
  var buybackRouting     : BuybackRouting = #redemptionPool;
  var buybackPaused      : Bool = true;

  var auditLog : [AuditEntry] = [];

  // ── Guards ───────────────────────────────────────────────────────────────

  func isAdmin(p : Principal) : Bool {
    for (a in admins.vals()) { if (a == p) return true };
    false;
  };

  func requireAdmin(caller : Principal) {
    if (not isAdmin(caller)) { Runtime.trap("Unauthorized: Admin only") };
  };

  func requireGovernance(caller : Principal) {
    switch (governancePrincipal) {
      case null {
        Runtime.trap("Governance principal not configured — governed methods are disabled until post-LGE setup");
      };
      case (?g) {
        if (caller != g) {
          Runtime.trap("Unauthorized: only the SONS governance canister may call this method");
        };
      };
    };
  };

  func requireVersion(expected : Nat) {
    if (expected != configVersion + 1) {
      Runtime.trap(
        "Stale expected_version " # Nat.toText(expected) #
        ": current config version is " # Nat.toText(configVersion) #
        " — query getConfigVersion() and propose with expected_version = current + 1"
      );
    };
  };

  func appendAudit(caller : Principal, method : Text, detail : Text) {
    auditLog := auditLog.concat([{ ts = Time.now(); caller; method; detail }]);
  };

  func routingText(r : BuybackRouting) : Text {
    switch (r) {
      case (#redemptionPool) "redemptionPool";
      case (#burnReserve) "burnReserve";
    };
  };

  // ── Governed methods (SONS CustomCall targets) ───────────────────────────

  /// DAO: set buyback percentage and TWAP slippage bound (basis points).
  public shared ({ caller }) func setBuybackParams(
    expected_version : Nat,
    pct_bps : Nat16,
    slippage_bps : Nat16,
  ) : async () {
    requireGovernance(caller);
    requireVersion(expected_version);
    if (pct_bps > MAX_BUYBACK_PCT_BPS) {
      Runtime.trap("pct_bps " # Nat16.toText(pct_bps) # " exceeds hard cap " # Nat16.toText(MAX_BUYBACK_PCT_BPS));
    };
    if (slippage_bps > MAX_SLIPPAGE_BPS) {
      Runtime.trap("slippage_bps " # Nat16.toText(slippage_bps) # " exceeds hard cap " # Nat16.toText(MAX_SLIPPAGE_BPS));
    };
    buybackPctBps := pct_bps;
    buybackSlippageBps := slippage_bps;
    configVersion += 1;
    appendAudit(
      caller, "setBuybackParams",
      "pct_bps=" # Nat16.toText(pct_bps) #
      " slippage_bps=" # Nat16.toText(slippage_bps) #
      " version=" # Nat.toText(configVersion),
    );
  };

  /// DAO: route buyback-acquired SPICY to the redemption pool or burn reserve (§8.4).
  public shared ({ caller }) func setBuybackRouting(
    expected_version : Nat,
    routing : BuybackRouting,
  ) : async () {
    requireGovernance(caller);
    requireVersion(expected_version);
    buybackRouting := routing;
    configVersion += 1;
    appendAudit(
      caller, "setBuybackRouting",
      "routing=" # routingText(routing) # " version=" # Nat.toText(configVersion),
    );
  };

  /// DAO: pause or resume buybacks (§8.5 — no commitment to permanent buybacks).
  public shared ({ caller }) func setBuybackPaused(
    expected_version : Nat,
    paused : Bool,
  ) : async () {
    requireGovernance(caller);
    requireVersion(expected_version);
    buybackPaused := paused;
    configVersion += 1;
    appendAudit(
      caller, "setBuybackPaused",
      "paused=" # (if paused "true" else "false") # " version=" # Nat.toText(configVersion),
    );
  };

  // ── Public queries (anyone, including treasury_canister and auditors) ────

  public query func getConfigVersion() : async Nat { configVersion };

  public query func getBuybackPolicy() : async BuybackPolicy {
    {
      pctBps = buybackPctBps;
      slippageBps = buybackSlippageBps;
      routing = buybackRouting;
      paused = buybackPaused;
      version = configVersion;
    };
  };

  public query func getPolicyCaps() : async { maxBuybackPctBps : Nat16; maxSlippageBps : Nat16 } {
    { maxBuybackPctBps = MAX_BUYBACK_PCT_BPS; maxSlippageBps = MAX_SLIPPAGE_BPS };
  };

  public query func getGovernanceAuditLog() : async [AuditEntry] { auditLog };

  public query func getGovernancePrincipal() : async ?Principal { governancePrincipal };

  public query func getAdmins() : async [Principal] { admins };

  // ── Admin methods ────────────────────────────────────────────────────────

  /// Admin: set (or clear) the per-campaign SONS governance principal.
  /// Run post-LGE once the campaign's sons_governance canister exists.
  public shared ({ caller }) func setGovernancePrincipal(p : ?Principal) : async () {
    requireAdmin(caller);
    governancePrincipal := p;
    appendAudit(
      caller, "setGovernancePrincipal",
      switch (p) { case (?g) Principal.toText(g); case null "null" },
    );
  };

  public shared ({ caller }) func addAdmin(p : Principal) : async () {
    requireAdmin(caller);
    if (p.isAnonymous()) { Runtime.trap("Cannot add anonymous principal as admin") };
    if (isAdmin(p)) { return };
    admins := admins.concat([p]);
    appendAudit(caller, "addAdmin", Principal.toText(p));
  };

  public query ({ caller }) func getCycleBalance() : async Nat {
    requireAdmin(caller);
    Cycles.balance();
  };

  // ── Ingress gate ─────────────────────────────────────────────────────────
  // Governed calls arrive inter-canister (bypass inspect); admin calls arrive
  // via ingress and are never anonymous. Cap arg size defensively.

  system func inspect({ caller : Principal; arg : Blob }) : Bool {
    arg.size() <= 10_000 and not caller.isAnonymous();
  };
};
