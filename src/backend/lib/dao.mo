import Common "../types/common";
import Types "../types/dao";
import Map "mo:core/Map";
import Set "mo:core/Set";
import Text "mo:core/Text";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import Array "mo:core/Array";
import Time "mo:core/Time";
import Runtime "mo:core/Runtime";
import IcrcLib "icrc7";

module {

  func voteKey(proposalId : Common.ProposalId, voter : Principal) : Text {
    Nat.toText(proposalId) # ":" # Principal.toText(voter);
  };

  /// Key for the token-vote dedup map: "proposalId:tokenId"
  func tokenVoteKey(proposalId : Common.ProposalId, tokenId : Nat) : Text {
    Nat.toText(proposalId) # ":tok:" # Nat.toText(tokenId);
  };

  func validateTitle(title : Text) {
    if (title.size() == 0 or title.size() > 200) {
      Runtime.trap("Title must be 1–200 characters");
    };
  };

  func validateDescription(desc : Text) {
    if (desc.size() > 5000) {
      Runtime.trap("Description max 5000 characters");
    };
  };

  func validateOptions(options : [Types.ProposalOptionInput]) {
    if (options.size() < 2 or options.size() > 5) {
      Runtime.trap("Proposals require 2–5 options");
    };
    for (opt in options.vals()) {
      if (opt.option_label.size() == 0 or opt.option_label.size() > 200) {
        Runtime.trap("Option label must be 1–200 characters");
      };
    };
  };

  func buildOptions(inputs : [Types.ProposalOptionInput]) : [Types.ProposalOption] {
    var i : Nat = 0;
    Array.map<Types.ProposalOptionInput, Types.ProposalOption>(
      inputs,
      func(input) : Types.ProposalOption {
        let id = i;
        i += 1;
        {
          id = id;
          option_label = input.option_label;
          description = input.description;
          vote_count = 0;
        };
      },
    );
  };

  public func maybeAutoClose(proposal : Types.Proposal) : Types.Proposal {
    if (proposal.status == #Active and Time.now() > proposal.voting_ends_at) {
      {
        proposal with
        status = #Closed;
        updated_at = Time.now();
      };
    } else {
      proposal;
    };
  };

  public func refreshProposal(
    proposals : Map.Map<Common.ProposalId, Types.Proposal>,
    id : Common.ProposalId,
  ) : ?Types.Proposal {
    switch (proposals.get(id)) {
      case (?p) {
        let updated = maybeAutoClose(p);
        if (updated.status != p.status) {
          proposals.add(id, updated);
        };
        ?updated;
      };
      case null null;
    };
  };

  /// All IC SPICY NFT token IDs held by caller (for eligibility checks).
  public func callerNftTokens(
    icrc7Balances : Map.Map<Principal, Set.Set<Nat>>,
    caller : Principal,
  ) : [Nat] {
    switch (icrc7Balances.get(caller)) {
      case (?set) IcrcLib.paginateSet(set, null, null);
      case null [];
    };
  };

  public func callerNftCount(
    icrc7Balances : Map.Map<Principal, Set.Set<Nat>>,
    caller : Principal,
  ) : Nat {
    switch (icrc7Balances.get(caller)) {
      case (?set) set.size();
      case null 0;
    };
  };

  /// Check if caller (or any of their linked wallets) holds an IC SPICY NFT.
  public func hasNftAccessAcrossWallets(
    icrc7Balances : Map.Map<Principal, Set.Set<Nat>>,
    linkedWallets : Map.Map<Principal, [Principal]>,
    caller : Principal,
  ) : Bool {
    if (callerNftCount(icrc7Balances, caller) > 0) return true;
    switch (linkedWallets.get(caller)) {
      case null false;
      case (?wallets) {
        var found = false;
        for (wallet in wallets.vals()) {
          if (callerNftCount(icrc7Balances, wallet) > 0) found := true;
        };
        found;
      };
    };
  };

  public func hasDAOAccess(
    icrc7Balances : Map.Map<Principal, Set.Set<Nat>>,
    caller : Principal,
  ) : Bool {
    callerNftCount(icrc7Balances, caller) > 0;
  };

  func getVote(
    votes : Map.Map<Text, Types.VoteRecord>,
    proposalId : Common.ProposalId,
    voter : Principal,
  ) : ?Types.VoteRecord {
    votes.get(voteKey(proposalId, voter));
  };

  func recordVote(
    votes : Map.Map<Text, Types.VoteRecord>,
    proposalId : Common.ProposalId,
    voter : Principal,
    optionId : Nat,
    nftTokenId : Nat,
    votedAt : Common.Timestamp,
  ) {
    votes.add(voteKey(proposalId, voter), {
      voter = voter;
      proposal_id = proposalId;
      option_id = optionId;
      nft_token_id = nftTokenId;
      voted_at = votedAt;
    });
  };

  public func createProposal(
    proposals : Map.Map<Common.ProposalId, Types.Proposal>,
    nextId : Nat,
    creator : Principal,
    input : Types.CreateProposalInput,
  ) : Types.Proposal {
    validateTitle(input.title);
    validateDescription(input.description);
    validateOptions(input.options);
    if (input.voting_ends_at <= input.voting_starts_at) {
      Runtime.trap("Voting end must be after start");
    };
    let now = Time.now();
    let status = if (input.publish_now and now >= input.voting_starts_at) {
      #Active;
    } else if (input.publish_now) {
      #Active;
    } else {
      #Draft;
    };
    let proposal : Types.Proposal = {
      id = nextId;
      title = input.title;
      description = input.description;
      category = input.category;
      creator = creator;
      status = status;
      options = buildOptions(input.options);
      voting_starts_at = input.voting_starts_at;
      voting_ends_at = input.voting_ends_at;
      total_votes = 0;
      created_at = now;
      updated_at = now;
    };
    proposals.add(nextId, proposal);
    proposal;
  };

  public func updateProposal(
    proposals : Map.Map<Common.ProposalId, Types.Proposal>,
    id : Common.ProposalId,
    input : Types.UpdateProposalInput,
  ) : Bool {
    switch (proposals.get(id)) {
      case (?proposal) {
        if (proposal.status != #Draft) {
          Runtime.trap("Only draft proposals can be edited");
        };
        let options = switch (input.options) {
          case (?opts) {
            validateOptions(opts);
            ?buildOptions(opts);
          };
          case null null;
        };
        let updated : Types.Proposal = {
          id = proposal.id;
          title = switch (input.title) { case (?t) { validateTitle(t); t }; case null proposal.title };
          description = switch (input.description) { case (?d) { validateDescription(d); d }; case null proposal.description };
          category = switch (input.category) { case (?c) c; case null proposal.category };
          creator = proposal.creator;
          status = proposal.status;
          options = switch (options) { case (?o) o; case null proposal.options };
          voting_starts_at = switch (input.voting_starts_at) { case (?t) t; case null proposal.voting_starts_at };
          voting_ends_at = switch (input.voting_ends_at) { case (?t) t; case null proposal.voting_ends_at };
          total_votes = proposal.total_votes;
          created_at = proposal.created_at;
          updated_at = Time.now();
        };
        proposals.add(id, updated);
        true;
      };
      case null { Runtime.trap("Proposal not found") };
    };
  };

  public func publishProposal(
    proposals : Map.Map<Common.ProposalId, Types.Proposal>,
    id : Common.ProposalId,
  ) : Bool {
    switch (proposals.get(id)) {
      case (?proposal) {
        if (proposal.status != #Draft) {
          Runtime.trap("Only draft proposals can be published");
        };
        proposals.add(id, {
          proposal with
          status = #Active;
          updated_at = Time.now();
        });
        true;
      };
      case null { Runtime.trap("Proposal not found") };
    };
  };

  public func cancelProposal(
    proposals : Map.Map<Common.ProposalId, Types.Proposal>,
    id : Common.ProposalId,
  ) : Bool {
    switch (proposals.get(id)) {
      case (?proposal) {
        if (proposal.status == #Closed or proposal.status == #Cancelled) {
          Runtime.trap("Proposal already closed");
        };
        proposals.add(id, {
          proposal with
          status = #Cancelled;
          updated_at = Time.now();
        });
        true;
      };
      case null { Runtime.trap("Proposal not found") };
    };
  };

  public func closeProposal(
    proposals : Map.Map<Common.ProposalId, Types.Proposal>,
    id : Common.ProposalId,
  ) : Bool {
    switch (proposals.get(id)) {
      case (?proposal) {
        proposals.add(id, {
          proposal with
          status = #Closed;
          updated_at = Time.now();
        });
        true;
      };
      case null { Runtime.trap("Proposal not found") };
    };
  };

  /// Find the first NFT (from caller's own wallet, then linked wallets) that has NOT
  /// yet been used to vote on `proposalId`. Returns null if no eligible token exists.
  public func findEligibleToken(
    icrc7Balances : Map.Map<Principal, Set.Set<Nat>>,
    linkedWallets : Map.Map<Principal, [Principal]>,
    daoTokenVotes : Map.Map<Text, Bool>,
    caller : Principal,
    proposalId : Common.ProposalId,
  ) : ?Nat {
    let ownTokens = callerNftTokens(icrc7Balances, caller);
    for (tid in ownTokens.vals()) {
      if (daoTokenVotes.get(tokenVoteKey(proposalId, tid)) == null) return ?tid;
    };
    switch (linkedWallets.get(caller)) {
      case null {};
      case (?wallets) {
        for (wallet in wallets.vals()) {
          let wt = callerNftTokens(icrc7Balances, wallet);
          for (tid in wt.vals()) {
            if (daoTokenVotes.get(tokenVoteKey(proposalId, tid)) == null) return ?tid;
          };
        };
      };
    };
    null;
  };

  /// One vote per principal AND one vote per NFT token ID per proposal.
  /// Sybil protection: even if the NFT is transferred after voting, the token ID
  /// stays recorded and cannot vote again on the same proposal.
  public func castVote(
    proposals : Map.Map<Common.ProposalId, Types.Proposal>,
    votes : Map.Map<Text, Types.VoteRecord>,
    icrc7Balances : Map.Map<Principal, Set.Set<Nat>>,
    linkedWallets : Map.Map<Principal, [Principal]>,
    daoTokenVotes : Map.Map<Text, Bool>,
    caller : Principal,
    proposal_id : Common.ProposalId,
    option_id : Nat,
  ) : Bool {
    switch (refreshProposal(proposals, proposal_id)) {
      case (?proposal) {
        if (proposal.status != #Active) {
          Runtime.trap("Proposal is not active");
        };
        let now = Time.now();
        if (now < proposal.voting_starts_at or now > proposal.voting_ends_at) {
          Runtime.trap("Outside voting window");
        };

        // 1. One vote per (proposal, caller) principal.
        switch (getVote(votes, proposal_id, caller)) {
          case (?_) { Runtime.trap("You have already voted on this proposal") };
          case null {};
        };

        // 2. Find an eligible NFT: owned (or via linked wallet) AND not yet used on this proposal.
        let tokenId = findEligibleToken(icrc7Balances, linkedWallets, daoTokenVotes, caller, proposal_id);
        let tid = switch (tokenId) {
          case null {
            Runtime.trap(
              "No eligible NFT found. You need an IC SPICY NFT that hasn't already voted on this proposal."
            )
          };
          case (?t) t;
        };

        var found = false;
        let updatedOptions = Array.map<Types.ProposalOption, Types.ProposalOption>(
          proposal.options,
          func(opt) : Types.ProposalOption {
            if (opt.id == option_id) {
              found := true;
              { opt with vote_count = opt.vote_count + 1 };
            } else {
              opt;
            };
          },
        );
        if (not found) {
          Runtime.trap("Invalid option id");
        };

        // 3. Record vote (principal-keyed) + token dedup entry.
        recordVote(votes, proposal_id, caller, option_id, tid, now);
        daoTokenVotes.add(tokenVoteKey(proposal_id, tid), true);
        proposals.add(proposal_id, {
          proposal with
          options = updatedOptions;
          total_votes = proposal.total_votes + 1;
          updated_at = now;
        });
        true;
      };
      case null { Runtime.trap("Proposal not found") };
    };
  };

  public func hasVoted(
    votes : Map.Map<Text, Types.VoteRecord>,
    proposal_id : Common.ProposalId,
    caller : Principal,
  ) : ?Types.CallerVoteInfo {
    switch (votes.get(voteKey(proposal_id, caller))) {
      case (?v) ?{ option_id = v.option_id; nft_token_id = v.nft_token_id };
      case null null;
    };
  };

  public func getProposalResults(
    proposals : Map.Map<Common.ProposalId, Types.Proposal>,
    id : Common.ProposalId,
  ) : ?Types.ProposalResults {
    switch (refreshProposal(proposals, id)) {
      case (?proposal) {
        let total = proposal.total_votes;
        var winnerLabel : ?Text = null;
        var maxVotes : Nat = 0;
        let options = Array.map<Types.ProposalOption, Types.ProposalResultOption>(
          proposal.options,
          func(opt) : Types.ProposalResultOption {
            let pct = if (total == 0) { 0 } else { (opt.vote_count * 100) / total };
            if (opt.vote_count > maxVotes) {
              maxVotes := opt.vote_count;
              winnerLabel := ?opt.option_label;
            };
            {
              option_label = opt.option_label;
              vote_count = opt.vote_count;
              percentage = pct;
            };
          },
        );
        ?{
          options = options;
          total_votes = total;
          winner = winnerLabel;
        };
      };
      case null null;
    };
  };

  public func listProposals(
    proposals : Map.Map<Common.ProposalId, Types.Proposal>,
    votes : Map.Map<Text, Types.VoteRecord>,
    caller : Principal,
    statusFilter : ?Types.ProposalStatus,
    categoryFilter : ?Types.ProposalCategory,
    offset : Nat,
    limit : Nat,
  ) : [Types.ProposalPublic] {
    var rows : [Types.ProposalPublic] = [];
    for ((id, p0) in proposals.entries()) {
      let p = maybeAutoClose(p0);
      if (p.status != p0.status) {
        proposals.add(id, p);
      };
      let statusOk = switch (statusFilter) {
        case (?s) { p.status == s };
        case null true;
      };
      let categoryOk = switch (categoryFilter) {
        case (?c) { p.category == c };
        case null true;
      };
      if (statusOk and categoryOk) {
        rows := Array.concat(rows, [toPublic(p, votes, caller)]);
      };
    };
    let sorted = Array.sort<Types.ProposalPublic>(
      rows,
      func(a, b) : { #less; #equal; #greater } {
        if (a.created_at > b.created_at) { #less }
        else if (a.created_at < b.created_at) { #greater }
        else { #equal };
      },
    );
    if (offset >= sorted.size()) { [] }
    else {
      Array.tabulate<Types.ProposalPublic>(
        Nat.min(limit, sorted.size() - offset),
        func(i) { sorted[offset + i] },
      );
    };
  };

  public func getProposal(
    proposals : Map.Map<Common.ProposalId, Types.Proposal>,
    votes : Map.Map<Text, Types.VoteRecord>,
    caller : Principal,
    proposal_id : Common.ProposalId,
  ) : ?Types.ProposalPublic {
    switch (refreshProposal(proposals, proposal_id)) {
      case (?p) { ?toPublic(p, votes, caller) };
      case null null;
    };
  };

  public func toPublic(
    proposal : Types.Proposal,
    votes : Map.Map<Text, Types.VoteRecord>,
    caller : Principal,
  ) : Types.ProposalPublic {
    {
      id = proposal.id;
      title = proposal.title;
      description = proposal.description;
      category = proposal.category;
      creator = proposal.creator;
      status = proposal.status;
      options = Array.map<Types.ProposalOption, Types.ProposalOptionPublic>(
        proposal.options,
        func(o) : Types.ProposalOptionPublic {
          {
            id = o.id;
            option_label = o.option_label;
            description = o.description;
            vote_count = o.vote_count;
          };
        },
      );
      voting_starts_at = proposal.voting_starts_at;
      voting_ends_at = proposal.voting_ends_at;
      total_votes = proposal.total_votes;
      created_at = proposal.created_at;
      updated_at = proposal.updated_at;
      caller_vote = switch (hasVoted(votes, proposal.id, caller)) {
        case (?v) ?v.option_id;
        case null null;
      };
    };
  };

  public func getDAOStats(
    proposals : Map.Map<Common.ProposalId, Types.Proposal>,
    votes : Map.Map<Text, Types.VoteRecord>,
    caller : Principal,
  ) : {
    activeProposals : Nat;
    totalVotes : Nat;
    callerVotes : Nat;
    uniqueVoters : Nat;
  } {
    var active : Nat = 0;
    var totalVotes : Nat = 0;
    var callerVotes : Nat = 0;
    var voters = Map.empty<Principal, Bool>();
    let now = Time.now();
    for ((_, p0) in proposals.entries()) {
      let p = maybeAutoClose(p0);
      if (p.status == #Active and now <= p.voting_ends_at) {
        active += 1;
      };
      totalVotes += p.total_votes;
    };
    for ((_, v) in votes.entries()) {
      voters.add(v.voter, true);
      if (Principal.equal(v.voter, caller)) {
        callerVotes += 1;
      };
    };
    {
      activeProposals = active;
      totalVotes = totalVotes;
      callerVotes = callerVotes;
      uniqueVoters = voters.size();
    };
  };
};
