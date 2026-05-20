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
};
