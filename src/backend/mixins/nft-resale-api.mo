// mixins/nft-resale-api.mo — ICRC-7 peer-to-peer NFT resale marketplace.

import Map "mo:core/Map";
import List "mo:core/List";
import Set "mo:core/Set";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import AccessControl "../lib/access-control";
import CallerGuard "../lib/caller-guard";
import NftResaleLib "../lib/nft-resale";
import NimsLib "../lib/nims";
import IcrcPayment "../lib/icrc-payment";
import ICRC37Lib "../lib/icrc37";
import ResaleTypes "../types/nft-resale";
import ICRC7 "../types/icrc7";
import Common "../types/common";
import PlantTypes "../types/plants";

mixin (
  accessControlState : AccessControl.AccessControlState,
  callerGuards : CallerGuard.GuardMap,
  nftListings : Map.Map<Nat, ResaleTypes.NftListing>,
  icrc7Owners : Map.Map<Nat, ICRC7.Account>,
  icrc7Balances : Map.Map<Principal, Set.Set<Nat>>,
  icrc37Approvals : ICRC37Lib.ApprovalsMap,
  plants : Map.Map<Common.PlantId, PlantTypes.Plant>,
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
  plantDeathRecords : Map.Map<Common.PlantId, PlantTypes.PlantDeathRecord>,
  nftTokenPlantIds : Map.Map<Nat, Common.PlantId>,
) {
  func resaleSideMaps() : NimsLib.SideMaps {
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

  public shared ({ caller }) func listNftForSale(
    tokenId : Nat,
    priceUsdCents : Nat,
  ) : async Bool {
    AccessControl.requireAuthenticated(caller);
    let plantId = nftTokenPlantIds.get(tokenId);
    NftResaleLib.listNftForSale(
      nftListings, icrc7Owners, caller, tokenId, priceUsdCents, plantId,
    );
  };

  public shared ({ caller }) func delistNft(tokenId : Nat) : async Bool {
    AccessControl.requireAuthenticated(caller);
    NftResaleLib.delistNft(nftListings, caller, tokenId);
  };

  public query func getListedNfts(
    pepperHeadOnly : ?Bool,
  ) : async [ResaleTypes.NftListingPublic] {
    NftResaleLib.getListedNfts(nftListings, nftTokenPlantIds, pepperHeadOnly);
  };

  public shared query ({ caller }) func getMyNftListings() : async [ResaleTypes.NftListingPublic] {
    AccessControl.requireAuthenticated(caller);
    NftResaleLib.getMyListings(nftListings, nftTokenPlantIds, caller);
  };

  public shared ({ caller }) func buyListedNft(
    tokenId : Nat,
    token : IcrcPayment.PaymentToken,
    amount : Nat,
  ) : async ResaleTypes.BuyListedNftResult {
    AccessControl.requireAuthenticated(caller);
    switch (CallerGuard.acquire(callerGuards, caller)) {
      case (#err(e)) { Runtime.trap("Request already in flight: " # e) };
      case (#ok) {};
    };
    try {
      switch (
        await NftResaleLib.buyListedNft(
          nftListings, icrc7Owners, icrc7Balances, icrc37Approvals,
          plants, resaleSideMaps(), caller, tokenId, amount, token,
        )
      ) {
        case (#err(e)) {
          CallerGuard.release(callerGuards, caller);
          { success = false; message = e };
        };
        case (#ok) {
          CallerGuard.release(callerGuards, caller);
          { success = true; message = "NFT purchased" };
        };
      };
    } catch (_) {
      CallerGuard.release(callerGuards, caller);
      { success = false; message = "Purchase failed" };
    };
  };
};
