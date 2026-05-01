import Map "mo:core/Map";
import Runtime "mo:core/Runtime";
import Time "mo:core/Time";
import AccessControl "mo:caffeineai-authorization/access-control";
import Common "../types/common";
import DAOTypes "../types/dao";
import PlantTypes "../types/plants";
import MembershipTypes "../types/membership";
import DAOLib "../lib/dao";

mixin (
  accessControlState : AccessControl.AccessControlState,
  proposals : Map.Map<Common.ProposalId, DAOTypes.Proposal>,
  plants : Map.Map<Common.PlantId, PlantTypes.Plant>,
  memberships : Map.Map<Principal, MembershipTypes.MembershipNFT>,
  nextProposalId : { var value : Nat },
) {
  // Admin: create a DAO proposal
  public shared ({ caller }) func createDAOProposal(input : DAOTypes.CreateProposalInput) : async DAOTypes.ProposalPublic {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Admin only");
    };
    let proposal = DAOLib.createProposal(proposals, nextProposalId.value, caller, input);
    nextProposalId.value += 1;
    DAOLib.toPublic(proposal, caller);
  };

  // Member: vote on a DAO proposal (requires plant NFT or membership NFT)
  public shared ({ caller }) func voteOnProposal(proposal_id : Common.ProposalId, option_index : Nat) : async () {
    DAOLib.vote(proposals, plants, memberships, caller, proposal_id, option_index);
  };

  // Public: list all DAO proposals
  public query ({ caller }) func listDAOProposals() : async [DAOTypes.ProposalPublic] {
    DAOLib.listProposals(proposals, caller);
  };

  // Public: fetch a single DAO proposal
  public query ({ caller }) func getDAOProposal(proposal_id : Common.ProposalId) : async ?DAOTypes.ProposalPublic {
    DAOLib.getProposal(proposals, caller, proposal_id);
  };

  // Public: check if caller has DAO access
  public query ({ caller }) func hasDAOAccess() : async Bool {
    DAOLib.hasDAOAccess(plants, memberships, caller);
  };

  // Public: aggregate DAO statistics
  public query func getDAOStats() : async { totalProposals : Nat; activeProposals : Nat; totalVotes : Nat } {
    var activeCount : Nat = 0;
    var voteCount : Nat = 0;
    let now = Time.now();
    for ((_, p) in proposals.entries()) {
      if (p.ends_at > now) { activeCount += 1 };
      voteCount += p.votes.size();
    };
    {
      totalProposals  = proposals.size();
      activeProposals = activeCount;
      totalVotes      = voteCount;
    };
  };
};
