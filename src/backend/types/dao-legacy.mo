import Common "common";
import Map "mo:core/Map";
import Principal "mo:core/Principal";

module {
  /// Mainnet-stable proposal shape (pre–Phase 8 DAO rewrite). Kept as ghost state only.
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
    votes : Map.Map<Principal, Nat>;
    created_by : Principal;
    created_at : Common.Timestamp;
    ends_at : Common.Timestamp;
  };
};
