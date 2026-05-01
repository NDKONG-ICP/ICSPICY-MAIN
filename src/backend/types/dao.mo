import Common "common";
import Map "mo:core/Map";

module {
  public type ProposalType = {
    #PlantVariety;
    #Seasoning;
    #General;
  };

  public type Proposal = {
    id : Common.ProposalId;
    title : Text;
    description : Text;
    proposal_type : ProposalType;
    options : [Text];
    votes : Map.Map<Principal, Nat>; // principal -> option index
    created_by : Principal;
    created_at : Common.Timestamp;
    ends_at : Common.Timestamp;
  };

  public type ProposalPublic = {
    id : Common.ProposalId;
    title : Text;
    description : Text;
    proposal_type : ProposalType;
    options : [Text];
    vote_counts : [Nat]; // count per option index
    voter_count : Nat;
    created_by : Principal;
    created_at : Common.Timestamp;
    ends_at : Common.Timestamp;
    caller_vote : ?Nat; // option index caller voted for (if any)
  };

  public type CreateProposalInput = {
    title : Text;
    description : Text;
    proposal_type : ProposalType;
    options : [Text];
    ends_at : Common.Timestamp;
  };
};
