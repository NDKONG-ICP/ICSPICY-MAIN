import Array "mo:core/Array";
import Blob "mo:core/Blob";
import Principal "mo:core/Principal";
import Nat "mo:core/Nat";
import Nat8 "mo:core/Nat8";
import Nat64 "mo:core/Nat64";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Int "mo:core/Int";
import IcrcPayment "icrc-payment";
import FleetRegistry "fleet-registry";
import SwarmFleetRegistry "swarm-fleet-registry";

module {
  public type TopUpResult = {
    success : Bool;
    cyclesMinted : ?Nat;
    icpSpentE8s : Nat;
    ledgerBlockIndex : ?Nat;
    message : Text;
  };

  public type AutoTopUpPolicy = {
    enabled : Bool;
    thresholdCycles : Nat;
    icpPerTopUpE8s : Nat;
    maxIcpPerDayE8s : Nat;
    spentTodayIcpE8s : Nat;
  };

  // Must match the CMC candid exactly — an unknown variant tag traps at decode.
  type NotifyError = {
    #Refunded : { block_index : ?Nat64; reason : Text };
    #InvalidTransaction : Text;
    #TransactionTooOld : Nat64;
    #Processing;
    #Other : { error_code : Nat64; error_message : Text };
  };

  type CMC = actor {
    notify_top_up : shared {
      block_index : Nat64;
      canister_id : Principal;
    } -> async { #Ok : Nat; #Err : NotifyError };
  };

  let CMC_ID : Text = "rkp4c-7iaaa-aaaaa-aaaca-cai";
  let MIN_ICP_E8S : Nat = 100_000; // 0.001 ICP

  // ICRC-1 memo for CMC top-ups: "TPUP" (0x50555054) as 8 little-endian bytes.
  let MEMO_TOP_UP : Blob = "\54\50\55\50\00\00\00\00";

  /// CMC top-up subaccount for a target canister:
  /// 32 bytes — [length of principal blob, principal bytes..., zero padding].
  func topUpSubaccount(target : Principal) : Blob {
    let raw = Blob.toArray(Principal.toBlob(target));
    let sub = Array.tabulate<Nat8>(32, func(i : Nat) : Nat8 {
      if (i == 0) { Nat8.fromNat(raw.size()) }
      else if (i <= raw.size()) { raw[i - 1] }
      else { 0 };
    });
    Blob.fromArray(sub);
  };

  public func isFleetCanister(
    targetCanisterId : Text,
    backendId : Text,
    uploadsCanisterIdStable : ?Text,
    swarmStore : SwarmFleetRegistry.Store,
  ) : Bool {
    if (SwarmFleetRegistry.isRegisteredAny(swarmStore, targetCanisterId)) {
      return SwarmFleetRegistry.isRegistered(swarmStore, targetCanisterId);
    };
    for (t in FleetRegistry.productionTargets(backendId, uploadsCanisterIdStable).vals()) {
      if (t.canisterId == targetCanisterId) return true;
    };
    false;
  };

  public func dayIndex(now : Time.Time) : Nat {
    Nat64.toNat(Nat64.fromIntWrap(Int.abs(now) / 86_400_000_000_000))
  };

  func notifyErrorText(e : NotifyError) : Text {
    switch (e) {
      case (#Refunded({ reason; block_index })) {
        "CMC refunded the ICP: " # reason #
          (switch (block_index) {
            case null "";
            case (?b) " (refund block " # Nat64.toText(b) # ")";
          });
      };
      case (#InvalidTransaction(reason)) "Invalid CMC transaction: " # reason;
      case (#TransactionTooOld(_)) "CMC rejected: transaction too old";
      case (#Processing) "CMC is still processing this transaction — retry shortly";
      case (#Other({ error_message })) error_message;
    };
  };

  /// Transfer ICP from `treasuryOwner` to CMC and mint cycles on `targetCanisterId`.
  public func topUpFromTreasuryIcp(
    treasuryOwner : Principal,
    targetCanisterId : Text,
    icpE8s : Nat,
  ) : async TopUpResult {
    if (icpE8s < MIN_ICP_E8S) {
      return {
        success = false;
        cyclesMinted = null;
        icpSpentE8s = 0;
        ledgerBlockIndex = null;
        message = "Minimum top-up is 0.001 ICP";
      };
    };
    let target = Principal.fromText(targetCanisterId);
    let ledgerId = IcrcPayment.ledgerCanisterId(#ICP);
    let balance = await IcrcPayment.balanceOf(ledgerId, treasuryOwner);
    let fee = await IcrcPayment.icrc1Fee(ledgerId);
    if (icpE8s + fee > balance) {
      return {
        success = false;
        cyclesMinted = null;
        icpSpentE8s = 0;
        ledgerBlockIndex = null;
        message = "Insufficient treasury ICP: have " # Nat.toText(balance) #
          ", need " # Nat.toText(icpE8s + fee) # " (amount + fee)";
      };
    };
    let cmc = Principal.fromText(CMC_ID);
    switch (
      await IcrcPayment.transferOutToAccount(
        ledgerId,
        cmc,
        ?topUpSubaccount(target),
        icpE8s,
        ?Nat64.fromNat(Int.abs(Time.now())),
        ?MEMO_TOP_UP,
      )
    ) {
      case (#err(e)) {
        {
          success = false;
          cyclesMinted = null;
          icpSpentE8s = 0;
          ledgerBlockIndex = null;
          message = e;
        };
      };
      case (#ok(blockIndex)) {
        let cmcActor : CMC = actor (CMC_ID);
        let result = await cmcActor.notify_top_up({
          block_index = Nat64.fromNat(blockIndex);
          canister_id = target;
        });
        switch (result) {
          case (#Ok(cycles)) {
            {
              success = true;
              cyclesMinted = ?cycles;
              icpSpentE8s = icpE8s;
              ledgerBlockIndex = ?blockIndex;
              message = "Minted " # Nat.toText(cycles) # " cycles";
            };
          };
          case (#Err(e)) {
            {
              success = false;
              cyclesMinted = null;
              icpSpentE8s = icpE8s;
              ledgerBlockIndex = ?blockIndex;
              message = notifyErrorText(e) #
                " — ICP sent; retry notify_top_up with block " # Nat.toText(blockIndex);
            };
          };
        };
      };
    };
  };
};
