// mixins/challenge-api.mo — Winter Grow / special challenge groups.

import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import Set "mo:core/Set";
import Text "mo:core/Text";
import Time "mo:core/Time";
import AccessControl "../lib/access-control";
import AuditLog "../lib/audit-log";
import ChallengeLib "../lib/challenge";
import ChallengeTypes "../types/challenge";
import Common "../types/common";
import CommunityTypes "../types/community";
import RateLimit "../lib/rate-limit";
import RateLimits "../lib/rate-limits";
import Runtime "mo:core/Runtime";
import ComplianceLib "../lib/compliance";
import ComplianceTypes "../types/compliance";

mixin (
  accessControlState : AccessControl.AccessControlState,
  rateLimits : RateLimits.Bundle,
  ageAttestations : Map.Map<Principal, ComplianceTypes.AgeAttestation>,
  posts : Map.Map<Common.PostId, CommunityTypes.Post>,
  comments : Map.Map<Common.CommentId, CommunityTypes.Comment>,
  tips : Map.Map<Nat, CommunityTypes.Tip>,
  profiles : Map.Map<Principal, CommunityTypes.UserProfile>,
  bannedUsers : Set.Set<Principal>,
  nextPostId : { var value : Nat },
  auditLog : { var value : AuditLog.AuditLog },
  challengeStore : ChallengeLib.Store,
) {
  public query func getChallenge(challengeId : Text) : async ?ChallengeTypes.ChallengePublic {
    ChallengeLib.getChallenge(challengeStore, challengeId, Time.now());
  };

  public query func listChallenges() : async [ChallengeTypes.ChallengePublic] {
    ChallengeLib.listChallenges(challengeStore, Time.now());
  };

  public query ({ caller }) func getMyChallengeMembership(
    challengeId : Text,
  ) : async ?ChallengeTypes.ChallengeMemberPublic {
    ChallengeLib.myMembership(challengeStore, profiles, challengeId, caller);
  };

  public query func listChallengeMembers(
    challengeId : Text,
    offset : Nat,
    limit : Nat,
  ) : async [ChallengeTypes.ChallengeMemberPublic] {
    ChallengeLib.listMembers(challengeStore, profiles, challengeId, offset, limit);
  };

  public shared ({ caller }) func joinChallenge(
    input : ChallengeTypes.JoinChallengeInput,
  ) : async ChallengeTypes.ChallengeMemberPublic {
    AccessControl.requireAuthenticated(caller);
    ComplianceLib.requireAgeAttested(ageAttestations, caller);
    RateLimit.trapIfLimited(rateLimits.communityPost, caller, "Rate limited. Try again in a minute.");
    ChallengeLib.join(challengeStore, profiles, caller, input, Time.now());
  };

  public shared ({ caller }) func createChallengePost(
    challengeId : Text,
    input : CommunityTypes.CreatePostInput,
  ) : async CommunityTypes.PostPublic {
    AccessControl.requireAuthenticated(caller);
    ComplianceLib.requireAgeAttested(ageAttestations, caller);
    RateLimit.trapIfLimited(rateLimits.communityPost, caller, "Rate limited. Try again in a minute.");
    ChallengeLib.createChallengePost(
      challengeStore,
      posts,
      profiles,
      bannedUsers,
      nextPostId,
      challengeId,
      caller,
      input,
      Time.now(),
    );
  };

  public query ({ caller }) func getChallengeFeed(
    challengeId : Text,
    offset : Nat,
    limit : Nat,
  ) : async [CommunityTypes.PostPublic] {
    ChallengeLib.getChallengeFeed(
      challengeStore,
      posts,
      comments,
      tips,
      profiles,
      bannedUsers,
      challengeId,
      caller,
      offset,
      limit,
    );
  };

  public shared ({ caller }) func submitChallengeMetrics(
    input : ChallengeTypes.SubmitMetricsInput,
  ) : async ChallengeTypes.ChallengeMetricsPublic {
    AccessControl.requireAuthenticated(caller);
    RateLimit.trapIfLimited(rateLimits.communityPost, caller, "Rate limited. Try again in a minute.");
    ChallengeLib.submitMetrics(challengeStore, profiles, caller, input, Time.now());
  };

  public query ({ caller }) func getMyChallengeMetrics(
    challengeId : Text,
  ) : async ?ChallengeTypes.ChallengeMetricsPublic {
    ChallengeLib.getMyMetrics(challengeStore, profiles, challengeId, caller);
  };

  public query func getChallengeLeaderboard(
    challengeId : Text,
    category : ChallengeTypes.CompeteCategory,
    limit : Nat,
  ) : async [ChallengeTypes.ChallengeLeaderboardEntry] {
    ChallengeLib.getLeaderboard(challengeStore, profiles, challengeId, category, limit);
  };

  public shared ({ caller }) func adminSetChallengeMemberRole(
    challengeId : Text,
    target : Principal,
    role : ChallengeTypes.ChallengeRole,
  ) : async () {
    AccessControl.requireAdmin(accessControlState, caller);
    ChallengeLib.adminSetMemberRole(challengeStore, challengeId, target, role);
    auditLog.value := AuditLog.append(auditLog.value, {
      ts = Time.now();
      admin = caller;
      action = "challenge_set_role";
      detail = challengeId # " · " # target.toText();
    });
  };

  public shared ({ caller }) func adminSetChallengeSuspended(
    challengeId : Text,
    target : Principal,
    suspended : Bool,
  ) : async () {
    AccessControl.requireAuthenticated(caller);
    if (not ChallengeLib.isModeratorOrAdmin(
      challengeStore, accessControlState, challengeId, caller,
    )) {
      Runtime.trap("Moderator or admin required");
    };
    ChallengeLib.adminSetSuspended(challengeStore, challengeId, target, suspended);
    auditLog.value := AuditLog.append(auditLog.value, {
      ts = Time.now();
      admin = caller;
      action = if (suspended) "challenge_suspend" else "challenge_unsuspend";
      detail = challengeId # " · " # target.toText();
    });
  };
};
