import Runtime "mo:core/Runtime";
import Time "mo:core/Time";
import Map "mo:core/Map";
import List "mo:core/List";
import Principal "mo:core/Principal";
import AccessControl "mo:caffeineai-authorization/access-control";
import OfferTypes "../types/offers";
import TreasuryTypes "../types/treasury";
import PriceOracleTypes "../types/price-oracle";
import OffersLib "../lib/offers";
import TreasuryLib "../lib/treasury";
import PriceOracleLib "../lib/price-oracle";
import Common "../types/common";

mixin (
  accessControlState : AccessControl.AccessControlState,
  offers             : Map.Map<Text, OfferTypes.Offer>,
  treasuryState      : TreasuryTypes.TreasuryState,
  treasuryTxLog      : List.List<TreasuryTypes.TreasuryTransaction>,
  priceOracleState   : PriceOracleTypes.PriceOracleState,
  nextOfferId        : { var value : Nat },
  nextTreasuryTxId   : { var value : Nat },
) {

  // Primary admin PID text — must NOT be converted to Principal at mixin level
  // (Principal.fromText at module/mixin level traps at canister init time).
  // Conversion is done lazily inside resolveSellerForNft().
  let OFFERS_ADMIN_PID_TEXT : Text = "lgjjr-4bwun-koggr-pornj-ltxia-m4xxo-iy7mg-cct7e-okxub-mbxku-tae";

  // Convert OfferToken to the matching OracleToken for price lookup
  func offerTokenToOracle(token : OfferTypes.OfferToken) : PriceOracleTypes.OracleToken {
    switch token {
      case (#ICP)    #ICP;
      case (#ckBTC)  #ckBTC;
      case (#ckETH)  #ckETH;
      case (#ckUSDC) #ckUSDC;
      case (#ckUSDT) #ckUSDT;
    };
  };

  // Convert OfferToken to TreasuryToken
  func offerTokenToTreasury(token : OfferTypes.OfferToken) : TreasuryTypes.TreasuryToken {
    switch token {
      case (#ICP)    #ICP;
      case (#ckBTC)  #ckBTC;
      case (#ckETH)  #ckETH;
      case (#ckUSDC) #ckUSDC;
      case (#ckUSDT) #ckUSDT;
    };
  };

  // Derive a seller principal from the NFT listing.
  // For now we use the admin wallet as the platform seller — in a full integration
  // this would look up the resale listing to find the actual seller.
  // Principal.fromText() is called lazily here (inside the function body) to avoid
  // the 'blob_of_principal: invalid principal' trap at canister init time.
  func resolveSellerForNft(_nftId : Text) : Principal {
    Principal.fromText(OFFERS_ADMIN_PID_TEXT)
  };

  /// Submit a new offer on an NFT (buyer calls this).
  public shared ({ caller }) func submitOffer(
    input : OfferTypes.SubmitOfferInput,
  ) : async OfferTypes.Offer {
    if (caller.isAnonymous()) Runtime.trap("Anonymous callers cannot submit offers");
    let oracleToken = offerTokenToOracle(input.offered_token);
    let icpEquiv = PriceOracleLib.toIcpEquivalent(priceOracleState, oracleToken, input.offered_amount);
    let seller = resolveSellerForNft(input.nft_id);
    OffersLib.submitOffer(offers, nextOfferId, caller, input, icpEquiv, seller, Time.now());
  };

  /// Counter an existing offer (seller calls this).
  public shared ({ caller }) func counterOffer(
    input : OfferTypes.CounterOfferInput,
  ) : async OfferTypes.Offer {
    if (caller.isAnonymous()) Runtime.trap("Anonymous callers cannot counter offers");
    let oracleToken = offerTokenToOracle(input.counter_token);
    let icpEquiv = PriceOracleLib.toIcpEquivalent(priceOracleState, oracleToken, input.counter_amount);
    OffersLib.counterOffer(offers, caller, input, icpEquiv, Time.now());
  };

  /// Accept an offer (seller accepts buyer's offer, or buyer accepts counter).
  /// On acceptance, the offered amount is routed to the treasury as an OfferSettlement.
  public shared ({ caller }) func acceptOffer(
    offerId : Text,
  ) : async OfferTypes.Offer {
    if (caller.isAnonymous()) Runtime.trap("Anonymous callers cannot accept offers");
    let now = Time.now();
    let accepted = OffersLib.acceptOffer(offers, caller, offerId, now);
    // Route payment to treasury
    let treasuryToken = offerTokenToTreasury(accepted.offered_token);
    ignore TreasuryLib.settleOffer(
      treasuryState,
      treasuryTxLog,
      nextTreasuryTxId,
      treasuryToken,
      accepted.offered_amount,
      accepted.buyer,
      accepted.seller,
      offerId,
      now,
    );
    accepted;
  };

  /// Reject an offer (seller rejects buyer's offer, or buyer rejects counter).
  public shared ({ caller }) func rejectOffer(
    offerId : Text,
  ) : async OfferTypes.Offer {
    if (caller.isAnonymous()) Runtime.trap("Anonymous callers cannot reject offers");
    OffersLib.rejectOffer(offers, caller, offerId, Time.now());
  };

  /// Cancel an offer (buyer can cancel a pending or countered offer).
  public shared ({ caller }) func cancelOffer(
    offerId : Text,
  ) : async OfferTypes.Offer {
    if (caller.isAnonymous()) Runtime.trap("Anonymous callers cannot cancel offers");
    OffersLib.cancelOffer(offers, caller, offerId, Time.now());
  };

  /// Get all offers for a given NFT id.
  public query func getOffersForNft(
    nftId : Text,
  ) : async [OfferTypes.Offer] {
    OffersLib.listOffersForNft(offers, nftId);
  };

  /// Get all offers made by the caller (buyer view).
  public query ({ caller }) func getMyOffers() : async [OfferTypes.Offer] {
    OffersLib.listOffersByBuyer(offers, caller);
  };

  /// Get all offers received by the caller (seller view).
  public query ({ caller }) func getOffersReceived() : async [OfferTypes.Offer] {
    OffersLib.listOffersBySeller(offers, caller);
  };

  /// Get a single offer by id.
  public query func getOffer(
    offerId : Text,
  ) : async ?OfferTypes.Offer {
    OffersLib.getOffer(offers, offerId);
  };
};
