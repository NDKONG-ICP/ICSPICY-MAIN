// lib/product-nft.mo — one NFT per order line item, assigned at payment settlement.

import Map "mo:core/Map";
import Set "mo:core/Set";
import Nat "mo:core/Nat";
import Int "mo:core/Int";
import Time "mo:core/Time";
import Principal "mo:core/Principal";
import Result "mo:core/Result";
import Array "mo:core/Array";
import NftPool "../lib/nft-pool";
import NimsLib "../lib/nims";
import ICRC7Lib "../lib/icrc7";
import ICRC37Lib "../lib/icrc37";
import NftClaim "../lib/nft-claim";
import ProductShipping "../lib/product-shipping";
import ProductInventory "../lib/product-inventory";
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

  func reservedTokenIds(productNftTokenIds : Map.Map<Common.ProductId, Nat>) : [Nat] {
    var ids : [Nat] = [];
    for ((_, tokenId) in productNftTokenIds.entries()) {
      ids := Array.concat(ids, [tokenId]);
    };
    ids;
  };

  func pickEntropy(productId : Common.ProductId, salt : Nat) : Nat {
    Nat.fromInt(
      Int.abs(Time.now()) + Int.fromNat(productId) * 1_000_003 + Int.fromNat(salt),
    );
  };

  func pickFreshCatalogNft(
    productNftTokenIds : Map.Map<Common.ProductId, Nat>,
    icrc7Owners : Map.Map<Nat, ICRC7.Account>,
    canister : Principal,
    productId : Common.ProductId,
    entropySalt : Nat,
  ) : ?Nat {
    let exclude = reservedTokenIds(productNftTokenIds);
    let entropy = pickEntropy(productId, entropySalt);
    NftPool.pickRandomAvailableNft(icrc7Owners, canister, entropy, exclude);
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
                switch (pickFreshCatalogNft(productNftTokenIds, icrc7Owners, canister, productId, 0)) {
                  case null {};
                  case (?t) {
                    if (NftPool.canisterOwnsToken(icrc7Owners, canister, t)) {
                      productNftTokenIds.add(productId, t);
                    };
                  };
                };
              };
            };
          };
        };
      };
    };
  };

  public func refreshCatalogReservation(
    products : Map.Map<Common.ProductId, MarketTypes.Product>,
    productNftTokenIds : Map.Map<Common.ProductId, Nat>,
    productInventoryRemaining : Map.Map<Common.ProductId, Nat>,
    productShippingConfigs : Map.Map<Common.ProductId, ProductShipping.ProductShippingConfig>,
    icrc7Owners : Map.Map<Nat, ICRC7.Account>,
    canister : Principal,
    productId : Common.ProductId,
  ) : () {
    switch (products.get(productId)) {
      case null {};
      case (?product) {
        if (not product.active) {
          ignore productNftTokenIds.delete(productId);
          return;
        };
        let config = switch (productShippingConfigs.get(productId)) {
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
        if (not ProductInventory.hasRemainingStock(productInventoryRemaining, productId, ?config)) {
          ignore productNftTokenIds.delete(productId);
          return;
        };
        switch (productNftTokenIds.get(productId)) {
          case (?reserved) {
            if (NftPool.canisterOwnsToken(icrc7Owners, canister, reserved)) return;
            ignore productNftTokenIds.delete(productId);
          };
          case null {};
        };
        switch (pickFreshCatalogNft(productNftTokenIds, icrc7Owners, canister, productId, 7)) {
          case null {};
          case (?t) {
            if (NftPool.canisterOwnsToken(icrc7Owners, canister, t)) {
              productNftTokenIds.add(productId, t);
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
          case (?reserved) {
            if (NftPool.canisterOwnsToken(icrc7Owners, canister, reserved)) {
              #ok(reserved);
            } else {
              ignore productNftTokenIds.delete(product.id);
              let entropy = Nat.fromInt(
                Int.abs(Time.now()) + Int.fromNat(orderId) * 997 +
                Int.fromNat(lineIndex) * 1_000_003 + Int.fromNat(product.id),
              );
              switch (
                NftPool.pickRandomAvailableNft(
                  icrc7Owners, canister, entropy, reservedTokenIds(productNftTokenIds),
                )
              ) {
                case null return #err("No NFTs available in pool");
                case (?t) {
                  productNftTokenIds.add(product.id, t);
                  #ok(t);
                };
              };
            };
          };
          case null {
            let entropy = Nat.fromInt(
              Int.abs(Time.now()) + Int.fromNat(orderId) * 997 +
              Int.fromNat(lineIndex) * 1_000_003 + Int.fromNat(product.id),
            );
            switch (
              NftPool.pickRandomAvailableNft(
                icrc7Owners, canister, entropy, reservedTokenIds(productNftTokenIds),
              )
            ) {
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
    productInventoryRemaining : Map.Map<Common.ProductId, Nat>,
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
      if (not NftPool.canisterOwnsToken(icrc7Owners, canister, tokenId)) {
        return #err("NFT no longer available in pool: token " # Nat.toText(tokenId));
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
        case null {
          ignore ProductInventory.consumeOnSettlement(
            products, productInventoryRemaining, product.id, config, item.quantity,
          );
          refreshCatalogReservation(
            products, productNftTokenIds, productInventoryRemaining, productShippingConfigs,
            icrc7Owners, canister, product.id,
          );
        };
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
