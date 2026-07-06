// migrations/PhaseGrowerProposal.mo
// One-time stable upgrade: ProposalCategory 5 → 6 variants (#GrowerProposal).
//
// Attach in main.mo ONLY for the cutover deploy FROM pre–Grower-Co-op mainnet wasm:
//   import GrowerProposalMigration "migrations/PhaseGrowerProposal";
//   shared(msg) persistent actor class ICSpicy() = Self (with GrowerProposalMigration.migration) {
//
// After that cutover succeeds, remove the hook — subsequent upgrades use
// DAOTypes.ProposalCategory directly (6 variants already in stable memory).

import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import Common "../types/common";

module {
  type OldProposalCategory = {
    #VarietyVote;
    #ProductVote;
    #CommunityDecision;
    #TreasurySpend;
    #FeatureRequest;
  };

  type OldProposalStatus = {
    #Draft;
    #Active;
    #Closed;
    #Cancelled;
  };

  type OldProposalOption = {
    id : Nat;
    option_label : Text;
    description : ?Text;
    vote_count : Nat;
  };

  type OldProposal = {
    id : Common.ProposalId;
    title : Text;
    description : Text;
    category : OldProposalCategory;
    creator : Principal;
    status : OldProposalStatus;
    options : [OldProposalOption];
    voting_starts_at : Common.Timestamp;
    voting_ends_at : Common.Timestamp;
    total_votes : Nat;
    created_at : Common.Timestamp;
    updated_at : Common.Timestamp;
  };

  type NewProposalCategory = {
    #VarietyVote;
    #ProductVote;
    #CommunityDecision;
    #TreasurySpend;
    #FeatureRequest;
    #GrowerProposal;
  };

  type NewProposalStatus = {
    #Draft;
    #Active;
    #Closed;
    #Cancelled;
  };

  type NewProposalOption = {
    id : Nat;
    option_label : Text;
    description : ?Text;
    vote_count : Nat;
  };

  type NewProposal = {
    id : Common.ProposalId;
    title : Text;
    description : Text;
    category : NewProposalCategory;
    creator : Principal;
    status : NewProposalStatus;
    options : [NewProposalOption];
    voting_starts_at : Common.Timestamp;
    voting_ends_at : Common.Timestamp;
    total_votes : Nat;
    created_at : Common.Timestamp;
    updated_at : Common.Timestamp;
  };

  func migrateCategory(c : OldProposalCategory) : NewProposalCategory {
    switch (c) {
      case (#VarietyVote) #VarietyVote;
      case (#ProductVote) #ProductVote;
      case (#CommunityDecision) #CommunityDecision;
      case (#TreasurySpend) #TreasurySpend;
      case (#FeatureRequest) #FeatureRequest;
    };
  };

  func migrateStatus(s : OldProposalStatus) : NewProposalStatus {
    switch (s) {
      case (#Draft) #Draft;
      case (#Active) #Active;
      case (#Closed) #Closed;
      case (#Cancelled) #Cancelled;
    };
  };

  func migrateProposal(old : OldProposal) : NewProposal {
    {
      id = old.id;
      title = old.title;
      description = old.description;
      category = migrateCategory(old.category);
      creator = old.creator;
      status = migrateStatus(old.status);
      options = old.options;
      voting_starts_at = old.voting_starts_at;
      voting_ends_at = old.voting_ends_at;
      total_votes = old.total_votes;
      created_at = old.created_at;
      updated_at = old.updated_at;
    };
  };

  func migrateProposalsMap(
    old : Map.Map<Common.ProposalId, OldProposal>,
  ) : Map.Map<Common.ProposalId, NewProposal> {
    let next = Map.empty<Common.ProposalId, NewProposal>();
    for ((id, p) in old.entries()) {
      Map.add(next, Nat.compare, id, migrateProposal(p));
    };
    next;
  };

  public func migration(
    old : { daoProposals : Map.Map<Common.ProposalId, OldProposal> },
  ) : { daoProposals : Map.Map<Common.ProposalId, NewProposal> } {
    { daoProposals = migrateProposalsMap(old.daoProposals) };
  };
};
