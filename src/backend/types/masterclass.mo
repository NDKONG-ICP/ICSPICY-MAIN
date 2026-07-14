// types/masterclass.mo — Masterclass quiz progress + public quiz shapes.

import Principal "mo:core/Principal";

module {
  /// Locked badge IDs (idempotency keys). Do NOT rename after first mint.
  public let BADGE_SOIL_BIOLOGY : Text = "masterclass-soil-biology";
  public let BADGE_KNF_INPUTS : Text = "masterclass-knf-inputs";
  public let BADGE_BED_BUILDER : Text = "masterclass-bed-builder";
  public let BADGE_CHILI_CULTIVATION : Text = "masterclass-chili-cultivation";
  public let BADGE_SEASON_READER : Text = "masterclass-season-reader";
  public let BADGE_SMALL_BATCH : Text = "masterclass-small-batch";
  public let BADGE_CERTIFIED_GROWER : Text = "masterclass-certified-grower";

  public type QuestionKind = { #mc; #sa };

  /// Full question (canister-only — never returned to clients).
  public type QuestionFull = {
    id : Text;
    lessonId : Text;
    kind : QuestionKind;
    prompt : Text;
    choices : [Text];
    correctIndex : Nat;
    acceptedKeywords : [Text];
    minKeywords : Nat;
    explanationSlug : Text;
    difficulty : Nat;
  };

  /// Client-safe question (no answer key).
  public type QuestionPublic = {
    id : Text;
    lessonId : Text;
    kind : QuestionKind;
    prompt : Text;
    choices : [Text];
    explanationSlug : Text;
    difficulty : Nat;
  };

  public type QuizPublic = {
    lessonId : Text;
    moduleId : Text;
    badgeId : Text;
    quizVersion : Nat;
    drawCount : Nat;
    passCorrect : Nat;
    title : Text;
    questions : [QuestionPublic];
  };

  public type LessonProgress = {
    lessonId : Text;
    attempts : Nat;
    bestScorePct : Nat;
    passed : Bool;
    passedAt : Int;
    quizVersion : Nat;
  };

  /// Per-principal progress blob (JSON text, ≤8KB). Shape:
  /// { "version":1, "lessons":{ "<id>":{attempts,bestScorePct,passed,passedAt,quizVersion} } }
  public type ProgressBlob = Text;

  public type QuestionGrade = {
    id : Text;
    correct : Bool;
  };

  public type SubmitQuizOk = {
    correct : Nat;
    total : Nat;
    scorePct : Nat;
    passed : Bool;
    lessonPassed : Bool;
    moduleBadgeMinted : ?Nat;
    capstoneBadgeMinted : ?Nat;
    progressJson : Text;
    questionResults : [QuestionGrade];
    recorded : Bool;
  };
};
