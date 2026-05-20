// lib/nft-discount.mo — ICRC-7 holder storewide discount from token ID ranges.

import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import Set "mo:core/Set";
import ICRC7 "../types/icrc7";
import IcrcLib "../lib/icrc7";

module {
  public type CallerDiscount = {
    discountPercent : Nat;
    rarity : Text;
    tokenId : ?Nat;
  };

  /// Token ID ranges (1-indexed) → discount tier. Highest match wins across wallet.
  public func discountForToken(tokenId : Nat) : (Nat, Text) {
    if (tokenId >= 1 and tokenId <= 5000) {
      (5, "common");
    } else if (tokenId >= 5001 and tokenId <= 7838) {
      (7, "uncommon");
    } else if (tokenId >= 7839 and tokenId <= 7888) {
      (15, "founder_pepperhead");
    } else if (tokenId >= 7889 and tokenId <= 8726) {
      (10, "rare_pepperhead");
    } else if (tokenId >= 8727 and tokenId <= 8888) {
      (10, "rare");
    } else {
      (0, "none");
    };
  };

  public func empty() : CallerDiscount {
    { discountPercent = 0; rarity = "none"; tokenId = null };
  };

  public func bestFromTokenIds(tokenIds : [Nat]) : CallerDiscount {
    var bestPct : Nat = 0;
    var bestRarity : Text = "none";
    var bestId : ?Nat = null;
    for (id in tokenIds.vals()) {
      let (pct, rarity) = discountForToken(id);
      if (pct > bestPct) {
        bestPct := pct;
        bestRarity := rarity;
        bestId := ?id;
      };
    };
    { discountPercent = bestPct; rarity = bestRarity; tokenId = bestId };
  };

  public func callerDiscountFromBalances(
    balances : Map.Map<Principal, Set.Set<Nat>>,
    caller : Principal,
  ) : CallerDiscount {
    if (Principal.isAnonymous(caller)) return empty();
    let account : ICRC7.Account = { owner = caller; subaccount = null };
    let tokens = IcrcLib.tokensOf(balances, account, null, null);
    if (tokens.size() == 0) empty() else bestFromTokenIds(tokens);
  };

  /// Round discount to nearest cent: subtotal * pct / 100.
  public func discountAmountCents(subtotalCents : Nat, discountPercent : Nat) : Nat {
    if (discountPercent == 0 or subtotalCents == 0) 0
    else (subtotalCents * discountPercent + 50) / 100;
  };

  public func discountedSubtotalCents(subtotalCents : Nat, discountPercent : Nat) : Nat {
    let discount = discountAmountCents(subtotalCents, discountPercent);
    if (discount >= subtotalCents) 0 else subtotalCents - discount;
  };
};
