// lib/nims.mo — Phase 6 NIMS plant inventory + lifecycle helpers.
//
// Uses existing Plant record fields where possible; extended data lives in
// side maps (varietyId, price, logs) to preserve stable-memory compatibility.

import Map "mo:core/Map";
import Set "mo:core/Set";
import List "mo:core/List";
import Nat "mo:core/Nat";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Int "mo:core/Int";
import Principal "mo:core/Principal";
import Array "mo:core/Array";
import Iter "mo:core/Iter";
import Runtime "mo:core/Runtime";
import Result "mo:core/Result";
import Common "../types/common";
import Types "../types/plants";
import VarietyTypes "../types/variety";
import ICRC7 "../types/icrc7";
import ICRC7Lib "../lib/icrc7";
import NftPool "../lib/nft-pool";
import PlantsLib "../lib/plants";
import NftClaim "../lib/nft-claim";
import ClaimTypes "../types/claim";
import IcrcPayment "../lib/icrc-payment";
import ICRC37Lib "../lib/icrc37";
import DashTypes "../types/nims-dashboard";

module {
  public type SideMaps = {
    plantVarietyIds : Map.Map<Common.PlantId, Nat>;
    plantOwners : Map.Map<Common.PlantId, Principal>;
    plantPrices : Map.Map<Common.PlantId, Nat>;
    plantSoldAt : Map.Map<Common.PlantId, Common.Timestamp>;
    plantTransplantedOneGal : Map.Map<Common.PlantId, Common.Timestamp>;
    plantTransplantedFiveGal : Map.Map<Common.PlantId, Common.Timestamp>;
    plantNotesLog : Map.Map<Common.PlantId, List.List<Types.PlantNote>>;
    plantWateringLog : Map.Map<Common.PlantId, List.List<Types.WateringEntry>>;
    plantPestLog : Map.Map<Common.PlantId, List.List<Types.PestEntry>>;
    plantPhotoLog : Map.Map<Common.PlantId, List.List<Types.PlantPhotoEntry>>;
    plantWeatherSnapshots : Map.Map<Common.PlantId, List.List<Types.WeatherSnapshot>>;
  };

  public func defaultStagePriceCents(stage : Types.PlantStage) : Nat {
    switch stage {
      case (#Seed) 500;
      case (#Seedling) 2500;
      case (#Mature) 4500;
    };
  };

  public func ownerOrAdmin(
    plant : Types.Plant,
    plantId : Common.PlantId,
    side : SideMaps,
    caller : Principal,
    adminCheck : Principal -> Bool,
  ) : Bool {
    if (adminCheck(caller)) return true;
    switch (side.plantOwners.get(plantId)) {
      case (?o) o == caller;
      case null plant.created_by == caller;
    };
  };

  public func getPriceCents(
    side : SideMaps,
    plant : Types.Plant,
  ) : Nat {
    switch (side.plantPrices.get(plant.id)) {
      case (?p) p;
      case null defaultStagePriceCents(plant.stage);
    };
  };

  public func nftTokenIdOf(plant : Types.Plant) : ?Nat {
    switch (plant.nft_id) {
      case null null;
      case (?t) {
        switch (Nat.fromText(t)) {
          case (?n) ?n;
          case null null;
        };
      };
    };
  };

  public func setNftTokenId(plant : Types.Plant, tokenId : Nat) {
    plant.nft_id := ?Nat.toText(tokenId);
  };

  func appendNote(side : SideMaps, plantId : Common.PlantId, note : Types.PlantNote) {
    let list = switch (side.plantNotesLog.get(plantId)) {
      case (?l) l;
      case null {
        let l = List.empty<Types.PlantNote>();
        side.plantNotesLog.add(plantId, l);
        l;
      };
    };
    list.add(note);
  };

  func listToArrayNotes(l : List.List<Types.PlantNote>) : [Types.PlantNote] {
    l.toArray();
  };

  func listToArrayWatering(l : List.List<Types.WateringEntry>) : [Types.WateringEntry] {
    l.toArray();
  };

  func listToArrayPest(l : List.List<Types.PestEntry>) : [Types.PestEntry] {
    l.toArray();
  };

  func listToArrayPhotos(l : List.List<Types.PlantPhotoEntry>) : [Types.PlantPhotoEntry] {
    l.toArray();
  };

  func listToArrayWeather(l : List.List<Types.WeatherSnapshot>) : [Types.WeatherSnapshot] {
    l.toArray();
  };

  public func buildLifecycle(
    plants : Map.Map<Common.PlantId, Types.Plant>,
    feedings : Map.Map<Common.FeedingId, Types.Feeding>,
    side : SideMaps,
    plantId : Common.PlantId,
  ) : ?Types.PlantLifecycle {
    switch (plants.get(plantId)) {
      case null null;
      case (?plant) {
        let notes = switch (side.plantNotesLog.get(plantId)) {
          case (?l) listToArrayNotes(l);
          case null [];
        };
        let watering = switch (side.plantWateringLog.get(plantId)) {
          case (?l) listToArrayWatering(l);
          case null [];
        };
        let pests = switch (side.plantPestLog.get(plantId)) {
          case (?l) listToArrayPest(l);
          case null [];
        };
        let photos = switch (side.plantPhotoLog.get(plantId)) {
          case (?l) listToArrayPhotos(l);
          case null [];
        };
        let weather = switch (side.plantWeatherSnapshots.get(plantId)) {
          case (?l) listToArrayWeather(l);
          case null [];
        };
        let feedingLog = Iter.toArray(
          Iter.map(
            Iter.filter(
              feedings.values(),
              func(f : Types.Feeding) : Bool { f.plant_id == plantId },
            ),
            PlantsLib.feedingToPublic,
          ),
        );
        ?{
          plant = PlantsLib.toPublic(plant);
          varietyId = side.plantVarietyIds.get(plantId);
          nftTokenId = nftTokenIdOf(plant);
          priceCents = if (plant.for_sale or plant.sold) {
            ?getPriceCents(side, plant);
          } else {
            switch (side.plantPrices.get(plantId)) { case (?p) ?p; case null null };
          };
          soldAt = side.plantSoldAt.get(plantId);
          notes;
          feedingLog;
          wateringLog = watering;
          pestLog = pests;
          photos;
          weatherSnapshots = weather;
        };
      };
    };
  };

  public func getPlantByNft(
    plants : Map.Map<Common.PlantId, Types.Plant>,
    feedings : Map.Map<Common.FeedingId, Types.Feeding>,
    side : SideMaps,
    nftTokenId : Nat,
  ) : ?Types.PlantLifecycle {
    let needle = Nat.toText(nftTokenId);
    for ((id, plant) in plants.entries()) {
      switch (plant.nft_id) {
        case (?t) {
          if (t == needle) {
            return buildLifecycle(plants, feedings, side, id);
          };
        };
        case null {};
      };
    };
    null;
  };

  public func getPlantCount(
    plants : Map.Map<Common.PlantId, Types.Plant>,
  ) : Types.PlantCountStats {
    var total : Nat = 0;
    var forSale : Nat = 0;
    var sold : Nat = 0;
    var seedCount : Nat = 0;
    var seedlingCount : Nat = 0;
    var matureCount : Nat = 0;
    for ((_, p) in plants.entries()) {
      total += 1;
      if (p.for_sale and not p.sold) forSale += 1;
      if (p.sold) sold += 1;
      switch (p.stage) {
        case (#Seed) seedCount += 1;
        case (#Seedling) seedlingCount += 1;
        case (#Mature) matureCount += 1;
      };
    };
    {
      total;
      forSale;
      sold;
      byStage = [
        (#Seed, seedCount),
        (#Seedling, seedlingCount),
        (#Mature, matureCount),
      ];
    };
  };

  public func validateTrayCell(
    trays : Map.Map<Common.TrayId, Types.Tray>,
    trayId : ?Common.TrayId,
    cellPosition : ?Nat,
  ) {
    switch (trayId, cellPosition) {
      case (null, null) {};
      case (?tid, ?pos) {
        switch (trays.get(tid)) {
          case null Runtime.trap("Tray not found");
          case (?tray) {
            if (pos < 1 or pos > 72) Runtime.trap("Cell position must be 1-72");
            switch (tray.cells[pos - 1]) {
              case (?_) Runtime.trap("Tray cell already occupied");
              case null {};
            };
          };
        };
      };
      case _ Runtime.trap("trayId and cellPosition must both be set or both null");
    };
  };

  public func addPlantInternal(
    plants : Map.Map<Common.PlantId, Types.Plant>,
    trays : Map.Map<Common.TrayId, Types.Tray>,
    stageHistory : Map.Map<Common.PlantId, List.List<Types.StageHistory>>,
    varieties : Map.Map<Nat, VarietyTypes.Variety>,
    side : SideMaps,
    icrc7Owners : Map.Map<Nat, ICRC7.Account>,
    icrc7Balances : Map.Map<Principal, Set.Set<Nat>>,
    nftClaimTokens : Map.Map<Text, ClaimTypes.NftClaimEntry>,
    nftClaimPlantIds : Map.Map<Text, Common.PlantId>,
    plantClaimTokens : Map.Map<Common.PlantId, Text>,
    nftTokenPlantIds : Map.Map<Nat, Common.PlantId>,
    canister : Principal,
    admin : Principal,
    nextPlantId : Nat,
    varietyId : Nat,
    stage : Types.PlantStage,
    trayId : ?Common.TrayId,
    cellPosition : ?Nat,
    priceCents : ?Nat,
    entropy : Nat,
  ) : Result.Result<Types.AddPlantResult, Text> {
    switch (varieties.get(varietyId)) {
      case null return #err("Variety not found");
      case (?variety) {};
    };
    validateTrayCell(trays, trayId, cellPosition);
    let tokenId = switch (NftPool.pickRandomAvailableNft(icrc7Owners, canister, entropy, [])) {
      case null return #err("No NFTs available in plant pool");
      case (?t) t;
    };
    let canisterAccount : ICRC7.Account = { owner = canister; subaccount = null };
    let adminAccount : ICRC7.Account = { owner = admin; subaccount = null };
    switch (ICRC7Lib.assignOwnership(icrc7Owners, icrc7Balances, tokenId, ?canisterAccount, adminAccount)) {
      case (#err(e)) return #err("NFT assign failed: " # e);
      case (#ok) {};
    };
    let tid = switch trayId { case (?t) t; case null 0 };
    let pos = switch cellPosition { case (?p) p; case null 0 };
    let input : Types.CreatePlantInput = {
      variety = switch (varieties.get(varietyId)) { case (?v) v.name; case null "" };
      genetics = "";
      tray_id = tid;
      cell_position = pos;
      planting_date = Time.now();
      date_purchased = null;
      nft_standard = #ICRC37;
      notes = "";
      common_name = null;
      latin_name = ?(switch (varieties.get(varietyId)) { case (?v) v.species; case null "" });
      origin = ?"Port Charlotte, FL";
      watering_schedule = null;
      pest_notes = null;
      additional_notes = null;
      container_size = null;
      source_plant_id = null;
    };
    let plant = PlantsLib.createPlant(plants, trays, stageHistory, nextPlantId, input, admin);
    plant.stage := stage;
    setNftTokenId(plant, tokenId);
    side.plantVarietyIds.add(nextPlantId, varietyId);
    side.plantOwners.add(nextPlantId, admin);
    switch (priceCents) {
      case (?p) side.plantPrices.add(nextPlantId, p);
      case null {};
    };
    let claimToken = NftClaim.registerClaimToken(
      nftClaimTokens,
      nftClaimPlantIds,
      plantClaimTokens,
      nftTokenPlantIds,
      tokenId,
      ?nextPlantId,
    );
    #ok({ plantId = nextPlantId; nftTokenId = tokenId; claimToken });
  };

  /// Mark plant sold when customer redeems in-person QR claim.
  public func markPlantClaimedViaQr(
    plants : Map.Map<Common.PlantId, Types.Plant>,
    side : SideMaps,
    plantId : Common.PlantId,
    buyer : Principal,
  ) : Bool {
    switch (plants.get(plantId)) {
      case null false;
      case (?plant) {
        let now = Time.now();
        plant.sold := true;
        plant.sold_to := ?buyer;
        plant.for_sale := false;
        side.plantOwners.add(plantId, buyer);
        side.plantSoldAt.add(plantId, now);
        true
      };
    };
  };

  public func getPlantIdForNftToken(
    nftTokenPlantIds : Map.Map<Nat, Common.PlantId>,
    plants : Map.Map<Common.PlantId, Types.Plant>,
    tokenId : Nat,
  ) : ?Common.PlantId {
    NftClaim.findPlantIdByTokenId(nftTokenPlantIds, plants, tokenId)
  };

  public func removePlant(
    plants : Map.Map<Common.PlantId, Types.Plant>,
    side : SideMaps,
    icrc7Owners : Map.Map<Nat, ICRC7.Account>,
    icrc7Balances : Map.Map<Principal, Set.Set<Nat>>,
    icrc37Approvals : ICRC37Lib.ApprovalsMap,
    canister : Principal,
    plantId : Common.PlantId,
  ) : Bool {
    switch (plants.get(plantId)) {
      case null false;
      case (?plant) {
        if (plant.sold) Runtime.trap("Cannot remove sold plant");
        switch (nftTokenIdOf(plant)) {
          case (?tokenId) {
            let canisterAccount : ICRC7.Account = { owner = canister; subaccount = null };
            let fromAccount = switch (icrc7Owners.get(tokenId)) {
              case (?a) a;
              case null Runtime.trap("NFT owner not found");
            };
            switch (ICRC7Lib.assignOwnership(icrc7Owners, icrc7Balances, tokenId, ?fromAccount, canisterAccount)) {
              case (#err(e)) Runtime.trap("Return NFT to pool failed: " # e);
              case (#ok) {};
            };
            ignore ICRC37Lib.removeAllApprovals(icrc37Approvals, tokenId);
          };
          case null {};
        };
        ignore plants.delete(plantId);
        ignore side.plantVarietyIds.delete(plantId);
        ignore side.plantPrices.delete(plantId);
        true;
      };
    };
  };

  public func updatePlantStageInternal(
    plants : Map.Map<Common.PlantId, Types.Plant>,
    stageHistory : Map.Map<Common.PlantId, List.List<Types.StageHistory>>,
    side : SideMaps,
    plantId : Common.PlantId,
    newStage : Types.PlantStage,
  ) : Bool {
    switch (plants.get(plantId)) {
      case null false;
      case (?plant) {
        let now = Time.now();
        PlantsLib.updatePlantStage(plants, stageHistory, plantId, newStage, "Stage updated");
        switch (newStage) {
          case (#Seedling) side.plantTransplantedOneGal.add(plantId, now);
          case (#Mature) side.plantTransplantedFiveGal.add(plantId, now);
          case (#Seed) {};
        };
        true;
      };
    };
  };

  public func listPlantForSale(
    plants : Map.Map<Common.PlantId, Types.Plant>,
    side : SideMaps,
    plantId : Common.PlantId,
    priceCents : ?Nat,
  ) : Bool {
    switch (plants.get(plantId)) {
      case null false;
      case (?plant) {
        if (plant.sold) Runtime.trap("Plant already sold");
        let price = switch priceCents {
          case (?p) p;
          case null defaultStagePriceCents(plant.stage);
        };
        side.plantPrices.add(plantId, price);
        plant.for_sale := true;
        true;
      };
    };
  };

  public func delistPlant(
    plants : Map.Map<Common.PlantId, Types.Plant>,
    plantId : Common.PlantId,
  ) : Bool {
    switch (plants.get(plantId)) {
      case null false;
      case (?plant) {
        plant.for_sale := false;
        true;
      };
    };
  };

  public func updatePlantPrice(
    side : SideMaps,
    plants : Map.Map<Common.PlantId, Types.Plant>,
    plantId : Common.PlantId,
    priceCents : Nat,
  ) : Bool {
    switch (plants.get(plantId)) {
      case null false;
      case (?_) {
        side.plantPrices.add(plantId, priceCents);
        true;
      };
    };
  };

  public func filterPlants(
    plants : Map.Map<Common.PlantId, Types.Plant>,
    side : SideMaps,
    feedings : Map.Map<Common.FeedingId, Types.Feeding>,
    stageFilter : ?Types.PlantStage,
    varietyFilter : ?Nat,
    forSaleFilter : ?Bool,
    soldFilter : ?Bool,
  ) : [Types.PlantLifecycle] {
    var out : [Types.PlantLifecycle] = [];
    for ((id, plant) in plants.entries()) {
      let stageOk = switch stageFilter {
        case null true;
        case (?s) plant.stage == s;
      };
      let varietyOk = switch varietyFilter {
        case null true;
        case (?vid) {
          switch (side.plantVarietyIds.get(id)) {
            case (?v) v == vid;
            case null false;
          };
        };
      };
      let saleOk = switch forSaleFilter {
        case null true;
        case (?f) plant.for_sale == f;
      };
      let soldOk = switch soldFilter {
        case null true;
        case (?s) plant.sold == s;
      };
      if (stageOk and varietyOk and saleOk and soldOk) {
        switch (buildLifecycle(plants, feedings, side, id)) {
          case (?lc) out := Array.concat(out, [lc]);
          case null {};
        };
      };
    };
    out;
  };

  public func getPlantsForSale(
    plants : Map.Map<Common.PlantId, Types.Plant>,
    side : SideMaps,
    feedings : Map.Map<Common.FeedingId, Types.Feeding>,
    stageFilter : ?Types.PlantStage,
    varietyFilter : ?Nat,
  ) : [Types.PlantLifecycle] {
    filterPlants(plants, side, feedings, stageFilter, varietyFilter, ?true, ?false);
  };

  public func addPlantNote(
    plants : Map.Map<Common.PlantId, Types.Plant>,
    side : SideMaps,
    caller : Principal,
    adminCheck : Principal -> Bool,
    plantId : Common.PlantId,
    text : Text,
  ) : Bool {
    switch (plants.get(plantId)) {
      case null false;
      case (?plant) {
        if (not ownerOrAdmin(plant, plantId, side, caller, adminCheck)) {
          Runtime.trap("Unauthorized: must be plant owner or admin");
        };
        appendNote(side, plantId, { timestamp = Time.now(); author = caller; text });
        true;
      };
    };
  };

  public func addWateringEntry(
    plants : Map.Map<Common.PlantId, Types.Plant>,
    side : SideMaps,
    caller : Principal,
    adminCheck : Principal -> Bool,
    plantId : Common.PlantId,
    entry : Types.WateringEntry,
  ) : Bool {
    switch (plants.get(plantId)) {
      case null false;
      case (?plant) {
        if (not ownerOrAdmin(plant, plantId, side, caller, adminCheck)) {
          Runtime.trap("Unauthorized: must be plant owner or admin");
        };
        let list = switch (side.plantWateringLog.get(plantId)) {
          case (?l) l;
          case null {
            let l = List.empty<Types.WateringEntry>();
            side.plantWateringLog.add(plantId, l);
            l;
          };
        };
        list.add(entry);
        true;
      };
    };
  };

  public func addPestEntry(
    plants : Map.Map<Common.PlantId, Types.Plant>,
    side : SideMaps,
    caller : Principal,
    adminCheck : Principal -> Bool,
    plantId : Common.PlantId,
    entry : Types.PestEntry,
  ) : Bool {
    switch (plants.get(plantId)) {
      case null false;
      case (?plant) {
        if (not ownerOrAdmin(plant, plantId, side, caller, adminCheck)) {
          Runtime.trap("Unauthorized: must be plant owner or admin");
        };
        let list = switch (side.plantPestLog.get(plantId)) {
          case (?l) l;
          case null {
            let l = List.empty<Types.PestEntry>();
            side.plantPestLog.add(plantId, l);
            l;
          };
        };
        list.add(entry);
        true;
      };
    };
  };

  public func addPlantPhotoEntry(
    plants : Map.Map<Common.PlantId, Types.Plant>,
    side : SideMaps,
    caller : Principal,
    adminCheck : Principal -> Bool,
    plantId : Common.PlantId,
    url : Text,
    caption : ?Text,
  ) : Bool {
    switch (plants.get(plantId)) {
      case null false;
      case (?plant) {
        if (not ownerOrAdmin(plant, plantId, side, caller, adminCheck)) {
          Runtime.trap("Unauthorized: must be plant owner or admin");
        };
        let list = switch (side.plantPhotoLog.get(plantId)) {
          case (?l) l;
          case null {
            let l = List.empty<Types.PlantPhotoEntry>();
            side.plantPhotoLog.add(plantId, l);
            l;
          };
        };
        list.add({ timestamp = Time.now(); author = caller; url; caption });
        true;
      };
    };
  };

  public func addWeatherSnapshot(
    plants : Map.Map<Common.PlantId, Types.Plant>,
    side : SideMaps,
    caller : Principal,
    adminCheck : Principal -> Bool,
    plantId : Common.PlantId,
    snapshot : Types.WeatherSnapshot,
  ) : Bool {
    switch (plants.get(plantId)) {
      case null false;
      case (?plant) {
        if (not ownerOrAdmin(plant, plantId, side, caller, adminCheck)) {
          Runtime.trap("Unauthorized: must be plant owner or admin");
        };
        let list = switch (side.plantWeatherSnapshots.get(plantId)) {
          case (?l) l;
          case null {
            let l = List.empty<Types.WeatherSnapshot>();
            side.plantWeatherSnapshots.add(plantId, l);
            l;
          };
        };
        list.add(snapshot);
        true;
      };
    };
  };

  public func settlePlantPurchase(
    plants : Map.Map<Common.PlantId, Types.Plant>,
    side : SideMaps,
    icrc7Owners : Map.Map<Nat, ICRC7.Account>,
    icrc7Balances : Map.Map<Principal, Set.Set<Nat>>,
    icrc37Approvals : ICRC37Lib.ApprovalsMap,
    nftClaimTokens : Map.Map<Text, ClaimTypes.NftClaimEntry>,
    plantClaimTokens : Map.Map<Common.PlantId, Text>,
    canister : Principal,
    buyer : Principal,
    plantId : Common.PlantId,
  ) : Result.Result<{ nftTokenId : Nat; claimToken : Text }, Text> {
    let plant = switch (plants.get(plantId)) {
      case null return #err("Plant not found");
      case (?p) p;
    };
    if (not plant.for_sale or plant.sold) return #err("Plant not available for sale");
    let tokenId = switch (nftTokenIdOf(plant)) {
      case null return #err("Plant has no NFT assigned");
      case (?t) t;
    };
    let priceCents = getPriceCents(side, plant);
    ignore priceCents; // validated by caller (ICRC-2 amount or ICPay)
    // Find current owner (admin) of NFT
    let sellerAccount = switch (icrc7Owners.get(tokenId)) {
      case null return #err("NFT owner not found");
      case (?a) a;
    };
    let buyerAccount : ICRC7.Account = { owner = buyer; subaccount = null };
    switch (ICRC7Lib.assignOwnership(icrc7Owners, icrc7Balances, tokenId, ?sellerAccount, buyerAccount)) {
      case (#err(e)) return #err("NFT transfer failed: " # e);
      case (#ok) {};
    };
    ignore ICRC37Lib.removeAllApprovals(icrc37Approvals, tokenId);
    let now = Time.now();
    plant.sold := true;
    plant.sold_to := ?buyer;
    plant.for_sale := false;
    side.plantOwners.add(plantId, buyer);
    side.plantSoldAt.add(plantId, now);
    let claimToken = switch (plantClaimTokens.get(plantId)) {
      case (?t) {
        switch (nftClaimTokens.get(t)) {
          case (?entry) entry.redeemed := true;
          case null {};
        };
        t
      };
      case null "";
    };
    #ok({ nftTokenId = tokenId; claimToken });
  };

  /// Stablecoin amount: ckUSDC/ckUSDT use 6 decimals; price in cents → base units.
  public func centsToStablecoinBase(cents : Nat) : Nat {
    cents * 10_000; // $1.00 = 100 cents → 1_000_000 base units
  };

  // ── NIMS dashboard helpers ───────────────────────────────────────────────────

  func nsPerDay() : Int { 86_400_000_000_000 };

  func daysBetween(from : Common.Timestamp, to : Common.Timestamp) : Nat {
    let diff = Int.abs(to - from);
    let days = diff / nsPerDay();
    if (days <= 0) 0 else Nat.fromInt(days);
  };

  public func cellStatusForPlant(plant : Types.Plant) : DashTypes.CellStatus {
    if (plant.is_cooked) return #Dead;
    if (plant.is_transplanted) return #Transplanted;
    switch (plant.germination_date) {
      case (?_) #Germinated;
      case null #Planted;
    };
  };

  public func getTrayGrid(
    plants : Map.Map<Common.PlantId, Types.Plant>,
    trays : Map.Map<Common.TrayId, Types.Tray>,
    side : SideMaps,
    trayId : Common.TrayId,
  ) : [DashTypes.TrayCellPublic] {
    let tray = switch (trays.get(trayId)) {
      case null return [];
      case (?t) t;
    };
    let now = Time.now();
    Array.tabulate<DashTypes.TrayCellPublic>(72, func(i : Nat) {
      let pos = i + 1;
      switch (tray.cells[i]) {
        case null {
          { position = pos; status = #Empty; plantId = null; varietyName = null; plantedAt = null; germinatedAt = null; nftTokenId = null; daysSincePlanted = null };
        };
        case (?pid) {
          switch (plants.get(pid)) {
            case null {
              { position = pos; status = #Empty; plantId = null; varietyName = null; plantedAt = null; germinatedAt = null; nftTokenId = null; daysSincePlanted = null };
            };
            case (?plant) {
              let status = cellStatusForPlant(plant);
              let varietyName = switch (side.plantVarietyIds.get(pid)) {
                case null ?plant.variety;
                case (?vid) ?plant.variety;
              };
              {
                position = pos;
                status;
                plantId = ?pid;
                varietyName;
                plantedAt = ?plant.planting_date;
                germinatedAt = plant.germination_date;
                nftTokenId = nftTokenIdOf(plant);
                daysSincePlanted = ?daysBetween(plant.planting_date, now);
              };
            };
          };
        };
      };
    });
  };

  public func plantSeedInternal(
    plants : Map.Map<Common.PlantId, Types.Plant>,
    trays : Map.Map<Common.TrayId, Types.Tray>,
    stageHistory : Map.Map<Common.PlantId, List.List<Types.StageHistory>>,
    varieties : Map.Map<Nat, VarietyTypes.Variety>,
    side : SideMaps,
    admin : Principal,
    nextPlantId : Nat,
    trayId : Common.TrayId,
    cellPosition : Nat,
    varietyId : Nat,
    datePlanted : ?Common.Timestamp,
  ) : Result.Result<DashTypes.PlantSeedResult, Text> {
    switch (varieties.get(varietyId)) {
      case null return #err("Variety not found");
      case (?variety) {};
    };
    validateTrayCell(trays, ?trayId, ?cellPosition);
    let plantedAt = switch datePlanted { case (?d) d; case null Time.now() };
    let input : Types.CreatePlantInput = {
      variety = switch (varieties.get(varietyId)) { case (?v) v.name; case null "" };
      genetics = "";
      tray_id = trayId;
      cell_position = cellPosition;
      planting_date = plantedAt;
      date_purchased = null;
      nft_standard = #ICRC37;
      notes = "";
      common_name = null;
      latin_name = ?(switch (varieties.get(varietyId)) { case (?v) v.species; case null "" });
      origin = ?"Port Charlotte, FL";
      watering_schedule = null;
      pest_notes = null;
      additional_notes = null;
      container_size = null;
      source_plant_id = null;
    };
    let plant = PlantsLib.createPlant(plants, trays, stageHistory, nextPlantId, input, admin);
    plant.stage := #Seed;
    side.plantVarietyIds.add(nextPlantId, varietyId);
    side.plantOwners.add(nextPlantId, admin);
    #ok({ plantId = nextPlantId });
  };

  public func germinateCellInternal(
    plants : Map.Map<Common.PlantId, Types.Plant>,
    trays : Map.Map<Common.TrayId, Types.Tray>,
    varieties : Map.Map<Nat, VarietyTypes.Variety>,
    side : SideMaps,
    icrc7Owners : Map.Map<Nat, ICRC7.Account>,
    icrc7Balances : Map.Map<Principal, Set.Set<Nat>>,
    nftClaimTokens : Map.Map<Text, ClaimTypes.NftClaimEntry>,
    nftClaimPlantIds : Map.Map<Text, Common.PlantId>,
    plantClaimTokens : Map.Map<Common.PlantId, Text>,
    nftTokenPlantIds : Map.Map<Nat, Common.PlantId>,
    canister : Principal,
    admin : Principal,
    trayId : Common.TrayId,
    cellPosition : Nat,
    germDate : Common.Timestamp,
    entropy : Nat,
  ) : Result.Result<Types.AddPlantResult, Text> {
    let tray = switch (trays.get(trayId)) {
      case null return #err("Tray not found");
      case (?t) t;
    };
    if (cellPosition < 1 or cellPosition > 72) return #err("Cell position must be 1-72");
    let plantId = switch (tray.cells[cellPosition - 1]) {
      case null return #err("Cell is empty — plant a seed first");
      case (?pid) pid;
    };
    let plant = switch (plants.get(plantId)) {
      case null return #err("Plant not found");
      case (?p) p;
    };
    if (plant.is_cooked) return #err("Plant is dead");
    if (plant.is_transplanted) return #err("Plant already transplanted");
    switch (nftTokenIdOf(plant)) {
      case (?_) return #err("Plant already has an NFT assigned");
      case null {};
    };
    let tokenId = switch (NftPool.pickRandomAvailableNft(icrc7Owners, canister, entropy, [])) {
      case null return #err("No NFTs available in plant pool");
      case (?t) t;
    };
    let canisterAccount : ICRC7.Account = { owner = canister; subaccount = null };
    let adminAccount : ICRC7.Account = { owner = admin; subaccount = null };
    switch (ICRC7Lib.assignOwnership(icrc7Owners, icrc7Balances, tokenId, ?canisterAccount, adminAccount)) {
      case (#err(e)) return #err("NFT assign failed: " # e);
      case (#ok) {};
    };
    setNftTokenId(plant, tokenId);
    plant.germination_date := ?germDate;
    plant.stage := #Seedling;
    let claimToken = NftClaim.registerClaimToken(
      nftClaimTokens,
      nftClaimPlantIds,
      plantClaimTokens,
      nftTokenPlantIds,
      tokenId,
      ?plantId,
    );
    #ok({ plantId; nftTokenId = tokenId; claimToken });
  };

  public func markCellDeadInternal(
    plants : Map.Map<Common.PlantId, Types.Plant>,
    trays : Map.Map<Common.TrayId, Types.Tray>,
    side : SideMaps,
    icrc7Owners : Map.Map<Nat, ICRC7.Account>,
    icrc7Balances : Map.Map<Principal, Set.Set<Nat>>,
    icrc37Approvals : ICRC37Lib.ApprovalsMap,
    canister : Principal,
    caller : Principal,
    trayId : Common.TrayId,
    cellPosition : Nat,
    cause : DashTypes.DeathCause,
    notes : ?Text,
    photoUrl : ?Text,
  ) : Result.Result<Bool, Text> {
    let tray = switch (trays.get(trayId)) {
      case null return #err("Tray not found");
      case (?t) t;
    };
    if (cellPosition < 1 or cellPosition > 72) return #err("Cell position must be 1-72");
    let plantId = switch (tray.cells[cellPosition - 1]) {
      case null return #err("Cell is empty");
      case (?pid) pid;
    };
    let plant = switch (plants.get(plantId)) {
      case null return #err("Plant not found");
      case (?p) p;
    };
    plant.is_cooked := true;
    switch (nftTokenIdOf(plant)) {
      case (?tokenId) {
        let canisterAccount : ICRC7.Account = { owner = canister; subaccount = null };
        let fromAccount = switch (icrc7Owners.get(tokenId)) {
          case (?a) a;
          case null return #err("NFT owner not found");
        };
        switch (ICRC7Lib.assignOwnership(icrc7Owners, icrc7Balances, tokenId, ?fromAccount, canisterAccount)) {
          case (#err(e)) return #err("Return NFT to pool failed: " # e);
          case (#ok) {};
        };
        ignore ICRC37Lib.removeAllApprovals(icrc37Approvals, tokenId);
        plant.nft_id := null;
      };
      case null {};
    };
    let causeText = switch cause {
      case (#DampingOff) "Damping off";
      case (#PestDamage) "Pest damage";
      case (#Drought) "Drought";
      case (#Disease) "Disease";
      case (#Overwatering) "Overwatering";
      case (#Unknown) "Unknown";
      case (#Other) "Other";
    };
    let noteSuffix = switch notes { case (?n) " — " # n; case null "" };
    let detail = "Marked dead: " # causeText # noteSuffix;
    appendNote(side, plantId, { timestamp = Time.now(); author = plant.created_by; text = detail });
    switch (photoUrl) {
      case (?url) {
        ignore addPlantPhotoEntry(
          plants, side, caller,
          func (_) { true },
          plantId, url, ?"Death record",
        );
      };
      case null {};
    };
    #ok(true);
  };

  public func plantIdsInTray(
    trays : Map.Map<Common.TrayId, Types.Tray>,
    trayId : Common.TrayId,
  ) : [Common.PlantId] {
    switch (trays.get(trayId)) {
      case null [];
      case (?tray) {
        var ids : [Common.PlantId] = [];
        for (cell in tray.cells.vals()) {
          switch cell {
            case (?pid) ids := Array.concat(ids, [pid]);
            case null {};
          };
        };
        ids;
      };
    };
  };

  public func getRecentActivity(
    plants : Map.Map<Common.PlantId, Types.Plant>,
    feedings : Map.Map<Common.FeedingId, Types.Feeding>,
    side : SideMaps,
    limit : Nat,
  ) : [DashTypes.ActivityEntry] {
    var entries : [DashTypes.ActivityEntry] = [];
    for ((plantId, plant) in plants.entries()) {
      let name = switch (plant.common_name) { case (?n) n; case null plant.variety };
      for (note in listToArrayNotes(switch (side.plantNotesLog.get(plantId)) { case (?l) l; case null List.empty() }).vals()) {
        entries := Array.concat(entries, [{
          timestamp = note.timestamp;
          plantId;
          plantName = name;
          actionType = "Note";
          detail = note.text;
          author = note.author;
        }]);
      };
      for (w in listToArrayWatering(switch (side.plantWateringLog.get(plantId)) { case (?l) l; case null List.empty() }).vals()) {
        entries := Array.concat(entries, [{
          timestamp = w.timestamp;
          plantId;
          plantName = name;
          actionType = "Water";
          detail = Nat.toText(w.amountMl) # " ml";
          author = w.author;
        }]);
      };
      for (p in listToArrayPest(switch (side.plantPestLog.get(plantId)) { case (?l) l; case null List.empty() }).vals()) {
        entries := Array.concat(entries, [{
          timestamp = p.timestamp;
          plantId;
          plantName = name;
          actionType = "Pest";
          detail = p.pestName # " (" # p.severity # ")";
          author = p.author;
        }]);
      };
      for (photo in listToArrayPhotos(switch (side.plantPhotoLog.get(plantId)) { case (?l) l; case null List.empty() }).vals()) {
        let photoDetail = switch (photo.caption) { case (?c) c; case null photo.url };
        entries := Array.concat(entries, [{
          timestamp = photo.timestamp;
          plantId;
          plantName = name;
          actionType = "Photo";
          detail = photoDetail;
          author = photo.author;
        }]);
      };
    };
    for ((_, feeding) in feedings.entries()) {
      switch (plants.get(feeding.plant_id)) {
        case null {};
        case (?plant) {
          let name = switch (plant.common_name) { case (?n) n; case null plant.variety };
          entries := Array.concat(entries, [{
            timestamp = feeding.date;
            plantId = feeding.plant_id;
            plantName = name;
            actionType = "Feed";
            detail = feeding.product_name # " (" # feeding.nutrient_type # ")";
            author = plant.created_by;
          }]);
        };
      };
    };
    let sorted = Array.sort<DashTypes.ActivityEntry>(
      entries,
      func(a : DashTypes.ActivityEntry, b : DashTypes.ActivityEntry) : { #less; #equal; #greater } {
        if (a.timestamp > b.timestamp) #less
        else if (a.timestamp < b.timestamp) #greater
        else #equal;
      },
    );
    if (sorted.size() <= limit) sorted else sorted.sliceToArray(0, limit.toInt());
  };

  public func getPlantHealth(
    plants : Map.Map<Common.PlantId, Types.Plant>,
    feedings : Map.Map<Common.FeedingId, Types.Feeding>,
    side : SideMaps,
    plantId : Common.PlantId,
  ) : ?DashTypes.PlantHealth {
    switch (plants.get(plantId)) {
      case null null;
      case (?plant) {
        if (plant.is_cooked) {
          return ?{
            lastWatered = null;
            lastFed = null;
            daysSinceWater = null;
            daysSinceFeed = null;
            healthScore = 0;
            needsAttention = false;
          };
        };
        let now = Time.now();
        var lastWatered : ?Common.Timestamp = null;
        switch (side.plantWateringLog.get(plantId)) {
          case (?l) {
            for (w in l.values()) {
              lastWatered := switch lastWatered {
                case null ?w.timestamp;
                case (?lw) if (w.timestamp > lw) ?w.timestamp else ?lw;
              };
            };
          };
          case null {};
        };
        var lastFed : ?Common.Timestamp = null;
        for ((_, f) in feedings.entries()) {
          if (f.plant_id == plantId) {
            lastFed := switch lastFed {
              case null ?f.date;
              case (?lf) if (f.date > lf) ?f.date else ?lf;
            };
          };
        };
        let daysSinceWater = switch lastWatered {
          case null ?999;
          case (?t) ?daysBetween(t, now);
        };
        let daysSinceFeed = switch lastFed {
          case null ?999;
          case (?t) ?daysBetween(t, now);
        };
        let needsWater = switch daysSinceWater { case (?d) d > 2; case null true };
        let needsFeed = switch daysSinceFeed { case (?d) d > 14; case null true };
        let hasPest = switch (side.plantPestLog.get(plantId)) {
          case (?l) l.size() > 0;
          case null false;
        };
        var score : Nat = 100;
        switch daysSinceWater {
          case (?d) { if (d > 1) { score -= Nat.min(40, d * 5) } };
          case null { score -= 30 };
        };
        switch daysSinceFeed {
          case (?d) { if (d > 7) { score -= Nat.min(30, (d - 7) * 2) } };
          case null { score -= 20 };
        };
        if (hasPest) score -= 25;
        if (score > 100) score := 100;
        ?{
          lastWatered;
          lastFed;
          daysSinceWater;
          daysSinceFeed;
          healthScore = score;
          needsAttention = needsWater or needsFeed or hasPest;
        };
      };
    };
  };

  public func getPlantsByContainer(
    plants : Map.Map<Common.PlantId, Types.Plant>,
    side : SideMaps,
    feedings : Map.Map<Common.FeedingId, Types.Feeding>,
    container : Types.ContainerSize,
  ) : [Types.PlantLifecycle] {
    var out : [Types.PlantLifecycle] = [];
    for ((id, plant) in plants.entries()) {
      switch (plant.container_size) {
        case (?c) {
          if (c == container) {
            switch (buildLifecycle(plants, feedings, side, id)) {
              case (?lc) out := Array.concat(out, [lc]);
              case null {};
            };
          };
        };
        case null {};
      };
    };
    out;
  };

  public func getDashboardStats(
    plants : Map.Map<Common.PlantId, Types.Plant>,
    feedings : Map.Map<Common.FeedingId, Types.Feeding>,
    side : SideMaps,
  ) : DashTypes.DashboardStats {
    let now = Time.now();
    let todayStart = now - (now % nsPerDay());
    var germinatedToday : Nat = 0;
    var needsAttention : Nat = 0;
    var lastWatered : ?Common.Timestamp = null;
    for ((plantId, plant) in plants.entries()) {
      switch (plant.germination_date) {
        case (?g) { if (g >= todayStart) germinatedToday += 1 };
        case null {};
      };
      switch (getPlantHealth(plants, feedings, side, plantId)) {
        case null {};
        case (?h) if (h.needsAttention) needsAttention += 1;
      };
      switch (side.plantWateringLog.get(plantId)) {
        case (?l) {
          for (w in l.values()) {
            lastWatered := switch lastWatered {
              case null ?w.timestamp;
              case (?lw) if (w.timestamp > lw) ?w.timestamp else ?lw;
            };
          };
        };
        case null {};
      };
    };
    let lastWateredMsAgo = switch lastWatered {
      case null null;
      case (?t) ?Nat.fromInt(Int.abs(now - t) / 1_000_000);
    };
    {
      totalPlants = plants.size();
      germinatedToday;
      needsAttention;
      lastWateredMsAgo;
    };
  };

  public func addPurchasedPlantToNimsInternal(
    plants : Map.Map<Common.PlantId, Types.Plant>,
    stageHistory : Map.Map<Common.PlantId, List.List<Types.StageHistory>>,
    side : SideMaps,
    nftTokenPlantIds : Map.Map<Nat, Common.PlantId>,
    icrc7Owners : Map.Map<Nat, ICRC7.Account>,
    caller : Principal,
    nftTokenId : Nat,
    container : Types.ContainerSize,
    locationNotes : ?Text,
    nextPlantId : Nat,
  ) : Result.Result<DashTypes.PlantSeedResult, Text> {
    let ownerAccount = switch (icrc7Owners.get(nftTokenId)) {
      case null return #err("NFT not found");
      case (?a) a;
    };
    if (ownerAccount.owner != caller) return #err("You must own this NFT");
    switch (nftTokenPlantIds.get(nftTokenId)) {
      case (?existingId) {
        side.plantOwners.add(existingId, caller);
        return #ok({ plantId = existingId });
      };
      case null {};
    };
    let input : Types.CreatePlantInput = {
      variety = "Purchased Plant";
      genetics = "";
      tray_id = 0;
      cell_position = 0;
      planting_date = Time.now();
      date_purchased = ?Time.now();
      nft_standard = #ICRC37;
      notes = switch locationNotes { case (?n) n; case null "" };
      common_name = null;
      latin_name = null;
      origin = ?"Port Charlotte, FL";
      watering_schedule = null;
      pest_notes = null;
      additional_notes = null;
      container_size = ?container;
      source_plant_id = null;
    };
    let plant = PlantsLib.createPlant(plants, Map.empty(), stageHistory, nextPlantId, input, caller);
    plant.stage := #Mature;
    setNftTokenId(plant, nftTokenId);
    plant.germination_date := ?Time.now();
    side.plantOwners.add(nextPlantId, caller);
    nftTokenPlantIds.add(nftTokenId, nextPlantId);
    #ok({ plantId = nextPlantId });
  };

  public func deathCauseToText(cause : DashTypes.DeathCause) : Text {
    switch cause {
      case (#DampingOff) "Damping off";
      case (#PestDamage) "Pest damage";
      case (#Drought) "Drought";
      case (#Disease) "Disease";
      case (#Overwatering) "Overwatering";
      case (#Unknown) "Unknown";
      case (#Other) "Other";
    };
  };
};
