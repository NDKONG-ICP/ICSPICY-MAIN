// lib/product-nft.mo — one NFT per order line item, assigned at payment settlement.

import Map "mo:core/Map";
import Set "mo:core/Set";
import Nat "mo:core/Nat";
import Int "mo:core/Int";
import Principal "mo:core/Principal";
import Result "mo:core/Result";
import Array "mo:core/Array";
import NftPool "../lib/nft-pool";
import NimsLib "../lib/nims";
import ICRC7Lib "../lib/icrc7";
import ICRC37Lib "../lib/icrc37";
import NftClaim "../lib/nft-claim";
import ProductShipping "../lib/product-shipping";
import Common "../types/common";
import MarketTypes "../types/marketplace";
import PlantTypes "../types/plants";
import ClaimTypes "../types/claim";
import ICRC7 "../types/icrc7";

module {
  public type LineSettlement = {
    tokenId : Nat;
    pickup_claim_token : ?Text;
  };

  /// Reserve a pool NFT for a catalog (non-plant) product at listing time.
  public func assignCatalogNftOnCreate(
    products : Map.Map<Common.ProductId, MarketTypes.Product>,
    productNftTokenIds : Map.Map<Common.ProductId, Nat>,
    icrc7Owners : Map.Map<Nat, ICRC7.Account>,
    canister : Principal,
    productId : Common.ProductId,
  ) : () {
    switch (products.get(productId)) {
      case null {};
      case (?product) {
        switch (product.plant_id) {
          case (?_) {};
          case null {
            switch (productNftTokenIds.get(productId)) {
              case (?_) {};
              case null {
                let entropy = Int.abs(productId);
                switch (NftPool.pickRandomAvailableNft(icrc7Owners, canister, entropy)) {
                  case null {};
                  case (?t) { productNftTokenIds.add(productId, t) };
                };
              };
            };
          };
        };
      };
    };
  };

  /// Link a live-plant shop listing to its plant NFT (display only — sale assigns at checkout).
  public func linkPlantListingNft(
    products : Map.Map<Common.ProductId, MarketTypes.Product>,
    productNftTokenIds : Map.Map<Common.ProductId, Nat>,
    plants : Map.Map<Common.PlantId, PlantTypes.Plant>,
    productId : Common.ProductId,
  ) : () {
    switch (products.get(productId)) {
      case null {};
      case (?product) {
        switch (product.plant_id) {
          case (?plantId) {
            switch (plants.get(plantId)) {
              case (?plant) {
                switch (NimsLib.nftTokenIdOf(plant)) {
                  case (?tokenId) { productNftTokenIds.add(productId, tokenId) };
                  case null {};
                };
              };
              case null {};
            };
          };
          case null {};
        };
      };
    };
  };

  func pickLineNft(
    item : MarketTypes.OrderItem,
    product : MarketTypes.Product,
    productNftTokenIds : Map.Map<Common.ProductId, Nat>,
    plants : Map.Map<Common.PlantId, PlantTypes.Plant>,
    icrc7Owners : Map.Map<Nat, ICRC7.Account>,
    canister : Principal,
    orderId : Common.OrderId,
    lineIndex : Nat,
  ) : Result.Result<Nat, Text> {
    let plantId = switch (item.plant_id) {
      case (?pid) ?pid;
      case null product.plant_id;
    };
    switch (plantId) {
      case (?pid) {
        switch (plants.get(pid)) {
          case null return #err("Plant not found for line item");
          case (?plant) {
            switch (NimsLib.nftTokenIdOf(plant)) {
              case null return #err("Plant has no NFT");
              case (?t) #ok(t);
            };
          };
        };
      };
      case null {
        switch (productNftTokenIds.get(product.id)) {
          case (?reserved) #ok(reserved);
          case null {
            let entropy = Int.abs(orderId) + lineIndex * 1_000_003 + Int.abs(product.id);
            switch (NftPool.pickRandomAvailableNft(icrc7Owners, canister, entropy)) {
              case null return #err("No NFTs available in pool");
              case (?t) #ok(t);
            };
          };
        };
      };
    };
  };

  /// Assign + transfer one NFT per order line when payment is confirmed.
  public func settleOrderLineItems(
    orderId : Common.OrderId,
    order : MarketTypes.Order,
    products : Map.Map<Common.ProductId, MarketTypes.Product>,
    productNftTokenIds : Map.Map<Common.ProductId, Nat>,
    productShippingConfigs : Map.Map<Common.ProductId, ProductShipping.ProductShippingConfig>,
    plants : Map.Map<Common.PlantId, PlantTypes.Plant>,
    nimsSide : NimsLib.SideMaps,
    icrc7Owners : Map.Map<Nat, ICRC7.Account>,
    icrc7Balances : Map.Map<Principal, Set.Set<Nat>>,
    icrc37Approvals : ICRC37Lib.ApprovalsMap,
    nftClaimTokens : Map.Map<Text, ClaimTypes.NftClaimEntry>,
    nftClaimPlantIds : Map.Map<Text, Common.PlantId>,
    plantClaimTokens : Map.Map<Common.PlantId, Text>,
    nftTokenPlantIds : Map.Map<Nat, Common.PlantId>,
    buyer : Principal,
    canister : Principal,
  ) : Result.Result<[LineSettlement], Text> {
    var settlements : [LineSettlement] = [];
    var lineIndex : Nat = 0;
    for (item in order.items.vals()) {
      let product = switch (products.get(item.product_id)) {
        case null return #err("Product not found: " # Nat.toText(item.product_id));
        case (?p) p;
      };
      let config = switch (productShippingConfigs.get(product.id)) {
        case (?c) c;
        case null {
          {
            shippable = false;
            shipping_flat_rate_cents = null;
            weight_based = false;
            price_per_unit_cents = product.price_cents;
            unit_label = null;
          };
        };
      };
      switch (ProductShipping.validateLineQuantity(product, config, item.quantity)) {
        case (#err(e)) return #err(e);
        case (#ok) {};
      };
      let tokenId = switch (
        pickLineNft(item, product, productNftTokenIds, plants, icrc7Owners, canister, orderId, lineIndex)
      ) {
        case (#err(e)) return #err(e);
        case (#ok(t)) t;
      };
      let sellerAccount = switch (icrc7Owners.get(tokenId)) {
        case null return #err("NFT owner not found");
        case (?a) a;
      };
      let buyerAccount : ICRC7.Account = { owner = buyer; subaccount = null };
      switch (
        ICRC7Lib.assignOwnership(
          icrc7Owners, icrc7Balances, tokenId, ?sellerAccount, buyerAccount,
        )
      ) {
        case (#err(e)) return #err("NFT transfer failed: " # e);
        case (#ok) {};
      };
      ignore ICRC37Lib.removeAllApprovals(icrc37Approvals, tokenId);

      let plantId = switch (item.plant_id) {
        case (?pid) ?pid;
        case null product.plant_id;
      };
      switch (plantId) {
        case (?pid) {
          ignore NimsLib.markPlantClaimedViaQr(plants, nimsSide, pid, buyer);
          product.active := false;
        };
        case null {};
      };

      let pickupClaim = if (order.pickup) {
        let claimToken = NftClaim.registerClaimToken(
          nftClaimTokens,
          nftClaimPlantIds,
          plantClaimTokens,
          nftTokenPlantIds,
          tokenId,
          plantId,
        );
        ?claimToken;
      } else {
        null;
      };

      settlements := Array.concat(settlements, [{ tokenId; pickup_claim_token = pickupClaim }]);
      lineIndex += 1;
    };
    #ok(settlements);
  };
};
