import AccessControl "../lib/access-control";
import AuditLog "../lib/audit-log";
import CallerGuard "../lib/caller-guard";
import CoopLib "../lib/coop";
import GrowerProvLib "../lib/grower-provenance";
import ICRC7Lib "../lib/icrc7";
import ICRC37Lib "../lib/icrc37";
import IcrcPayment "../lib/icrc-payment";
import PriceOracleLib "../lib/price-oracle";
import PriceOracleTypes "../types/price-oracle";
import NimsLib "../lib/nims";
import NftClaim "../lib/nft-claim";
import CoopTypes "../types/coop";
import Common "../types/common";
import PlantTypes "../types/plants";
import ClaimTypes "../types/claim";
import VarietyTypes "../types/variety";
import ICRC7 "../types/icrc7";
import Result "mo:core/Result";
import Map "mo:core/Map";
import Set "mo:core/Set";
import Blob "mo:core/Blob";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Text "mo:core/Text";
import Nat "mo:core/Nat";
import Nat64 "mo:core/Nat64";
import Array "mo:core/Array";
import Int "mo:core/Int";
import Time "mo:core/Time";
import RateLimits "../lib/rate-limits";
import RateLimit "../lib/rate-limit";

mixin (
  accessControlState : AccessControl.AccessControlState,
  callerGuards : CallerGuard.GuardMap,
  rateLimits : RateLimits.Bundle,
  coopSeats : Map.Map<Nat, CoopTypes.CoopSeat>,
  coopDesignatedSeats : Map.Map<Nat, Bool>,
  coopPendingSeats : Map.Map<Nat, Principal>,
  coopSeatPriceCents : { var value : Nat },
  nextGrowerTokenId : { var value : Nat },
  growerProvenanceMeta : Map.Map<Nat, CoopTypes.GrowerProvenanceMeta>,
  growerMintLimits : Map.Map<Principal, (Nat, Int)>,
  varieties : Map.Map<Nat, VarietyTypes.Variety>,
  icrc7Owners : Map.Map<Nat, ICRC7.Account>,
  icrc7Balances : Map.Map<Principal, Set.Set<Nat>>,
  icrc37Approvals : ICRC37Lib.ApprovalsMap,
  linkedWallets : Map.Map<Principal, [Principal]>,
  plants : Map.Map<Common.PlantId, PlantTypes.Plant>,
  plantOwners : Map.Map<Common.PlantId, Principal>,
  plantVarietyIds : Map.Map<Common.PlantId, Nat>,
  nftTokenPlantIds : Map.Map<Nat, Common.PlantId>,
  nftClaimTokens : Map.Map<Text, ClaimTypes.NftClaimEntry>,
  nftClaimPlantIds : Map.Map<Text, Common.PlantId>,
  plantClaimTokens : Map.Map<Common.PlantId, Text>,
  priceOracleState : PriceOracleTypes.PriceOracleState,
  selfPrincipal : () -> Principal,
  auditLog : { var value : AuditLog.AuditLog },
) {
  func isSeatHolder(caller : Principal) : Bool {
    CoopLib.isActiveSeatHolder(caller, linkedWallets, icrc7Balances, coopSeats);
  };

  func activateSeat(tokenId : Nat) {
    coopSeats.add(tokenId, {
      activatedAt = Time.now();
      growerName = null;
      growerLocation = null;
      licenseInfo = null;
      revoked = false;
    });
    ignore coopDesignatedSeats.delete(tokenId);
  };

  func transferDesignatedSeatToBuyer(
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
      case (#ok) {};
    };
    switch (ICRC7Lib.assignOwnership(icrc7Owners, icrc7Balances, tokenId, ?reservedAccount, buyerAccount)) {
      case (#err(e)) {
        ignore ICRC7Lib.assignOwnership(icrc7Owners, icrc7Balances, tokenId, ?reservedAccount, canisterAccount);
        ignore coopPendingSeats.delete(tokenId);
        return { success = false; tokenId = null; message = "Transfer failed: " # e };
      };
      case (#ok) {};
    };
    ignore ICRC37Lib.removeAllApprovals(icrc37Approvals, tokenId);
    ignore coopPendingSeats.delete(tokenId);
    activateSeat(tokenId);
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

  func reserveNextSeat(buyer : Principal) : ?Nat {
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

  // ── Admin ───────────────────────────────────────────────────────────────────

  public shared ({ caller }) func designateCoopSeats(tokenIds : [Nat]) : async {
    designated : Nat;
    skipped : Nat;
    messages : [Text];
  } {
    AccessControl.requireAdmin(accessControlState, caller);
    let canister = selfPrincipal();
    var designated : Nat = 0;
    var skipped : Nat = 0;
    var messages : [Text] = [];
    for (tokenId in tokenIds.vals()) {
      if (not ICRC7Lib.isPepperHead(tokenId)) {
        skipped += 1;
        messages := Array.concat(messages, ["#" # Nat.toText(tokenId) # ": not PepperHead"]);
        continue;
      };
      if (not CoopLib.canisterOwnsPepperHead(icrc7Owners, canister, tokenId)) {
        skipped += 1;
        messages := Array.concat(messages, ["#" # Nat.toText(tokenId) # ": not in canister pool"]);
        continue;
      };
      if (CoopLib.hasLiveClaimOnToken(nftTokenPlantIds, plantClaimTokens, tokenId)) {
        skipped += 1;
        messages := Array.concat(messages, ["#" # Nat.toText(tokenId) # ": live claim token"]);
        continue;
      };
      if (switch (coopSeats.get(tokenId)) { case null false; case (?_) true }) {
        skipped += 1;
        messages := Array.concat(messages, ["#" # Nat.toText(tokenId) # ": already sold"]);
        continue;
      };
      coopDesignatedSeats.add(tokenId, true);
      designated += 1;
    };
    auditLog.value := AuditLog.append(auditLog.value, {
      ts = Time.now();
      admin = caller;
      action = "coop_seats_designated";
      detail = "count=" # Nat.toText(designated);
    });
    { designated; skipped; messages };
  };

  public shared ({ caller }) func setCoopSeatPriceCents(cents : Nat) : async () {
    AccessControl.requireAdmin(accessControlState, caller);
    if (cents < 100 or cents > 1_000_000) {
      Runtime.trap("Price must be between $1 and $10,000 USD");
    };
    coopSeatPriceCents.value := cents;
  };

  public shared ({ caller }) func adminGrantCoopSeat(
    tokenId : Nat,
    recipient : Principal,
  ) : async CoopTypes.PurchaseCoopSeatResult {
    AccessControl.requireAdmin(accessControlState, caller);
    switch (coopDesignatedSeats.get(tokenId)) {
      case null {
        return { success = false; tokenId = null; message = "Token not designated as co-op seat" };
      };
      case (?_) {};
    };
    if (switch (coopSeats.get(tokenId)) { case null false; case (?_) true }) {
      return { success = false; tokenId = null; message = "Seat already sold" };
    };
    if (switch (coopPendingSeats.get(tokenId)) { case null false; case (?_) true }) {
      return { success = false; tokenId = null; message = "Seat pending purchase" };
    };
    if (not CoopLib.canisterOwnsPepperHead(icrc7Owners, selfPrincipal(), tokenId)) {
      return { success = false; tokenId = null; message = "Canister does not own token" };
    };
    transferDesignatedSeatToBuyer(tokenId, recipient, "admin_grant");
  };

  public shared ({ caller }) func adminRevokeSeat(tokenId : Nat, reason : Text) : async Bool {
    AccessControl.requireAdmin(accessControlState, caller);
    switch (coopSeats.get(tokenId)) {
      case null return false;
      case (?seat) {
        coopSeats.add(tokenId, {
          seat with revoked = true;
        });
        auditLog.value := AuditLog.append(auditLog.value, {
          ts = Time.now();
          admin = caller;
          action = "coop_seat_revoked";
          detail = "tokenId=" # Nat.toText(tokenId) # " reason=" # Text.trim(reason, #char ' ');
        });
        true;
      };
    };
  };

  // ── Queries ───────────────────────────────────────────────────────────────

  public query func getCoopSeatPriceCents() : async Nat {
    coopSeatPriceCents.value;
  };

  public query func getCoopSeatsRemaining() : async { total : Nat; available : Nat } {
    var total : Nat = 0;
    for ((_, _) in coopDesignatedSeats.entries()) { total += 1 };
    for ((_, seat) in coopSeats.entries()) {
      if (not seat.revoked) { total += 1 };
    };
    let available = CoopLib.countAvailableSeats(
      coopDesignatedSeats, coopSeats, coopPendingSeats, icrc7Owners, selfPrincipal(),
    );
    { total = if (total > 88) total else 88; available };
  };

  /// Admin-only: exact token IDs in `coopDesignatedSeats` (sorted ascending).
  public query ({ caller }) func adminListCoopDesignatedSeats() : async [Nat] {
    assert AccessControl.isAdmin(accessControlState, caller);
    var out : [Nat] = [];
    for ((tokenId, _) in coopDesignatedSeats.entries()) {
      out := Array.concat(out, [tokenId]);
    };
    Array.sort<Nat>(
      out,
      func(a, b) {
        if (a < b) #less else if (a > b) #greater else #equal;
      },
    );
  };

  public query ({ caller }) func getMyCoopStatus() : async ?CoopTypes.CoopStatus {
    CoopLib.findMyCoopStatus(caller, linkedWallets, icrc7Balances, coopSeats);
  };

  public query func listGrowerDirectory() : async [CoopTypes.GrowerDirectoryEntry] {
    var out : [CoopTypes.GrowerDirectoryEntry] = [];
    for ((tokenId, seat) in coopSeats.entries()) {
      if (seat.revoked) { continue };
      switch (seat.growerName) {
        case null { continue };
        case (?name) {
          if (name.size() == 0) { continue };
          let ownerPrincipal = switch (icrc7Owners.get(tokenId)) {
            case (?(acc)) acc.owner;
            case null continue;
          };
          var plantCount : Nat = 0;
          var provenanceMinted : Nat = 0;
          for ((pid, owner) in plantOwners.entries()) {
            if (Principal.equal(owner, ownerPrincipal)) { plantCount += 1 };
          };
          for ((_, meta) in growerProvenanceMeta.entries()) {
            if (Principal.equal(meta.grower, ownerPrincipal)) {
              provenanceMinted += 1;
            };
          };
          out := Array.concat(out, [{
            tokenId;
            growerName = name;
            growerLocation = seat.growerLocation;
            memberSince = seat.activatedAt;
            plantCount;
            provenanceMinted;
            profilePrincipal = ownerPrincipal;
          }]);
        };
      };
    };
    Array.sort<CoopTypes.GrowerDirectoryEntry>(
      out,
      func(a, b) {
        if (a.memberSince < b.memberSince) #less
        else if (a.memberSince > b.memberSince) #greater
        else #equal;
      },
    );
  };

  public query func isGrowerProvenanceToken(tokenId : Nat) : async Bool {
    GrowerProvLib.isGrowerProvenanceToken(tokenId);
  };

  public query func getGrowerProvenanceMeta(tokenId : Nat) : async ?CoopTypes.GrowerProvenanceMeta {
    growerProvenanceMeta.get(tokenId);
  };

  // ── Seat holder profile ───────────────────────────────────────────────────

  public shared ({ caller }) func updateMyGrowerProfile(
    name : Text,
    location : Text,
    license : Text,
  ) : async Bool {
    AccessControl.requireAuthenticated(caller);
    switch (CoopLib.findMyCoopStatus(caller, linkedWallets, icrc7Balances, coopSeats)) {
      case null Runtime.trap("Active co-op seat required");
      case (?status) {
        let clean = CoopLib.sanitizeProfile(name, location, license);
        if (clean.name.size() == 0) Runtime.trap("Grower name required");
        switch (coopSeats.get(status.tokenId)) {
          case null return false;
          case (?seat) {
            coopSeats.add(status.tokenId, {
              seat with
              growerName = ?clean.name;
              growerLocation = if (clean.location.size() > 0) ?clean.location else null;
              licenseInfo = if (clean.license.size() > 0) ?clean.license else null;
            });
            true;
          };
        };
      };
    };
  };

  // ── Purchase (ICRC-2 direct — ICPay path lives in payment-api.mo) ─────────

  public shared ({ caller }) func purchaseCoopSeatDirect(
    ledgerCanisterId : Text,
    amount : Nat,
  ) : async CoopTypes.PurchaseCoopSeatResult {
    AccessControl.requireAuthenticated(caller);
    if (not RateLimit.check(rateLimits.payment, caller)) {
      return { success = false; tokenId = null; message = "Rate limited. Try again in a minute." };
    };
    switch (CallerGuard.acquire(callerGuards, caller)) {
      case (#err(e)) { Runtime.trap("Request already in flight: " # e) };
      case (#ok) {};
    };
    try {
      let result = await doPurchaseCoopSeatDirect(caller, ledgerCanisterId, amount);
      CallerGuard.release(callerGuards, caller);
      result;
    } catch (_) {
      CallerGuard.release(callerGuards, caller);
      { success = false; tokenId = null; message = "Unexpected error during seat purchase" };
    };
  };

  public shared ({ caller }) func purchaseCoopSeat(paymentId : Text) : async CoopTypes.PurchaseCoopSeatResult {
    Runtime.trap("Use purchaseCoopSeatIcpay on payment-api");
  };

  func doPurchaseCoopSeatDirect(
    caller : Principal,
    ledgerCanisterId : Text,
    amount : Nat,
  ) : async CoopTypes.PurchaseCoopSeatResult {
    let token = switch (coopTokenFromLedgerId(ledgerCanisterId)) {
      case null return { success = false; tokenId = null; message = "Unsupported ledger" };
      case (?t) t;
    };
    let price = coopSeatPriceCents.value;
    switch (coopOracleTokenFromPayment(token)) {
      case (?oracleToken) {
        if (
          not PriceOracleLib.isPaymentAmountSufficient(
            priceOracleState, oracleToken, price, amount,
          )
        ) {
          return { success = false; tokenId = null; message = "Payment amount insufficient" };
        };
      };
      case null {};
    };
    let reserved = switch (reserveNextSeat(caller)) {
      case null return { success = false; tokenId = null; message = "No founding seats available" };
      case (?t) t;
    };
    switch (
      await IcrcPayment.transferFrom(
        token,
        caller,
        selfPrincipal(),
        amount,
        ?Nat64.fromNat(Int.abs(Time.now())),
        ?("coop_seat").encodeUtf8(),
      )
    ) {
      case (#err(e)) {
        ignore coopPendingSeats.delete(reserved);
        return { success = false; tokenId = null; message = e };
      };
      case (#ok(_)) {};
    };
    transferDesignatedSeatToBuyer(reserved, caller, "icrc2:" # ledgerCanisterId);
  };

  func coopTokenFromLedgerId(id : Text) : ?IcrcPayment.PaymentToken {
    if (id == IcrcPayment.ledgerCanisterId(#ICP)) { ?#ICP }
    else if (id == IcrcPayment.ledgerCanisterId(#ckBTC)) { ?#ckBTC }
    else if (id == IcrcPayment.ledgerCanisterId(#ckETH)) { ?#ckETH }
    else if (id == IcrcPayment.ledgerCanisterId(#ckUSDC)) { ?#ckUSDC }
    else if (id == IcrcPayment.ledgerCanisterId(#ckUSDT)) { ?#ckUSDT }
    else null;
  };

  func coopOracleTokenFromPayment(token : IcrcPayment.PaymentToken) : ?PriceOracleTypes.OracleToken {
    switch (token) {
      case (#ICP) ?#ICP;
      case (#ckBTC) ?#ckBTC;
      case (#ckETH) ?#ckETH;
      case (#ckUSDC) ?#ckUSDC;
      case (#ckUSDT) ?#ckUSDT;
      case (#RAVEN) null;
    };
  };

  // ── Grower provenance mint ──────────────────────────────────────────────────

  public shared ({ caller }) func mintGrowerProvenanceToken(
    plantId : Common.PlantId,
  ) : async CoopTypes.MintGrowerProvenanceResult {
    AccessControl.requireAuthenticated(caller);
    if (not isSeatHolder(caller)) {
      return { success = false; tokenId = null; message = "Co-op seat required" };
    };
    if (not GrowerProvLib.checkMintRate(growerMintLimits, caller)) {
      return { success = false; tokenId = null; message = "Rate limit: 20 mints per hour" };
    };
    switch (plants.get(plantId)) {
      case null return { success = false; tokenId = null; message = "Plant not found" };
      case (?plant) {
        if (not GrowerProvLib.isGerminatedPlant(plant)) {
          return { success = false; tokenId = null; message = "Plant must be germinated" };
        };
        switch (plantOwners.get(plantId)) {
          case null return { success = false; tokenId = null; message = "Plant owner unknown" };
          case (?owner) {
            let principals = CoopLib.principalsToCheck(caller, linkedWallets);
            if (Array.find<Principal>(principals, func(p) { Principal.equal(p, owner) }) == null) {
              return { success = false; tokenId = null; message = "You must own this plant" };
            };
            switch (NimsLib.nftTokenIdOf(plant)) {
              case (?existing) {
                return {
                  success = false;
                  tokenId = null;
                  message = "Plant already has NFT #" # Nat.toText(existing);
                };
              };
              case null {};
            };
            let varietyName = switch (plantVarietyIds.get(plantId)) {
              case (?vid) {
                switch (varieties.get(vid)) {
                  case (?v) v.name;
                  case null plant.variety;
                };
              };
              case null plant.variety;
            };
            let growerName = switch (CoopLib.findMyCoopStatus(caller, linkedWallets, icrc7Balances, coopSeats)) {
              case (?s) switch (s.seat.growerName) { case (?n) n; case null Principal.toText(caller) };
              case null Principal.toText(caller);
            };
            let tokenId = nextGrowerTokenId.value;
            nextGrowerTokenId.value += 1;
            switch (
              GrowerProvLib.mintGrowerToken(
                tokenId,
                icrc7Owners,
                icrc7Balances,
                nftTokenPlantIds,
                growerProvenanceMeta,
                caller,
                growerName,
                plantId,
                varietyName,
              )
            ) {
              case (#err(e)) return { success = false; tokenId = null; message = e };
              case (#ok(minted)) {
                NimsLib.setNftTokenId(plant, minted);
                GrowerProvLib.recordMint(growerMintLimits, caller);
                auditLog.value := AuditLog.append(auditLog.value, {
                  ts = Time.now();
                  admin = caller;
                  action = "grower_provenance_minted";
                  detail = "tokenId=" # Nat.toText(minted) # " plantId=" # Nat.toText(plantId);
                });
                { success = true; tokenId = ?minted; message = "Grower provenance NFT minted" };
              };
            };
          };
        };
      };
    };
  };

  public shared ({ caller }) func generateCoopClaimToken(plantId : Common.PlantId) : async Text {
    AccessControl.requireAuthenticated(caller);
    if (not isSeatHolder(caller)) Runtime.trap("Co-op seat required");
    switch (plants.get(plantId)) {
      case null Runtime.trap("Plant not found");
      case (?plant) {
        switch (plantOwners.get(plantId)) {
          case null Runtime.trap("Plant owner unknown");
          case (?owner) {
            let principals = CoopLib.principalsToCheck(caller, linkedWallets);
            if (Array.find<Principal>(principals, func(p) { Principal.equal(p, owner) }) == null) {
              Runtime.trap("Not your plant");
            };
          };
        };
        let tokenId = switch (NimsLib.nftTokenIdOf(plant)) {
          case null Runtime.trap("Plant has no provenance NFT — mint one first");
          case (?t) t;
        };
        if (not GrowerProvLib.isGrowerProvenanceToken(tokenId)) {
          Runtime.trap("Only grower provenance NFTs can be claimed via co-op handoff");
        };
        let claimToken = NftClaim.registerClaimToken(
          nftClaimTokens,
          nftClaimPlantIds,
          plantClaimTokens,
          nftTokenPlantIds,
          tokenId,
          ?plantId,
        );
        claimToken;
      };
    };
  };
};
