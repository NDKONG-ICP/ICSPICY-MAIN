// mixins/nims-api.mo — Phase 6 NIMS inventory, shop, and purchase methods.

import Map "mo:core/Map";
import Set "mo:core/Set";
import List "mo:core/List";
import Array "mo:core/Array";
import Iter "mo:core/Iter";
import Nat "mo:core/Nat";
import Nat64 "mo:core/Nat64";
import Int "mo:core/Int";
import Time "mo:core/Time";
import Principal "mo:core/Principal";
import Text "mo:core/Text";
import Runtime "mo:core/Runtime";
import Result "mo:core/Result";
import AccessControl "../lib/access-control";
import AuditLog "../lib/audit-log";
import CallerGuard "../lib/caller-guard";
import NimsLib "../lib/nims";
import PlantsLib "../lib/plants";
import IcrcPayment "../lib/icrc-payment";
import ICRC37Lib "../lib/icrc37";
import NftPool "../lib/nft-pool";
import Common "../types/common";
import PlantTypes "../types/plants";
import VarietyTypes "../types/variety";
import ClaimTypes "../types/claim";
import ICRC7 "../types/icrc7";
import DashTypes "../types/nims-dashboard";

mixin (
  accessControlState : AccessControl.AccessControlState,
  callerGuards : CallerGuard.GuardMap,
  plants : Map.Map<Common.PlantId, PlantTypes.Plant>,
  trays : Map.Map<Common.TrayId, PlantTypes.Tray>,
  trayOwners : Map.Map<Common.TrayId, Principal>,
  feedings : Map.Map<Common.FeedingId, PlantTypes.Feeding>,
  stageHistory : Map.Map<Common.PlantId, List.List<PlantTypes.StageHistory>>,
  varieties : Map.Map<Nat, VarietyTypes.Variety>,
  plantVarietyIds : Map.Map<Common.PlantId, Nat>,
  plantOwners : Map.Map<Common.PlantId, Principal>,
  plantPrices : Map.Map<Common.PlantId, Nat>,
  plantSoldAt : Map.Map<Common.PlantId, Common.Timestamp>,
  plantTransplantedOneGal : Map.Map<Common.PlantId, Common.Timestamp>,
  plantTransplantedFiveGal : Map.Map<Common.PlantId, Common.Timestamp>,
  plantNotesLog : Map.Map<Common.PlantId, List.List<PlantTypes.PlantNote>>,
  plantWateringLog : Map.Map<Common.PlantId, List.List<PlantTypes.WateringEntry>>,
  plantPestLog : Map.Map<Common.PlantId, List.List<PlantTypes.PestEntry>>,
  plantPhotoLog : Map.Map<Common.PlantId, List.List<PlantTypes.PlantPhotoEntry>>,
  plantWeatherSnapshots : Map.Map<Common.PlantId, List.List<PlantTypes.WeatherSnapshot>>,
  nftClaimTokens : Map.Map<Text, ClaimTypes.NftClaimEntry>,
  nftClaimPlantIds : Map.Map<Text, Common.PlantId>,
  plantClaimTokens : Map.Map<Common.PlantId, Text>,
  nftTokenPlantIds : Map.Map<Nat, Common.PlantId>,
  icrc7Owners : Map.Map<Nat, ICRC7.Account>,
  icrc7Balances : Map.Map<Principal, Set.Set<Nat>>,
  icrc37Approvals : ICRC37Lib.ApprovalsMap,
  claimTokens : Map.Map<Common.ClaimTokenId, ClaimTypes.ClaimToken>,
  rwaTokens : Map.Map<Text, PlantTypes.RWATokenMetadata>,
  selfPrincipal : () -> Principal,
  auditLog : { var value : AuditLog.AuditLog },
  nextPlantId : { var value : Nat },
  nextTrayId : { var value : Nat },
  nextFeedingId : { var value : Nat },
) {
  func nimsIsAdmin(p : Principal) : Bool {
    AccessControl.isAdmin(accessControlState, p);
  };

  func sideMaps() : NimsLib.SideMaps {
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
    };
  };

  func logAdmin(caller : Principal, action : Text, detail : Text) {
    auditLog.value := AuditLog.append(auditLog.value, {
      ts = Time.now();
      admin = caller;
      action;
      detail;
    });
  };

  func isTrayOwner(caller : Principal, trayId : Common.TrayId) : Bool {
    switch (trayOwners.get(trayId)) {
      case (?owner) owner == caller;
      case null false;
    };
  };

  func requireTrayOwnerOrAdmin(caller : Principal, trayId : Common.TrayId) {
    AccessControl.requireAuthenticated(caller);
    if (nimsIsAdmin(caller) or isTrayOwner(caller, trayId)) {
    } else {
      Runtime.trap("Unauthorized: tray owner or admin only");
    };
  };

  // ── Admin plant inventory ───────────────────────────────────────────────────

  public shared ({ caller }) func addPlant(
    varietyId : Nat,
    stage : PlantTypes.PlantStage,
    trayId : ?Common.TrayId,
    cellPosition : ?Nat,
    price : ?Nat,
    container : ?PlantTypes.ContainerSize,
  ) : async PlantTypes.AddPlantResult {
    AccessControl.requireAuthenticated(caller);
    switch (trayId) {
      case (?tid) { requireTrayOwnerOrAdmin(caller, tid) };
      case null {};
    };
    if (nimsIsAdmin(caller)) {
      let entropy = Int.abs(Time.now()) + nextPlantId.value + plants.size();
      switch (
        NimsLib.addPlantInternal(
          plants, trays, stageHistory, varieties, sideMaps(),
          icrc7Owners, icrc7Balances,
          nftClaimTokens, nftClaimPlantIds, plantClaimTokens, nftTokenPlantIds,
          selfPrincipal(), caller,
          nextPlantId.value, varietyId, stage, trayId, cellPosition, price, entropy,
        )
      ) {
        case (#err(e)) Runtime.trap(e);
        case (#ok(result)) {
          nextPlantId.value += 1;
          logAdmin(caller, "add_plant", "plantId=" # Nat.toText(result.plantId) # " nft=" # Nat.toText(result.nftTokenId));
          result;
        };
      };
    } else {
      switch (
        NimsLib.addPlantWithoutNftInternal(
          plants, trays, stageHistory, varieties, sideMaps(),
          caller, nextPlantId.value, varietyId, stage, trayId, cellPosition, container,
        )
      ) {
        case (#err(e)) Runtime.trap(e);
        case (#ok(plantId)) {
          nextPlantId.value += 1;
          { plantId; nftTokenId = 0; claimToken = "" };
        };
      };
    };
  };

  public shared ({ caller }) func addPlantBatch(
    varietyId : Nat,
    stage : PlantTypes.PlantStage,
    count : Nat,
    trayId : ?Common.TrayId,
  ) : async [PlantTypes.AddPlantResult] {
    if (not nimsIsAdmin(caller)) Runtime.trap("Unauthorized: Admin only");
    var results : [PlantTypes.AddPlantResult] = [];
    var i : Nat = 0;
    var entropy = Int.abs(Time.now()) + count;
    while (i < count) {
      let cellPos : ?Nat = switch trayId {
        case (?_) ?(i + 1);
        case null null;
      };
      switch (
        NimsLib.addPlantInternal(
          plants, trays, stageHistory, varieties, sideMaps(),
          icrc7Owners, icrc7Balances,
          nftClaimTokens, nftClaimPlantIds, plantClaimTokens, nftTokenPlantIds,
          selfPrincipal(), caller,
          nextPlantId.value, varietyId, stage, trayId, cellPos, null, entropy + i,
        )
      ) {
        case (#err(e)) Runtime.trap(e);
        case (#ok(result)) {
          nextPlantId.value += 1;
          results := Array.concat(results, [result]);
        };
      };
      i += 1;
    };
    logAdmin(caller, "add_plant_batch", "count=" # Nat.toText(count));
    results;
  };

  public shared ({ caller }) func removePlant(plantId : Common.PlantId) : async Bool {
    if (not nimsIsAdmin(caller)) Runtime.trap("Unauthorized: Admin only");
    let ok = NimsLib.removePlant(
      plants, sideMaps(), icrc7Owners, icrc7Balances, icrc37Approvals,
      selfPrincipal(), plantId,
    );
    if (ok) logAdmin(caller, "remove_plant", "plantId=" # Nat.toText(plantId));
    ok;
  };

  public shared ({ caller }) func updateNimsPlantStage(
    plantId : Common.PlantId,
    newStage : PlantTypes.PlantStage,
  ) : async Bool {
    if (not nimsIsAdmin(caller)) Runtime.trap("Unauthorized: Admin only");
    let ok = NimsLib.updatePlantStageInternal(plants, stageHistory, sideMaps(), plantId, newStage);
    if (ok) logAdmin(caller, "update_plant_stage", "plantId=" # Nat.toText(plantId));
    ok;
  };

  public shared ({ caller }) func listPlantForSale(
    plantId : Common.PlantId,
    price : ?Nat,
  ) : async Bool {
    if (not nimsIsAdmin(caller)) Runtime.trap("Unauthorized: Admin only");
    let ok = NimsLib.listPlantForSale(plants, sideMaps(), plantId, price);
    if (ok) logAdmin(caller, "list_plant_for_sale", "plantId=" # Nat.toText(plantId));
    ok;
  };

  public shared ({ caller }) func delistPlant(plantId : Common.PlantId) : async Bool {
    if (not nimsIsAdmin(caller)) Runtime.trap("Unauthorized: Admin only");
    let ok = NimsLib.delistPlant(plants, plantId);
    if (ok) logAdmin(caller, "delist_plant", "plantId=" # Nat.toText(plantId));
    ok;
  };

  public shared ({ caller }) func updatePlantPrice(
    plantId : Common.PlantId,
    price : Nat,
  ) : async Bool {
    if (not nimsIsAdmin(caller)) Runtime.trap("Unauthorized: Admin only");
    NimsLib.updatePlantPrice(sideMaps(), plants, plantId, price);
  };

  public query ({ caller }) func getAdminInventory(
    stage : ?PlantTypes.PlantStage,
    varietyId : ?Nat,
    forSale : ?Bool,
  ) : async [PlantTypes.PlantLifecycle] {
    if (not nimsIsAdmin(caller)) Runtime.trap("Unauthorized: Admin only");
    NimsLib.filterPlants(plants, sideMaps(), feedings, stage, varietyId, forSale, null);
  };

  public shared ({ caller }) func createNimsTray(
    name : Text,
    date : Common.Timestamp,
    varietyId : ?Nat,
  ) : async Common.TrayId {
    AccessControl.requireAuthenticated(caller);
    let tid = nextTrayId.value;
    ignore PlantsLib.createTray(trays, tid, {
      name;
      planting_date = date;
      nft_standard = #ICRC37;
    });
    trayOwners.add(tid, caller);
    nextTrayId.value += 1;
    ignore varietyId; // stored on plants when cells are planted
    tid;
  };

  public shared ({ caller }) func markCellGerminated(
    trayId : Common.TrayId,
    cellPosition : Nat,
    date : ?Common.Timestamp,
  ) : async PlantTypes.AddPlantResult {
    requireTrayOwnerOrAdmin(caller, trayId);
    let germDate = switch date { case (?d) d; case null Time.now() };
    let entropy = Int.abs(Time.now()) + cellPosition + trayId;
    let assignNft = nimsIsAdmin(caller);
    switch (
      NimsLib.germinateCellInternal(
        plants, trays, varieties, sideMaps(),
        icrc7Owners, icrc7Balances,
        nftClaimTokens, nftClaimPlantIds, plantClaimTokens, nftTokenPlantIds,
        selfPrincipal(), caller,
        trayId, cellPosition, germDate, entropy, assignNft,
      )
    ) {
      case (#err(e)) Runtime.trap(e);
      case (#ok(result)) {
        if (assignNft) {
          logAdmin(caller, "mark_cell_germinated", "tray=" # Nat.toText(trayId) # " cell=" # Nat.toText(cellPosition) # " nft=" # Nat.toText(result.nftTokenId));
        };
        result;
      };
    };
  };

  public shared ({ caller }) func plantSeed(
    trayId : Common.TrayId,
    cellPosition : Nat,
    varietyId : Nat,
    datePlanted : ?Common.Timestamp,
  ) : async DashTypes.PlantSeedResult {
    requireTrayOwnerOrAdmin(caller, trayId);
    switch (
      NimsLib.plantSeedInternal(
        plants, trays, stageHistory, varieties, sideMaps(),
        caller, nextPlantId.value, trayId, cellPosition, varietyId, datePlanted,
      )
    ) {
      case (#err(e)) Runtime.trap(e);
      case (#ok(result)) {
        nextPlantId.value += 1;
        if (nimsIsAdmin(caller)) {
          logAdmin(caller, "plant_seed", "tray=" # Nat.toText(trayId) # " cell=" # Nat.toText(cellPosition));
        };
        result;
      };
    };
  };

  public shared ({ caller }) func markCellDead(
    trayId : Common.TrayId,
    cellPosition : Nat,
    cause : DashTypes.DeathCause,
    notes : ?Text,
    _photoUrl : ?Text,
  ) : async Bool {
    requireTrayOwnerOrAdmin(caller, trayId);
    switch (
      NimsLib.markCellDeadInternal(
        plants, trays, sideMaps(),
        icrc7Owners, icrc7Balances, icrc37Approvals,
        selfPrincipal(), caller, trayId, cellPosition, cause, notes, _photoUrl,
      )
    ) {
      case (#err(e)) Runtime.trap(e);
      case (#ok(ok)) {
        logAdmin(caller, "mark_cell_dead", "tray=" # Nat.toText(trayId) # " cell=" # Nat.toText(cellPosition));
        ok;
      };
    };
  };

  public query func getTrayGrid(trayId : Common.TrayId) : async [DashTypes.TrayCellPublic] {
    NimsLib.getTrayGrid(plants, trays, sideMaps(), trayId);
  };

  public shared ({ caller }) func waterEntireTray(
    trayId : Common.TrayId,
    amountMl : Nat,
    phLevel : ?Float,
    notes : ?Text,
  ) : async Nat {
    requireTrayOwnerOrAdmin(caller, trayId);
    var count : Nat = 0;
    for (pid in NimsLib.plantIdsInTray(trays, trayId).vals()) {
      if (
        NimsLib.addWateringEntry(
          plants, sideMaps(), caller, nimsIsAdmin, pid,
          { timestamp = Time.now(); author = caller; amountMl; phLevel; notes },
        )
      ) count += 1;
    };
    count;
  };

  public shared ({ caller }) func feedEntireTray(
    trayId : Common.TrayId,
    productName : Text,
    nutrientType : Text,
    dosage : Text,
    notes : ?Text,
  ) : async Nat {
    requireTrayOwnerOrAdmin(caller, trayId);
    var count : Nat = 0;
    for (pid in NimsLib.plantIdsInTray(trays, trayId).vals()) {
      switch (plants.get(pid)) {
        case null {};
        case (?_) {
          ignore PlantsLib.addFeedingRecord(
            feedings,
            nextFeedingId.value,
            {
              plant_id = pid;
              date = Time.now();
              product_name = productName;
              nutrient_type = nutrientType;
              dosage_amount = dosage;
              notes;
            },
          );
          nextFeedingId.value += 1;
          count += 1;
        };
      };
    };
    count;
  };

  public shared ({ caller }) func batchWater(
    plantIds : [Common.PlantId],
    amountMl : Nat,
    phLevel : ?Float,
    notes : ?Text,
  ) : async Nat {
    AccessControl.requireAuthenticated(caller);
    var count : Nat = 0;
    for (pid in plantIds.vals()) {
      if (
        NimsLib.addWateringEntry(
          plants, sideMaps(), caller, nimsIsAdmin, pid,
          { timestamp = Time.now(); author = caller; amountMl; phLevel; notes },
        )
      ) count += 1;
    };
    count;
  };

  public shared ({ caller }) func batchFeed(
    plantIds : [Common.PlantId],
    productName : Text,
    nutrientType : Text,
    dosage : Text,
    notes : ?Text,
  ) : async Nat {
    AccessControl.requireAuthenticated(caller);
    var count : Nat = 0;
    for (pid in plantIds.vals()) {
      switch (plants.get(pid)) {
        case null {};
        case (?plant) {
          if (NimsLib.ownerOrAdmin(plant, pid, sideMaps(), caller, nimsIsAdmin)) {
            ignore PlantsLib.addFeedingRecord(
              feedings,
              nextFeedingId.value,
              {
                plant_id = pid;
                date = Time.now();
                product_name = productName;
                nutrient_type = nutrientType;
                dosage_amount = dosage;
                notes;
              },
            );
            nextFeedingId.value += 1;
            count += 1;
          };
        };
      };
    };
    count;
  };

  public shared ({ caller }) func addPurchasedPlantToNims(
    nftTokenId : Nat,
    container : PlantTypes.ContainerSize,
    locationNotes : ?Text,
  ) : async DashTypes.PlantSeedResult {
    AccessControl.requireAuthenticated(caller);
    switch (
      NimsLib.addPurchasedPlantToNimsInternal(
        plants, stageHistory, sideMaps(), nftTokenPlantIds, icrc7Owners,
        caller, nftTokenId, container, locationNotes, nextPlantId.value,
      )
    ) {
      case (#err(e)) Runtime.trap(e);
      case (#ok(result)) {
        nextPlantId.value += 1;
        result;
      };
    };
  };

  // Aliases matching NIMS API naming
  public shared ({ caller }) func logWatering(
    plantId : Common.PlantId,
    amountMl : Nat,
    phLevel : ?Float,
    notes : ?Text,
  ) : async Bool {
    await addWateringEntry(plantId, amountMl, phLevel, notes);
  };

  public shared ({ caller }) func logFeeding(
    plantId : Common.PlantId,
    productName : Text,
    nutrientType : Text,
    dosage : Text,
    notes : ?Text,
  ) : async Bool {
    await addFeedingEntry(plantId, productName, nutrientType, dosage, notes);
  };

  public shared ({ caller }) func logPest(
    plantId : Common.PlantId,
    pestName : Text,
    severity : Text,
    treatment : ?Text,
    notes : ?Text,
  ) : async Bool {
    await addPestEntry(plantId, pestName, severity, treatment, notes);
  };

  // ── Lifecycle entries (owner or admin) ──────────────────────────────────────

  public shared ({ caller }) func addPlantNote(plantId : Common.PlantId, text : Text) : async Bool {
    AccessControl.requireAuthenticated(caller);
    NimsLib.addPlantNote(plants, sideMaps(), caller, nimsIsAdmin, plantId, text);
  };

  public shared ({ caller }) func addWateringEntry(
    plantId : Common.PlantId,
    amountMl : Nat,
    phLevel : ?Float,
    notes : ?Text,
  ) : async Bool {
    AccessControl.requireAuthenticated(caller);
    NimsLib.addWateringEntry(
      plants, sideMaps(), caller, nimsIsAdmin, plantId,
      { timestamp = Time.now(); author = caller; amountMl; phLevel; notes },
    );
  };

  public shared ({ caller }) func addPestEntry(
    plantId : Common.PlantId,
    pestName : Text,
    severity : Text,
    treatment : ?Text,
    notes : ?Text,
  ) : async Bool {
    AccessControl.requireAuthenticated(caller);
    NimsLib.addPestEntry(
      plants, sideMaps(), caller, nimsIsAdmin, plantId,
      { timestamp = Time.now(); author = caller; pestName; severity; treatment; notes },
    );
  };

  public shared ({ caller }) func addNimsPlantPhoto(
    plantId : Common.PlantId,
    url : Text,
    caption : ?Text,
  ) : async Bool {
    AccessControl.requireAuthenticated(caller);
    NimsLib.addPlantPhotoEntry(plants, sideMaps(), caller, nimsIsAdmin, plantId, url, caption);
  };

  public shared ({ caller }) func addFeedingEntry(
    plantId : Common.PlantId,
    productName : Text,
    nutrientType : Text,
    dosage : Text,
    notes : ?Text,
  ) : async Bool {
    AccessControl.requireAuthenticated(caller);
    switch (plants.get(plantId)) {
      case null return false;
      case (?plant) {
        if (not NimsLib.ownerOrAdmin(plant, plantId, sideMaps(), caller, nimsIsAdmin)) {
          Runtime.trap("Unauthorized: must be plant owner or admin");
        };
      };
    };
    ignore PlantsLib.addFeedingRecord(
      feedings,
      nextFeedingId.value,
      {
        plant_id = plantId;
        date = Time.now();
        product_name = productName;
        nutrient_type = nutrientType;
        dosage_amount = dosage;
        notes;
      },
    );
    nextFeedingId.value += 1;
    true;
  };

  public shared ({ caller }) func addWeatherSnapshot(
    plantId : Common.PlantId,
    snapshot : PlantTypes.WeatherSnapshot,
  ) : async Bool {
    AccessControl.requireAuthenticated(caller);
    NimsLib.addWeatherSnapshot(plants, sideMaps(), caller, nimsIsAdmin, plantId, snapshot);
  };

  // ── Queries ─────────────────────────────────────────────────────────────────

  public query ({ caller }) func getMyTrays() : async [PlantTypes.TrayPublic] {
    AccessControl.requireAuthenticated(caller);
    PlantsLib.listTraysForOwner(trays, trayOwners, caller);
  };

  public query func getPlantLifecycle(plantId : Common.PlantId) : async ?PlantTypes.PlantLifecycle {
    NimsLib.buildLifecycle(plants, feedings, sideMaps(), plantId);
  };

  public shared ({ caller }) func getMyPlantsNims() : async [PlantTypes.PlantLifecycle] {
    AccessControl.requireAuthenticated(caller);
    var out : [PlantTypes.PlantLifecycle] = [];
    for ((id, plant) in plants.entries()) {
      let owner = switch (sideMaps().plantOwners.get(id)) {
        case (?o) o;
        case null plant.created_by;
      };
      if (owner == caller) {
        switch (NimsLib.buildLifecycle(plants, feedings, sideMaps(), id)) {
          case (?lc) out := Array.concat(out, [lc]);
          case null {};
        };
      };
    };
    out;
  };

  public query func getPlantByNft(nftTokenId : Nat) : async ?PlantTypes.PlantLifecycle {
    NimsLib.getPlantByNft(plants, feedings, sideMaps(), nftTokenId);
  };

  public query func getPlantsForSale(
    stage : ?PlantTypes.PlantStage,
    varietyId : ?Nat,
  ) : async [PlantTypes.PlantLifecycle] {
    NimsLib.getPlantsForSale(plants, sideMaps(), feedings, stage, varietyId);
  };

  public query func getPlantCount() : async PlantTypes.PlantCountStats {
    NimsLib.getPlantCount(plants);
  };

  public query func getNimsDashboardStats() : async DashTypes.DashboardStats {
    NimsLib.getDashboardStats(plants, feedings, sideMaps());
  };

  public query func getRecentActivity(limit : Nat) : async [DashTypes.ActivityEntry] {
    NimsLib.getRecentActivity(plants, feedings, sideMaps(), limit);
  };

  public query func getPlantHealth(plantId : Common.PlantId) : async ?DashTypes.PlantHealth {
    NimsLib.getPlantHealth(plants, feedings, sideMaps(), plantId);
  };

  public query func getPlantsByContainer(
    container : PlantTypes.ContainerSize,
  ) : async [PlantTypes.PlantLifecycle] {
    NimsLib.getPlantsByContainer(plants, sideMaps(), feedings, container);
  };

  public query func getNftPoolStatus() : async { available : Nat; total : Nat } {
    let canister = selfPrincipal();
    let available = NftPool.collectAvailable(icrc7Owners, canister).size();
    { available; total = 7838 + 162 }; // non-PepperHead plant pool size
  };

  // ── Purchase ────────────────────────────────────────────────────────────────

  public shared ({ caller }) func purchasePlant(
    plantId : Common.PlantId,
    token : IcrcPayment.PaymentToken,
    amount : Nat,
  ) : async PlantTypes.PurchasePlantResult {
    AccessControl.requireAuthenticated(caller);
    switch (CallerGuard.acquire(callerGuards, caller)) {
      case (#err(e)) { Runtime.trap("Request already in flight: " # e) };
      case (#ok) {};
    };
    try {
      let result = await doPurchasePlant(caller, plantId, token, amount);
      CallerGuard.release(callerGuards, caller);
      result;
    } catch (e) {
      CallerGuard.release(callerGuards, caller);
      { success = false; nftTokenId = null; claimToken = null; message = "Purchase failed" };
    };
  };

  func doPurchasePlant(
    caller : Principal,
    plantId : Common.PlantId,
    token : IcrcPayment.PaymentToken,
    amount : Nat,
  ) : async PlantTypes.PurchasePlantResult {
    let plant = switch (plants.get(plantId)) {
      case null return { success = false; nftTokenId = null; claimToken = null; message = "Plant not found" };
      case (?p) p;
    };
    if (not plant.for_sale or plant.sold) {
      return { success = false; nftTokenId = null; claimToken = null; message = "Plant not for sale" };
    };
    let expected = NimsLib.centsToStablecoinBase(NimsLib.getPriceCents(sideMaps(), plant));
    if (amount != expected) {
      return {
        success = false;
        nftTokenId = null;
        claimToken = null;
        message = "Payment amount mismatch: expected " # Nat.toText(expected);
      };
    };
    // Only stablecoins for now
    switch (token) {
      case (#ckUSDC) {};
      case (#ckUSDT) {};
      case (_) {
        return {
          success = false;
          nftTokenId = null;
          claimToken = null;
          message = "Only ckUSDC/ckUSDT supported — volatile tokens coming soon";
        };
      };
    };
    let canister = selfPrincipal();
    switch (
      await IcrcPayment.transferFrom(
        token,
        caller,
        canister,
        amount,
        ?Nat64.fromNat(Int.abs(Time.now())),
        ?("plant:" # Nat.toText(plantId)).encodeUtf8(),
      )
    ) {
      case (#err(e)) return { success = false; nftTokenId = null; claimToken = null; message = e };
      case (#ok(_block)) {};
    };
    switch (NimsLib.settlePlantPurchase(
      plants, sideMaps(), icrc7Owners, icrc7Balances, icrc37Approvals,
      nftClaimTokens, plantClaimTokens, canister, caller, plantId,
    )) {
      case (#err(e)) return { success = false; nftTokenId = null; claimToken = null; message = e };
      case (#ok(settled)) {
        logAdmin(caller, "plant_purchased", "plantId=" # Nat.toText(plantId) # " nft=" # Nat.toText(settled.nftTokenId));
        {
          success = true;
          nftTokenId = ?settled.nftTokenId;
          claimToken = ?settled.claimToken;
          message = "Plant purchased — NFT #" # Nat.toText(settled.nftTokenId) # " transferred";
        };
      };
    };
  };

};
