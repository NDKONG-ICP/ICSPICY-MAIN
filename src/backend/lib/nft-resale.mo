// lib/nft-resale.mo — ICRC-7 peer-to-peer NFT resale marketplace.

import Map "mo:core/Map";
import Set "mo:core/Set";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import Time "mo:core/Time";
import Runtime "mo:core/Runtime";
import Result "mo:core/Result";
import Iter "mo:core/Iter";
import Array "mo:core/Array";
import ICRC7 "../types/icrc7";
import ICRC7Lib "../lib/icrc7";
import ICRC37Lib "../lib/icrc37";
import IcrcPayment "../lib/icrc-payment";
import Text "mo:core/Text";
import Common "../types/common";
import Types "../types/plants";
import ResaleTypes "../types/nft-resale";
import NimsLib "../lib/nims";

module {
  public func toPublic(
    listing : ResaleTypes.NftListing,
    plantId : ?Common.PlantId,
  ) : ResaleTypes.NftListingPublic {
    {
      tokenId = listing.tokenId;
      seller = listing.seller;
      priceUsdCents = listing.priceUsdCents;
      listedAt = listing.listedAt;
      isActive = listing.isActive;
      plantId;
    };
  };

  public func listNftForSale(
    listings : Map.Map<Nat, ResaleTypes.NftListing>,
    icrc7Owners : Map.Map<Nat, ICRC7.Account>,
    caller : Principal,
    tokenId : Nat,
    priceUsdCents : Nat,
    plantId : ?Common.PlantId,
  ) : Bool {
    if (priceUsdCents == 0) Runtime.trap("Price must be greater than zero");
    switch (icrc7Owners.get(tokenId)) {
      case null Runtime.trap("NFT not found");
      case (?acc) {
        if (not Principal.equal(acc.owner, caller)) {
          Runtime.trap("Must own NFT to list it");
        };
      };
    };
    switch (listings.get(tokenId)) {
      case (?existing) {
        if (existing.isActive) Runtime.trap("NFT already listed");
        existing.seller := caller;
        existing.priceUsdCents := priceUsdCents;
        existing.isActive := true;
        existing.listedAt := Time.now();
      };
      case null {
        listings.add(tokenId, {
          tokenId;
          var seller = caller;
          var priceUsdCents = priceUsdCents;
          var listedAt = Time.now();
          var isActive = true;
        });
      };
    };
    ignore plantId;
    true
  };

  public func delistNft(
    listings : Map.Map<Nat, ResaleTypes.NftListing>,
    caller : Principal,
    tokenId : Nat,
  ) : Bool {
    switch (listings.get(tokenId)) {
      case null false;
      case (?l) {
        if (l.seller != caller) Runtime.trap("Not your listing");
        l.isActive := false;
        true
      };
    };
  };

  public func getListedNfts(
    listings : Map.Map<Nat, ResaleTypes.NftListing>,
    nftTokenPlantIds : Map.Map<Nat, Common.PlantId>,
    pepperHeadOnly : ?Bool,
  ) : [ResaleTypes.NftListingPublic] {
    Iter.toArray(
      Iter.map(
        Iter.filter(
          listings.values(),
          func(l : ResaleTypes.NftListing) : Bool {
            if (not l.isActive) return false;
            switch pepperHeadOnly {
              case null true;
              case (?ph) {
                let isPh = ICRC7Lib.isPepperHead(l.tokenId);
                if (ph) isPh else not isPh
              };
            };
          },
        ),
        func(l : ResaleTypes.NftListing) : ResaleTypes.NftListingPublic {
          toPublic(l, nftTokenPlantIds.get(l.tokenId))
        },
      ),
    )
  };

  public func getMyListings(
    listings : Map.Map<Nat, ResaleTypes.NftListing>,
    nftTokenPlantIds : Map.Map<Nat, Common.PlantId>,
    caller : Principal,
  ) : [ResaleTypes.NftListingPublic] {
    Iter.toArray(
      Iter.map(
        Iter.filter(
          listings.values(),
          func(l : ResaleTypes.NftListing) : Bool { l.seller == caller },
        ),
        func(l : ResaleTypes.NftListing) : ResaleTypes.NftListingPublic {
          toPublic(l, nftTokenPlantIds.get(l.tokenId))
        },
      ),
    )
  };

  public func buyListedNft(
    listings : Map.Map<Nat, ResaleTypes.NftListing>,
    icrc7Owners : Map.Map<Nat, ICRC7.Account>,
    icrc7Balances : Map.Map<Principal, Set.Set<Nat>>,
    icrc37Approvals : ICRC37Lib.ApprovalsMap,
    plants : Map.Map<Common.PlantId, Types.Plant>,
    side : NimsLib.SideMaps,
    buyer : Principal,
    tokenId : Nat,
    amount : Nat,
    token : IcrcPayment.PaymentToken,
  ) : async Result.Result<(), Text> {
    let listing = switch (listings.get(tokenId)) {
      case null return #err("Listing not found");
      case (?l) l;
    };
    if (not listing.isActive) return #err("Listing inactive");
    if (listing.seller == buyer) return #err("Cannot buy your own listing");
    let expected = NimsLib.centsToStablecoinBase(listing.priceUsdCents);
    if (amount != expected) {
      return #err("Payment amount mismatch");
    };
    switch (token) {
      case (#ckUSDC) {};
      case (#ckUSDT) {};
      case (_) return #err("Only ckUSDC/ckUSDT supported for resale");
    };
    switch (
      await IcrcPayment.transferFrom(
        token,
        buyer,
        listing.seller,
        amount,
        null,
        ?("resale:" # Nat.toText(tokenId)).encodeUtf8(),
      )
    ) {
      case (#err(e)) return #err(e);
      case (#ok(_)) {};
    };
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
    listing.isActive := false;
    // Update plant owner if this NFT is linked to a plant
    for ((plantId, plant) in plants.entries()) {
      switch (NimsLib.nftTokenIdOf(plant)) {
        case (?tid) {
          if (tid == tokenId) {
            plant.sold := true;
            plant.sold_to := ?buyer;
            side.plantOwners.add(plantId, buyer);
            side.plantSoldAt.add(plantId, Time.now());
          };
        };
        case null {};
      };
    };
    #ok(())
  };
};
