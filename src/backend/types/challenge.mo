// types/challenge.mo — Winter Grow / special challenge groups.

import Principal "mo:core/Principal";
import Common "common";

module {
  public type ChallengeId = Text;

  public type ChallengeRole = {
    #contestant;
    #moderator;
    #sponsor;
  };

  public type ChallengeStatus = {
    #open;
    #closed;
    #archived;
  };

  /// Immutable challenge metadata. Seeded for winter-grow; admins can adjust copy later.
  public type Challenge = {
    id : ChallengeId;
    title : Text;
    tagline : Text;
    seedSponsor : Text;
    prizeSponsor : Text;
    /// Inclusive registration deadline (nanoseconds since epoch, America/New_York end-of-day).
    registrationClosesAt : Int;
    germinateAt : Int;
    status : ChallengeStatus;
    rulesSummary : Text;
    created_at : Common.Timestamp;
  };

  public type ChallengePublic = {
    id : ChallengeId;
    title : Text;
    tagline : Text;
    seedSponsor : Text;
    prizeSponsor : Text;
    registrationClosesAt : Int;
    germinateAt : Int;
    status : ChallengeStatus;
    rulesSummary : Text;
    memberCount : Nat;
    registrationOpen : Bool;
    created_at : Common.Timestamp;
  };

  public type ChallengeMember = {
    challengeId : ChallengeId;
    principal : Principal;
    role : ChallengeRole;
    enteredAt : Common.Timestamp;
    agreedRules : Bool;
    indoorOnly : Bool;
    onePlant : Bool;
  };

  public type ChallengeMemberPublic = {
    challengeId : ChallengeId;
    principal : Principal;
    username : ?Text;
    role : ChallengeRole;
    enteredAt : Common.Timestamp;
    suspended : Bool;
  };

  public type JoinChallengeInput = {
    challengeId : ChallengeId;
    agreedRules : Bool;
    indoorOnly : Bool;
    onePlant : Bool;
  };

  /// Self-reported compete metrics (honor + photos). Units: count, mm, grams, cm.
  public type ChallengeMetrics = {
    challengeId : ChallengeId;
    principal : Principal;
    pepperCount : Nat;
    largestPepperMm : Nat;
    totalWeightG : Nat;
    plantHeightCm : Nat;
    photoKeys : [Text];
    note : Text;
    updatedAt : Common.Timestamp;
  };

  public type SubmitMetricsInput = {
    challengeId : ChallengeId;
    pepperCount : Nat;
    largestPepperMm : Nat;
    totalWeightG : Nat;
    plantHeightCm : Nat;
    photoKeys : [Text];
    note : Text;
  };

  public type ChallengeMetricsPublic = {
    challengeId : ChallengeId;
    principal : Principal;
    username : ?Text;
    pepperCount : Nat;
    largestPepperMm : Nat;
    totalWeightG : Nat;
    plantHeightCm : Nat;
    photoKeys : [Text];
    note : Text;
    updatedAt : Common.Timestamp;
  };

  public type CompeteCategory = {
    #mostPeppers;
    #largestPepper;
    #totalWeight;
    #largestPlant;
  };

  public type ChallengeLeaderboardEntry = {
    principal : Principal;
    username : ?Text;
    value : Nat;
    photoKeys : [Text];
    updatedAt : Common.Timestamp;
  };
};
