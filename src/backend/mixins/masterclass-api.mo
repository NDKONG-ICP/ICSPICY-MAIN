// mixins/masterclass-api.mo — Quiz prompts (no keys) + server-graded submit + progress.
//
// Mint path: on verified pass of all M1 lessons, calls AchievementsLib.mintBadge
// DIRECTLY (not via public mintAchievementBadge). No public self-mint.
//
// Guest grading: gradeQuizCheckpoint (query) — server-authoritative, zero durable
// writes. Authenticated recording: submitQuizResult (update).

import Array "mo:core/Array";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import Result "mo:core/Result";
import Set "mo:core/Set";
import Text "mo:core/Text";
import AccessControl "../lib/access-control";
import LinkedIdentity "../lib/linked-identity";
import MasterclassLib "../lib/masterclass";
import QuizBank "../lib/masterclass-quiz-bank";
import RateLimit "../lib/rate-limit";
import RateLimits "../lib/rate-limits";
import AchievementTypes "../types/achievements";
import ICRC7 "../types/icrc7";
import Types "../types/masterclass";

mixin (
  accessControlState : AccessControl.AccessControlState,
  rateLimits : RateLimits.Bundle,
  masterclassProgress : Map.Map<Principal, Types.ProgressBlob>,
  icrc7Owners : Map.Map<Nat, ICRC7.Account>,
  icrc7Balances : Map.Map<Principal, Set.Set<Nat>>,
  badgeRegistry : Map.Map<Nat, AchievementTypes.BadgeRecord>,
  badgeByOwnerType : Map.Map<Text, Nat>,
  nextAchievementTokenId : { var value : Nat },
  linkedWallets : Map.Map<Principal, [Principal]>,
  walletToIdentity : Map.Map<Principal, Principal>,
) {
  /// Grade answers only — no progress, mint, or attempt recording.
  func gradeQuizSubmission(
    lessonId : Text,
    answersJson : Text,
  ) : Result.Result<Types.SubmitQuizOk, Text> {
    let bank = switch (QuizBank.getBank(lessonId)) {
      case null { return #err("Quiz not available for lesson: " # lessonId) };
      case (?b) b;
    };

    let answers = switch (MasterclassLib.parseAnswersJson(answersJson)) {
      case (#err e) { return #err(e) };
      case (#ok sub) sub;
    };

    let grade = switch (MasterclassLib.gradeAttempt(bank, answers)) {
      case (#err e) { return #err(e) };
      case (#ok g) g;
    };

    #ok({
      correct = grade.correct;
      total = grade.total;
      scorePct = grade.scorePct;
      passed = grade.passed;
      lessonPassed = false;
      moduleBadgeMinted = null;
      capstoneBadgeMinted = null;
      progressJson = MasterclassLib.emptyProgressJson();
      questionResults = grade.questionResults;
      recorded = false;
    });
  };

  /// Public quiz bank for a lesson — prompts + choices only (answer keys stripped).
  public query func getLessonQuiz(lessonId : Text) : async ?Types.QuizPublic {
    switch (QuizBank.getBank(lessonId)) {
      case null null;
      case (?bank) ?QuizBank.toPublic(bank);
    };
  };

  /// Server re-grade for guests (query — bypasses inspect_message anonymous block).
  /// Same seeded permutation path as submitQuizResult; returns per-question results.
  /// Zero durable state writes; mint path unreachable.
  public query func gradeQuizCheckpoint(
    lessonId : Text,
    answersJson : Text,
  ) : async Result.Result<Types.SubmitQuizOk, Text> {
    gradeQuizSubmission(lessonId, answersJson);
  };

  /// Union progress across linked principals (canonical-aware).
  public query ({ caller }) func getMyMasterclassProgress() : async Text {
    if (Principal.isAnonymous(caller)) {
      return MasterclassLib.emptyProgressJson();
    };
    let principals = LinkedIdentity.principalsForUser(
      caller,
      linkedWallets,
      walletToIdentity,
    );
    var blobs : [Text] = [];
    for (p in principals.vals()) {
      switch (masterclassProgress.get(p)) {
        case (?j) { blobs := blobs.concat([j]) };
        case null {};
      };
    };
    if (blobs.size() == 0) {
      MasterclassLib.emptyProgressJson();
    } else {
      MasterclassLib.mergeProgressJson(blobs);
    };
  };

  /// Server re-grades answers, records progress, mints badges on verified pass.
  public shared ({ caller }) func submitQuizResult(
    lessonId : Text,
    answersJson : Text,
  ) : async Result.Result<Types.SubmitQuizOk, Text> {
    AccessControl.requireAuthenticated(caller);
    RateLimit.trapIfLimited(
      rateLimits.masterclassQuiz,
      caller,
      "Rate limited. Try again in a minute.",
    );

    let bank = switch (QuizBank.getBank(lessonId)) {
      case null { return #err("Quiz not available for lesson: " # lessonId) };
      case (?b) b;
    };

    let answers = switch (MasterclassLib.parseAnswersJson(answersJson)) {
      case (#err e) { return #err(e) };
      case (#ok sub) sub;
    };

    let grade = switch (MasterclassLib.gradeAttempt(bank, answers)) {
      case (#err e) { return #err(e) };
      case (#ok g) g;
    };

    let canon = LinkedIdentity.canonicalPrincipal(caller, walletToIdentity);
    let prev = switch (masterclassProgress.get(canon)) {
      case (?j) j;
      case null MasterclassLib.emptyProgressJson();
    };
    let prevLesson = MasterclassLib.readLessonProgress(prev, lessonId);
    let attempts = prevLesson.attempts + 1;
    let bestScorePct = if (grade.scorePct > prevLesson.bestScorePct) {
      grade.scorePct;
    } else {
      prevLesson.bestScorePct;
    };
    let nowPassed = grade.passed or prevLesson.passed;
    let passedAt = if (grade.passed and prevLesson.passedAt == 0) {
      MasterclassLib.now();
    } else if (prevLesson.passedAt != 0) {
      prevLesson.passedAt;
    } else if (grade.passed) {
      MasterclassLib.now();
    } else {
      0;
    };

    let progressJson = MasterclassLib.upsertLessonProgress(
      prev,
      lessonId,
      attempts,
      bestScorePct,
      nowPassed,
      passedAt,
      bank.quizVersion,
    );
    masterclassProgress.add(canon, progressJson);

    var moduleBadgeMinted : ?Nat = null;
    var capstoneBadgeMinted : ?Nat = null;
    if (grade.passed) {
      let minted = MasterclassLib.maybeMintModuleAndCapstone(
        nextAchievementTokenId,
        icrc7Owners,
        icrc7Balances,
        badgeRegistry,
        badgeByOwnerType,
        linkedWallets,
        walletToIdentity,
        canon,
        progressJson,
        bank.moduleId,
      );
      moduleBadgeMinted := minted.moduleBadgeMinted;
      capstoneBadgeMinted := minted.capstoneBadgeMinted;
    };

    #ok({
      correct = grade.correct;
      total = grade.total;
      scorePct = grade.scorePct;
      passed = grade.passed;
      lessonPassed = nowPassed;
      moduleBadgeMinted;
      capstoneBadgeMinted;
      progressJson;
      questionResults = grade.questionResults;
      recorded = true;
    });
  };
};
