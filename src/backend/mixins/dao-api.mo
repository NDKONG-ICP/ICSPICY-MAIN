import Map "mo:core/Map";
import Set "mo:core/Set";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import AccessControl "../lib/access-control";
import Common "../types/common";
import DAOTypes "../types/dao";
import DAOLib "../lib/dao";

import RateLimits "../lib/rate-limits";
import RateLimit "../lib/rate-limit";

mixin (
  accessControlState : AccessControl.AccessControlState,
  rateLimits : RateLimits.Bundle,
  proposals : Map.Map<Common.ProposalId, DAOTypes.Proposal>,
  daoVotes : Map.Map<Text, DAOTypes.VoteRecord>,
  icrc7Balances : Map.Map<Principal, Set.Set<Nat>>,
  nextProposalId : { var value : Nat },
) {
  // ── Public queries ─────────────────────────────────────────────────────────

  public query ({ caller }) func getProposals(
    status : ?DAOTypes.ProposalStatus,
    category : ?DAOTypes.ProposalCategory,
    offset : Nat,
    limit : Nat,
  ) : async [DAOTypes.ProposalPublic] {
    DAOLib.listProposals(proposals, daoVotes, caller, status, category, offset, limit);
  };

  public query ({ caller }) func getProposal(id : Common.ProposalId) : async ?DAOTypes.ProposalPublic {
    DAOLib.getProposal(proposals, daoVotes, caller, id);
  };

  public query func getProposalResults(id : Common.ProposalId) : async ?DAOTypes.ProposalResults {
    DAOLib.getProposalResults(proposals, id);
  };

  public query ({ caller }) func hasVoted(proposalId : Common.ProposalId) : async ?DAOTypes.CallerVoteInfo {
    DAOLib.hasVoted(daoVotes, proposalId, caller);
  };

  public query ({ caller }) func hasDAOAccess() : async Bool {
    DAOLib.hasDAOAccess(icrc7Balances, caller);
  };

  public query ({ caller }) func getCallerDaoNftCount() : async Nat {
    DAOLib.callerNftCount(icrc7Balances, caller);
  };

  public query ({ caller }) func getDAOStats() : async {
    activeProposals : Nat;
    totalVotes : Nat;
    callerVotes : Nat;
    uniqueVoters : Nat;
  } {
    DAOLib.getDAOStats(proposals, daoVotes, caller);
  };

  // Legacy aliases
  public query ({ caller }) func listDAOProposals() : async [DAOTypes.ProposalPublic] {
    DAOLib.listProposals(proposals, daoVotes, caller, null, null, 0, 1000);
  };

  public query ({ caller }) func getDAOProposal(proposal_id : Common.ProposalId) : async ?DAOTypes.ProposalPublic {
    DAOLib.getProposal(proposals, daoVotes, caller, proposal_id);
  };

  // ── Authenticated voting ───────────────────────────────────────────────────

  public shared ({ caller }) func castVote(proposalId : Common.ProposalId, optionId : Nat) : async Bool {
    AccessControl.requireAuthenticated(caller);
    RateLimit.trapIfLimited(rateLimits.vote, caller, "Rate limited. Try again in a minute.");
    DAOLib.castVote(proposals, daoVotes, icrc7Balances, caller, proposalId, optionId);
  };

  public shared ({ caller }) func voteOnProposal(proposal_id : Common.ProposalId, option_index : Nat) : async () {
    AccessControl.requireAuthenticated(caller);
    ignore DAOLib.castVote(proposals, daoVotes, icrc7Balances, caller, proposal_id, option_index);
  };

  // ── Admin proposal management ──────────────────────────────────────────────

  public shared ({ caller }) func createProposal(input : DAOTypes.CreateProposalInput) : async { proposalId : Nat } {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Admin only");
    };
    let proposal = DAOLib.createProposal(proposals, nextProposalId.value, caller, input);
    let id = nextProposalId.value;
    nextProposalId.value += 1;
    { proposalId = id };
  };

  public shared ({ caller }) func createDAOProposal(input : DAOTypes.CreateProposalInput) : async DAOTypes.ProposalPublic {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Admin only");
    };
    let proposal = DAOLib.createProposal(proposals, nextProposalId.value, caller, input);
    nextProposalId.value += 1;
    DAOLib.toPublic(proposal, daoVotes, caller);
  };

  public shared ({ caller }) func updateProposal(id : Common.ProposalId, input : DAOTypes.UpdateProposalInput) : async Bool {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Admin only");
    };
    DAOLib.updateProposal(proposals, id, input);
  };

  public shared ({ caller }) func publishProposal(id : Common.ProposalId) : async Bool {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Admin only");
    };
    DAOLib.publishProposal(proposals, id);
  };

  public shared ({ caller }) func cancelProposal(id : Common.ProposalId) : async Bool {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Admin only");
    };
    DAOLib.cancelProposal(proposals, id);
  };

  public shared ({ caller }) func closeProposal(id : Common.ProposalId) : async Bool {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Admin only");
    };
    DAOLib.closeProposal(proposals, id);
  };
};
