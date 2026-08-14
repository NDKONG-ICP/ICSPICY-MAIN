import Principal "mo:core/Principal";
import Nat "mo:core/Nat";
import Text "mo:core/Text";
import Array "mo:core/Array";
import Time "mo:core/Time";
import Int "mo:core/Int";
import IcrcPayment "icrc-payment";
import CyclesTopUp "cycles-topup";
import CanisterHealth "canister-health";
import FleetRegistry "fleet-registry";
import LpFeeCyclesEvents "lp-fee-cycles-events";

module {
  public type Config = {
    enabled : Bool;
    spicyLedgerId : ?Text;
    swapPoolId : ?Text;
    positionId : ?Nat;
    icpIsToken0 : Bool;
    positionOwnerPrincipal : ?Text;
    intervalDays : Nat;
    lastRunAt : Int;
    enabledAt : Int;
  };

  public type DryRun = {
    configured : Bool;
    positionFound : Bool;
    icpOwedE8s : Nat;
    spicyOwedE8s : Nat;
    ownerMatchesBackend : Bool;
    backendPrincipal : Text;
    message : Text;
  };

  public type RunResult = {
    success : Bool;
    icpHarvestedE8s : Nat;
    spicyFeesSkippedE8s : Nat;
    canistersToppedUp : Nat;
    totalCyclesMinted : Nat;
    details : [LpFeeCyclesEvents.CanisterFundingDetail];
    message : Text;
  };

  type SwapError = {
    #CommonError;
    #InternalError : Text;
    #UnsupportedToken : Text;
    #InsufficientFunds;
  };

  type UserPositionInfo = {
    tickUpper : Int;
    tokensOwed0 : Nat;
    tokensOwed1 : Nat;
    feeGrowthInside1LastX128 : Nat;
    liquidity : Nat;
    feeGrowthInside0LastX128 : Nat;
    tickLower : Int;
  };

  type SwapPool = actor {
    getUserPosition : (Nat) -> async { #ok : UserPositionInfo; #err : SwapError };
    claim : ({ positionId : Nat }) -> async {
      #ok : { amount0 : Nat; amount1 : Nat };
      #err : SwapError;
    };
    withdraw : ({ fee : Nat; token : Text; amount : Nat }) -> async {
      #ok : Nat;
      #err : SwapError;
    };
  };

  let ICP_LEDGER : Text = "ryjl3-tyaaa-aaaaa-aaaba-cai";
  let MIN_SPLIT_ICP_E8S : Nat = 100_000;
  let DAY_NANOS : Int = 86_400_000_000_000;

  public func isConfigured(config : Config) : Bool {
    switch (config.swapPoolId, config.positionId) {
      case (?_, ?_) true;
      case (_, _) false;
    };
  };

  public func shouldRunOnTimer(config : Config, now : Time.Time) : Bool {
    if (not config.enabled or not isConfigured(config)) return false;
    let intervalNanos = Int.abs(config.intervalDays) * DAY_NANOS;
    if (intervalNanos == 0) return false;
    if (config.lastRunAt == 0) {
      config.enabledAt > 0 and (now - config.enabledAt) >= intervalNanos;
    } else {
      (now - config.lastRunAt) >= intervalNanos;
    };
  };

  func swapErrorText(e : SwapError) : Text {
    switch (e) {
      case (#CommonError) "ICPSwap common error";
      case (#InternalError(msg)) "ICPSwap: " # msg;
      case (#UnsupportedToken(t)) "Unsupported token: " # t;
      case (#InsufficientFunds) "Insufficient funds in SwapPool";
    };
  };

  func icpAmount(amount0 : Nat, amount1 : Nat, icpIsToken0 : Bool) : Nat {
    if (icpIsToken0) amount0 else amount1;
  };

  func spicyAmount(amount0 : Nat, amount1 : Nat, icpIsToken0 : Bool) : Nat {
    if (icpIsToken0) amount1 else amount0;
  };

  func owedIcp(pos : UserPositionInfo, icpIsToken0 : Bool) : Nat {
    icpAmount(pos.tokensOwed0, pos.tokensOwed1, icpIsToken0);
  };

  func owedSpicy(pos : UserPositionInfo, icpIsToken0 : Bool) : Nat {
    spicyAmount(pos.tokensOwed0, pos.tokensOwed1, icpIsToken0);
  };

  func ownerMatchesBackend(
    config : Config,
    backendPrincipal : Principal,
  ) : Bool {
    switch (config.positionOwnerPrincipal) {
      case null true;
      case (?text) {
        switch (Principal.fromText(text)) {
          case (owner) Principal.equal(owner, backendPrincipal);
        };
      };
    };
  };

  public func dryRun(
    config : Config,
    backendPrincipal : Principal,
  ) : async DryRun {
    let backendText = Principal.toText(backendPrincipal);
    if (not isConfigured(config)) {
      return {
        configured = false;
        positionFound = false;
        icpOwedE8s = 0;
        spicyOwedE8s = 0;
        ownerMatchesBackend = false;
        backendPrincipal = backendText;
        message = "Configure SwapPool canister ID and LP position ID";
      };
    };
    let poolId = switch (config.swapPoolId) { case (?id) id; case null return {
      configured = false;
      positionFound = false;
      icpOwedE8s = 0;
      spicyOwedE8s = 0;
      ownerMatchesBackend = false;
      backendPrincipal = backendText;
      message = "Missing SwapPool ID";
    }; };
    let positionId = switch (config.positionId) {
      case (?id) id;
      case null return {
        configured = false;
        positionFound = false;
        icpOwedE8s = 0;
        spicyOwedE8s = 0;
        ownerMatchesBackend = false;
        backendPrincipal = backendText;
        message = "Missing position ID";
      };
    };
    let pool : SwapPool = actor (poolId);
    let ownerOk = ownerMatchesBackend(config, backendPrincipal);
    switch (await pool.getUserPosition(positionId)) {
      case (#err(e)) {
        {
          configured = true;
          positionFound = false;
          icpOwedE8s = 0;
          spicyOwedE8s = 0;
          ownerMatchesBackend = ownerOk;
          backendPrincipal = backendText;
          message = swapErrorText(e);
        };
      };
      case (#ok(pos)) {
        let icpOwed = owedIcp(pos, config.icpIsToken0);
        let spicyOwed = owedSpicy(pos, config.icpIsToken0);
        {
          configured = true;
          positionFound = true;
          icpOwedE8s = icpOwed;
          spicyOwedE8s = spicyOwed;
          ownerMatchesBackend = ownerOk;
          backendPrincipal = backendText;
          message = if (not ownerOk) {
            "Position owner must match backend (" # backendText #
              ") for automated claim — update OHSHII/LP ownership or harvest manually";
          } else if (icpOwed == 0) {
            "No ICP fees accrued yet (SPICY fees ignored by policy)";
          } else {
            "Ready — " # Nat.toText(icpOwed) # " ICP e8s owed (SPICY fees not collected)";
          };
        };
      };
    };
  };

  func readableFleetEntries(
    backendId : Text,
    uploadsCanisterIdStable : ?Text,
  ) : async [CanisterHealth.FleetEntry] {
    let targets = FleetRegistry.productionTargets(backendId, uploadsCanisterIdStable);
    let fleet = await CanisterHealth.probeFleet(targets);
    Array.filter(
      fleet,
      func (e : CanisterHealth.FleetEntry) : Bool { e.probeStatus == #ok },
    );
  };

  func splitIcp(totalIcpE8s : Nat, count : Nat) : [Nat] {
    if (count == 0) return [];
    let base = totalIcpE8s / count;
    let remainder = totalIcpE8s % count;
    Array.tabulate<Nat>(count, func(i) {
      if (i == 0) base + remainder else base;
    });
  };

  public func runFunding(
    config : Config,
    backendPrincipal : Principal,
    backendId : Text,
    uploadsCanisterIdStable : ?Text,
    dryRunOnly : Bool,
  ) : async RunResult {
    let preview = await dryRun(config, backendPrincipal);
    if (not preview.configured) {
      return {
        success = false;
        icpHarvestedE8s = 0;
        spicyFeesSkippedE8s = 0;
        canistersToppedUp = 0;
        totalCyclesMinted = 0;
        details = [];
        message = preview.message;
      };
    };
    if (not preview.positionFound) {
      return {
        success = false;
        icpHarvestedE8s = 0;
        spicyFeesSkippedE8s = 0;
        canistersToppedUp = 0;
        totalCyclesMinted = 0;
        details = [];
        message = preview.message;
      };
    };
    if (dryRunOnly) {
      return {
        success = true;
        icpHarvestedE8s = preview.icpOwedE8s;
        spicyFeesSkippedE8s = preview.spicyOwedE8s;
        canistersToppedUp = 0;
        totalCyclesMinted = 0;
        details = [];
        message = "Dry run: " # preview.message;
      };
    };
    if (not preview.ownerMatchesBackend) {
      return {
        success = false;
        icpHarvestedE8s = 0;
        spicyFeesSkippedE8s = preview.spicyOwedE8s;
        canistersToppedUp = 0;
        totalCyclesMinted = 0;
        details = [];
        message = preview.message;
      };
    };
    if (preview.icpOwedE8s < MIN_SPLIT_ICP_E8S) {
      return {
        success = false;
        icpHarvestedE8s = 0;
        spicyFeesSkippedE8s = preview.spicyOwedE8s;
        canistersToppedUp = 0;
        totalCyclesMinted = 0;
        details = [];
        message = "ICP fees below minimum (" # Nat.toText(MIN_SPLIT_ICP_E8S) # " e8s)";
      };
    };

    let poolId = switch (config.swapPoolId) { case (?id) id; case null return {
      success = false;
      icpHarvestedE8s = 0;
      spicyFeesSkippedE8s = 0;
      canistersToppedUp = 0;
      totalCyclesMinted = 0;
      details = [];
      message = "Missing SwapPool ID";
    }; };
    let positionId = switch (config.positionId) {
      case (?id) id;
      case null return {
        success = false;
        icpHarvestedE8s = 0;
        spicyFeesSkippedE8s = 0;
        canistersToppedUp = 0;
        totalCyclesMinted = 0;
        details = [];
        message = "Missing position ID";
      };
    };

    let pool : SwapPool = actor (poolId);
    let balanceBefore = await IcrcPayment.balanceOf(ICP_LEDGER, backendPrincipal);

    let claimResult = await pool.claim({ positionId = positionId });
    let claimed = switch (claimResult) {
      case (#err(e)) {
        return {
          success = false;
          icpHarvestedE8s = 0;
          spicyFeesSkippedE8s = preview.spicyOwedE8s;
          canistersToppedUp = 0;
          totalCyclesMinted = 0;
          details = [];
          message = "claim failed: " # swapErrorText(e);
        };
      };
      case (#ok(amounts)) amounts;
    };

    let icpClaimed = icpAmount(claimed.amount0, claimed.amount1, config.icpIsToken0);
    let spicySkipped = spicyAmount(claimed.amount0, claimed.amount1, config.icpIsToken0);

    var icpAvailable = await IcrcPayment.balanceOf(ICP_LEDGER, backendPrincipal);
    if (icpAvailable <= balanceBefore and icpClaimed > 0) {
      let fee = await IcrcPayment.icrc1Fee(ICP_LEDGER);
      switch (
        await pool.withdraw({ fee = fee; token = ICP_LEDGER; amount = icpClaimed })
      ) {
        case (#ok(_)) {};
        case (#err(e)) {
          return {
            success = false;
            icpHarvestedE8s = icpClaimed;
            spicyFeesSkippedE8s = spicySkipped;
            canistersToppedUp = 0;
            totalCyclesMinted = 0;
            details = [];
            message = "withdraw ICP failed: " # swapErrorText(e);
          };
        };
      };
    };
    let balanceAfter = await IcrcPayment.balanceOf(ICP_LEDGER, backendPrincipal);
    icpAvailable := if (balanceAfter > balanceBefore) {
      balanceAfter - balanceBefore;
    } else {
      icpClaimed;
    };
    if (icpAvailable < MIN_SPLIT_ICP_E8S) {
      return {
        success = false;
        icpHarvestedE8s = icpAvailable;
        spicyFeesSkippedE8s = spicySkipped;
        canistersToppedUp = 0;
        totalCyclesMinted = 0;
        details = [];
        message = "Harvested ICP not available on backend ledger yet";
      };
    };

    let fleet = await readableFleetEntries(backendId, uploadsCanisterIdStable);
    if (fleet.size() == 0) {
      return {
        success = false;
        icpHarvestedE8s = icpAvailable;
        spicyFeesSkippedE8s = spicySkipped;
        canistersToppedUp = 0;
        totalCyclesMinted = 0;
        details = [];
        message = "No readable fleet canisters";
      };
    };

    let shares = splitIcp(icpAvailable, fleet.size());
    var details : [LpFeeCyclesEvents.CanisterFundingDetail] = [];
    var toppedUp : Nat = 0;
    var totalCycles : Nat = 0;
    var idx : Nat = 0;
    for (entry in fleet.vals()) {
      let share = shares[idx];
      idx += 1;
      if (share >= MIN_SPLIT_ICP_E8S) {
        let result = await CyclesTopUp.topUpFromTreasuryIcp(
          backendPrincipal,
          entry.canisterId,
          share,
        );
        if (result.success) {
          toppedUp += 1;
          switch (result.cyclesMinted) {
            case (?c) totalCycles += c;
            case null {};
          };
          details := Array.concat(details, [{
            name = entry.name;
            canisterId = entry.canisterId;
            icpSpentE8s = share;
            cyclesMinted = switch (result.cyclesMinted) { case (?c) c; case null 0 };
          }]);
        };
      };
    };

    {
      success = toppedUp > 0;
      icpHarvestedE8s = icpAvailable;
      spicyFeesSkippedE8s = spicySkipped;
      canistersToppedUp = toppedUp;
      totalCyclesMinted = totalCycles;
      details;
      message = if (toppedUp > 0) {
        "Funded " # Nat.toText(toppedUp) # " canister(s) with " #
          Nat.toText(icpAvailable) # " ICP e8s from LP fees";
      } else {
        "Claim succeeded but no canister top-ups completed";
      };
    };
  };
};
