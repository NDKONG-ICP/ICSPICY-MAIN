import Common "../types/common";
import Types "../types/dao";
import PlantTypes "../types/plants";
import MembershipTypes "../types/membership";
import Map "mo:core/Map";
import Iter "mo:core/Iter";
import Array "mo:core/Array";
import Time "mo:core/Time";
import Runtime "mo:core/Runtime";
import Prim "mo:⛔";

module {
  public func createProposal(
    proposals : Map.Map<Common.ProposalId, Types.Proposal>,
    nextId : Nat,
    creator : Principal,
    input : Types.CreateProposalInput,
  ) : Types.Proposal {
    let proposal : Types.Proposal = {
      id = nextId;
      title = input.title;
      description = input.description;
      proposal_type = input.proposal_type;
      options = input.options;
      votes = Map.empty<Principal, Nat>();
      created_by = creator;
      created_at = Time.now();
      ends_at = input.ends_at;
    };
    proposals.add(nextId, proposal);
    proposal;
  };

  public func vote(
    proposals : Map.Map<Common.ProposalId, Types.Proposal>,
    plants : Map.Map<Common.PlantId, PlantTypes.Plant>,
    memberships : Map.Map<Principal, MembershipTypes.MembershipNFT>,
    caller : Principal,
    proposal_id : Common.ProposalId,
    option_index : Nat,
  ) : () {
    if (not hasDAOAccess(plants, memberships, caller)) {
      Runtime.trap("Unauthorized: DAO access requires a plant NFT or membership NFT");
    };
    switch (proposals.get(proposal_id)) {
      case (?proposal) {
        // Prevent double voting
        if (proposal.votes.containsKey(caller)) {
          Runtime.trap("Already voted on this proposal");
        };
        // Validate option index
        if (option_index >= proposal.options.size()) {
          Runtime.trap("Invalid option index");
        };
        proposal.votes.add(caller, option_index);
      };
      case null { Runtime.trap("Proposal not found") };
    };
  };

  public func hasDAOAccess(
    plants : Map.Map<Common.PlantId, PlantTypes.Plant>,
    memberships : Map.Map<Principal, MembershipTypes.MembershipNFT>,
    caller : Principal,
  ) : Bool {
    // Check membership NFT
    if (memberships.containsKey(caller)) {
      return true;
    };
    // Check plant NFT ownership
    for ((_, plant) in plants.entries()) {
      if (plant.sold_to == ?caller or (not plant.sold and plant.nft_id != null)) {
        return true;
      };
    };
    false;
  };

  public func getProposal(
    proposals : Map.Map<Common.ProposalId, Types.Proposal>,
    caller : Principal,
    proposal_id : Common.ProposalId,
  ) : ?Types.ProposalPublic {
    switch (proposals.get(proposal_id)) {
      case (?proposal) { ?toPublic(proposal, caller) };
      case null { null };
    };
  };

  public func listProposals(
    proposals : Map.Map<Common.ProposalId, Types.Proposal>,
    caller : Principal,
  ) : [Types.ProposalPublic] {
    proposals.values().map(func(p : Types.Proposal) : Types.ProposalPublic {
      toPublic(p, caller)
    }).toArray();
  };

  public func toPublic(proposal : Types.Proposal, caller : Principal) : Types.ProposalPublic {
    // Build vote counts per option
    let optionCount = proposal.options.size();
    let varCounts : [var Nat] = Prim.Array_init<Nat>(optionCount, 0);
    for ((_, optIdx) in proposal.votes.entries()) {
      if (optIdx < optionCount) {
        varCounts[optIdx] += 1;
      };
    };
    {
      id = proposal.id;
      title = proposal.title;
      description = proposal.description;
      proposal_type = proposal.proposal_type;
      options = proposal.options;
      vote_counts = Prim.Array_tabulate<Nat>(optionCount, func(i : Nat) : Nat { varCounts[i] });
      voter_count = proposal.votes.size();
      created_by = proposal.created_by;
      created_at = proposal.created_at;
      ends_at = proposal.ends_at;
      caller_vote = proposal.votes.get(caller);
    };
  };
};
