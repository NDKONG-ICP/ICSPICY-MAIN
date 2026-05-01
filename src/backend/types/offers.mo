import Common "common";

module {
  // Supported payment tokens (ICP + ckTokens)
  public type OfferToken = {
    #ICP;
    #ckBTC;
    #ckETH;
    #ckUSDC;
    #ckUSDT;
  };

  // Status of an offer — offers never expire automatically
  public type OfferStatus = {
    #Pending;
    #Countered;
    #Accepted;
    #Rejected;
    #Cancelled;
  };

  // Actions recorded in the offer history
  public type OfferAction = {
    #Submitted;
    #Countered;
    #Accepted;
    #Rejected;
    #Cancelled;
  };

  // A single history entry in an offer's audit trail
  public type OfferHistoryEntry = {
    amount      : Nat;
    token       : OfferToken;
    by          : Principal;
    action      : OfferAction;
    timestamp   : Common.Timestamp;
  };

  // Core offer record
  public type Offer = {
    id             : Text;
    nft_id         : Text;           // resale listing id or founders NFT token id
    buyer          : Principal;
    seller         : Principal;
    offered_amount : Nat;            // in base units (e8s for ICP, satoshis for ckBTC, etc.)
    offered_token  : OfferToken;
    icp_equivalent : Nat;            // computed from price oracle at time of offer, in e8s
    status         : OfferStatus;
    created_at     : Common.Timestamp;
    updated_at     : Common.Timestamp;
    history        : [OfferHistoryEntry];
  };

  // Input type for submitting a new offer
  public type SubmitOfferInput = {
    nft_id         : Text;
    offered_amount : Nat;
    offered_token  : OfferToken;
  };

  // Input type for countering an offer
  public type CounterOfferInput = {
    offer_id       : Text;
    counter_amount : Nat;
    counter_token  : OfferToken;
  };
};
