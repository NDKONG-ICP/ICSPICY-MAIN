import Map "mo:core/Map";
import Runtime "mo:core/Runtime";
import OfferTypes "../types/offers";
import Common "../types/common";

module {
  public type OffersMap = Map.Map<Text, OfferTypes.Offer>;

  // ── helpers ──

  func makeOfferId(nextId : { var value : Nat }) : Text {
    let id = nextId.value;
    nextId.value += 1;
    "offer-" # id.toText();
  };

  // Determine who can accept a given offer in its current state
  func canAccept(offer : OfferTypes.Offer, caller : Principal) : Bool {
    switch (offer.status) {
      case (#Pending)   { caller == offer.seller };   // seller accepts buyer's offer
      case (#Countered) { caller == offer.buyer  };   // buyer accepts counter
      case _            { false };
    };
  };

  func canReject(offer : OfferTypes.Offer, caller : Principal) : Bool {
    switch (offer.status) {
      case (#Pending)   { caller == offer.seller };
      case (#Countered) { caller == offer.buyer  };
      case _            { false };
    };
  };

  /// Create a new offer and persist it in the map.
  public func submitOffer(
    offers   : OffersMap,
    nextId   : { var value : Nat },
    caller   : Principal,
    input    : OfferTypes.SubmitOfferInput,
    icpEquiv : Nat,
    seller   : Principal,
    now      : Common.Timestamp,
  ) : OfferTypes.Offer {
    let id = makeOfferId(nextId);
    let histEntry : OfferTypes.OfferHistoryEntry = {
      amount    = input.offered_amount;
      token     = input.offered_token;
      by        = caller;
      action    = #Submitted;
      timestamp = now;
    };
    let offer : OfferTypes.Offer = {
      id;
      nft_id         = input.nft_id;
      buyer          = caller;
      seller;
      offered_amount = input.offered_amount;
      offered_token  = input.offered_token;
      icp_equivalent = icpEquiv;
      status         = #Pending;
      created_at     = now;
      updated_at     = now;
      history        = [histEntry];
    };
    offers.add(id, offer);
    offer;
  };

  /// Counter an existing pending/countered offer.
  public func counterOffer(
    offers   : OffersMap,
    caller   : Principal,
    input    : OfferTypes.CounterOfferInput,
    icpEquiv : Nat,
    now      : Common.Timestamp,
  ) : OfferTypes.Offer {
    let existing = switch (offers.get(input.offer_id)) {
      case (?o) o;
      case null { Runtime.trap("Offer not found: " # input.offer_id) };
    };
    // Only the seller may counter a pending offer; only the buyer may counter a countered offer
    switch (existing.status) {
      case (#Pending) {
        if (caller != existing.seller) Runtime.trap("Only the seller can counter a pending offer");
      };
      case (#Countered) {
        if (caller != existing.buyer) Runtime.trap("Only the buyer can counter an already-countered offer");
      };
      case _ { Runtime.trap("Offer is not in a counterable state") };
    };
    let histEntry : OfferTypes.OfferHistoryEntry = {
      amount    = input.counter_amount;
      token     = input.counter_token;
      by        = caller;
      action    = #Countered;
      timestamp = now;
    };
    let updated : OfferTypes.Offer = {
      existing with
      offered_amount = input.counter_amount;
      offered_token  = input.counter_token;
      icp_equivalent = icpEquiv;
      status         = #Countered;
      updated_at     = now;
      history        = existing.history.concat([histEntry]);
    };
    offers.add(input.offer_id, updated);
    updated;
  };

  /// Accept a pending or countered offer.
  public func acceptOffer(
    offers  : OffersMap,
    caller  : Principal,
    offerId : Text,
    now     : Common.Timestamp,
  ) : OfferTypes.Offer {
    let existing = switch (offers.get(offerId)) {
      case (?o) o;
      case null { Runtime.trap("Offer not found: " # offerId) };
    };
    if (not canAccept(existing, caller)) {
      Runtime.trap("Caller is not authorized to accept this offer");
    };
    let histEntry : OfferTypes.OfferHistoryEntry = {
      amount    = existing.offered_amount;
      token     = existing.offered_token;
      by        = caller;
      action    = #Accepted;
      timestamp = now;
    };
    let updated : OfferTypes.Offer = {
      existing with
      status     = #Accepted;
      updated_at = now;
      history    = existing.history.concat([histEntry]);
    };
    offers.add(offerId, updated);
    updated;
  };

  /// Reject a pending or countered offer.
  public func rejectOffer(
    offers  : OffersMap,
    caller  : Principal,
    offerId : Text,
    now     : Common.Timestamp,
  ) : OfferTypes.Offer {
    let existing = switch (offers.get(offerId)) {
      case (?o) o;
      case null { Runtime.trap("Offer not found: " # offerId) };
    };
    if (not canReject(existing, caller)) {
      Runtime.trap("Caller is not authorized to reject this offer");
    };
    let histEntry : OfferTypes.OfferHistoryEntry = {
      amount    = existing.offered_amount;
      token     = existing.offered_token;
      by        = caller;
      action    = #Rejected;
      timestamp = now;
    };
    let updated : OfferTypes.Offer = {
      existing with
      status     = #Rejected;
      updated_at = now;
      history    = existing.history.concat([histEntry]);
    };
    offers.add(offerId, updated);
    updated;
  };

  /// Cancel an offer (only the buyer or admin may cancel).
  public func cancelOffer(
    offers  : OffersMap,
    caller  : Principal,
    offerId : Text,
    now     : Common.Timestamp,
  ) : OfferTypes.Offer {
    let existing = switch (offers.get(offerId)) {
      case (?o) o;
      case null { Runtime.trap("Offer not found: " # offerId) };
    };
    switch (existing.status) {
      case (#Accepted) { Runtime.trap("Cannot cancel an already accepted offer") };
      case (#Rejected) { Runtime.trap("Cannot cancel an already rejected offer") };
      case (#Cancelled) { Runtime.trap("Offer is already cancelled") };
      case _ {};
    };
    if (caller != existing.buyer) {
      Runtime.trap("Only the buyer can cancel an offer");
    };
    let histEntry : OfferTypes.OfferHistoryEntry = {
      amount    = existing.offered_amount;
      token     = existing.offered_token;
      by        = caller;
      action    = #Cancelled;
      timestamp = now;
    };
    let updated : OfferTypes.Offer = {
      existing with
      status     = #Cancelled;
      updated_at = now;
      history    = existing.history.concat([histEntry]);
    };
    offers.add(offerId, updated);
    updated;
  };

  /// Return all offers for a given NFT id (any status).
  public func listOffersForNft(
    offers : OffersMap,
    nftId  : Text,
  ) : [OfferTypes.Offer] {
    offers.values().filter(func o = o.nft_id == nftId).toArray()
  };

  /// Return all offers made by a buyer principal.
  public func listOffersByBuyer(
    offers : OffersMap,
    buyer  : Principal,
  ) : [OfferTypes.Offer] {
    offers.values().filter(func o = o.buyer == buyer).toArray()
  };

  /// Return all offers received by a seller principal.
  public func listOffersBySeller(
    offers : OffersMap,
    seller : Principal,
  ) : [OfferTypes.Offer] {
    offers.values().filter(func o = o.seller == seller).toArray()
  };

  /// Look up a single offer by id.
  public func getOffer(
    offers  : OffersMap,
    offerId : Text,
  ) : ?OfferTypes.Offer {
    offers.get(offerId)
  };
};
