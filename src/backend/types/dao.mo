import Common "common";
import Principal "mo:core/Principal";

module {
  public type ProposalCategory = {
    #VarietyVote;
    #ProductVote;
    #CommunityDecision;
    #TreasurySpend;
    #FeatureRequest;
  };

  public type ProposalStatus = {
    #Draft;
    #Active;
    #Closed;
    #Cancelled;
  };

  public type ProposalOption = {
    id : Nat;
    option_label : Text;
    description : ?Text;
    vote_count : Nat;
  };

  public type Proposal = {
    id : Common.ProposalId;
    title : Text;
    description : Text;
    category : ProposalCategory;
    creator : Principal;
    status : ProposalStatus;
    options : [ProposalOption];
    voting_starts_at : Common.Timestamp;
    voting_ends_at : Common.Timestamp;
    total_votes : Nat;
    created_at : Common.Timestamp;
    updated_at : Common.Timestamp;
  };

  public type VoteRecord = {
    voter : Principal;
    proposal_id : Common.ProposalId;
    option_id : Nat;
    nft_token_id : Nat;
    voted_at : Common.Timestamp;
  };

  public type ProposalOptionPublic = {
    id : Nat;
    option_label : Text;
    description : ?Text;
    vote_count : Nat;
  };

  public type ProposalPublic = {
    id : Common.ProposalId;
    title : Text;
    description : Text;
    category : ProposalCategory;
    creator : Principal;
    status : ProposalStatus;
    options : [ProposalOptionPublic];
    voting_starts_at : Common.Timestamp;
    voting_ends_at : Common.Timestamp;
    total_votes : Nat;
    created_at : Common.Timestamp;
    updated_at : Common.Timestamp;
    caller_vote : ?Nat;
  };

  public type ProposalOptionInput = {
    option_label : Text;
    description : ?Text;
  };

  public type CreateProposalInput = {
    title : Text;
    description : Text;
    category : ProposalCategory;
    options : [ProposalOptionInput];
    voting_starts_at : Common.Timestamp;
    voting_ends_at : Common.Timestamp;
    publish_now : Bool;
  };

  public type UpdateProposalInput = {
    title : ?Text;
    description : ?Text;
    category : ?ProposalCategory;
    options : ?[ProposalOptionInput];
    voting_starts_at : ?Common.Timestamp;
    voting_ends_at : ?Common.Timestamp;
  };

  public type ProposalResultOption = {
    option_label : Text;
    vote_count : Nat;
    percentage : Nat;
  };

  public type ProposalResults = {
    options : [ProposalResultOption];
    total_votes : Nat;
    winner : ?Text;
  };

  public type CallerVoteInfo = {
    option_id : Nat;
    nft_token_id : Nat;
  };

  // Legacy alias for bindgen compatibility
  public type ProposalType = ProposalCategory;
};
