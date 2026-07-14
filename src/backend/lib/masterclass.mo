// lib/masterclass.mo — Deterministic quiz grading + progress + verified-pass mint hooks.
//
// SA MATCHER (whole-word tokens — NOT raw substring):
// 1. Lowercase the answer.
// 2. Replace every non [a-z0-9] character with a space.
// 3. Collapse whitespace and split into tokens.
// 4. For each acceptedKeyword (same normalize → token list):
//    - single-token keyword: exact token membership in the answer token list
//    - multi-token keyword: consecutive token-window match
// 5. Count distinct keyword hits; pass if hits ≥ minKeywords.
//
// This avoids false positives like keyword "ant" matching "plant".

import Array "mo:core/Array";
import Char "mo:core/Char";
import Int "mo:core/Int";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Nat32 "mo:core/Nat32";
import Principal "mo:core/Principal";
import Result "mo:core/Result";
import Set "mo:core/Set";
import Text "mo:core/Text";
import Time "mo:core/Time";
import AchievementsLib "./achievements";
import LinkedIdentity "./linked-identity";
import QuizBank "./masterclass-quiz-bank";
import Sanitize "./sanitize";
import JsonMini "./json-mini";
import AchievementTypes "../types/achievements";
import ICRC7 "../types/icrc7";
import Types "../types/masterclass";

module {
  public let MAX_PROGRESS_JSON_CHARS : Nat = 8_192;

  // ── SA whole-word tokenizer ───────────────────────────────────────────────

  func isAsciiAlphaNum(c : Char) : Bool {
    let n = Char.toNat32(c);
    (n >= 48 and n <= 57) or (n >= 97 and n <= 122) or (n >= 65 and n <= 90);
  };

  /// Lowercase + non-alnum → space + split on whitespace. Empty tokens dropped.
  public func tokenize(raw : Text) : [Text] {
    var buf = "";
    var tokens : [Text] = [];
    let flush = func() {
      if (buf.size() > 0) {
        tokens := tokens.concat([buf]);
        buf := "";
      };
    };
    for (c in raw.chars()) {
      if (isAsciiAlphaNum(c)) {
        buf #= Text.toLower(Char.toText(c));
      } else {
        flush();
      };
    };
    flush();
    tokens;
  };

  func containsPhrase(hay : [Text], needle : [Text]) : Bool {
    if (needle.size() == 0) { return false };
    if (needle.size() > hay.size()) { return false };
    let last : Nat = hay.size() - needle.size();
    var i : Nat = 0;
    label scan loop {
      var ok = true;
      var j : Nat = 0;
      label inner while (j < needle.size()) {
        if (not Text.equal(hay[i + j], needle[j])) {
          ok := false;
          break inner;
        };
        j += 1;
      };
      if (ok) { return true };
      if (i >= last) { break scan };
      i += 1;
    };
    false;
  };

  public func countKeywordHits(answer : Text, keywords : [Text]) : Nat {
    let tokens = tokenize(answer);
    var hits : Nat = 0;
    for (kw in keywords.vals()) {
      let kwToks = tokenize(kw);
      if (kwToks.size() == 0) {
        // skip empty
      } else if (kwToks.size() == 1) {
        switch (Array.find<Text>(tokens, func(t) { Text.equal(t, kwToks[0]) })) {
          case (?_) { hits += 1 };
          case null {};
        };
      } else if (containsPhrase(tokens, kwToks)) {
        hits += 1;
      };
    };
    hits;
  };

  public func gradeSa(answer : Text, keywords : [Text], minKeywords : Nat) : Bool {
    countKeywordHits(answer, keywords) >= minKeywords;
  };

  // ── Answer JSON parse ─────────────────────────────────────────────────────
  // Expected: [{"id":"…","choice":0},{"id":"…","text":"…"}]

  public type ParsedAnswer = {
    id : Text;
    choice : ?Nat;
    text : ?Text;
  };

  public type ParsedSubmission = {
    seed : ?Text;
    answers : [ParsedAnswer];
  };

  // ── Seeded MC choice permutation (matches frontend draw-time shuffle) ─────
  // perm[displayIndex] = original bank index shown at that display slot.

  func hashSeed(s : Text) : Nat {
    var h : Nat = 5381;
    for (c in s.chars()) {
      let n = Nat32.toNat(Char.toNat32(c));
      h := (h * 33 + n) % 2_147_483_647;
    };
    h;
  };

  func lcgNext(state : Nat) : Nat {
    (state * 1_103_515_245 + 12_345) % 2_147_483_648;
  };

  func swapAt(arr : [Nat], i : Nat, j : Nat) : [Nat] {
    if (i >= arr.size() or j >= arr.size()) { return arr };
    let vi = arr[i];
    let vj = arr[j];
    Array.tabulate<Nat>(
      arr.size(),
      func(k) {
        if (k == i) { vj } else if (k == j) { vi } else { arr[k] };
      },
    );
  };

  public func choicePermutation(n : Nat, seed : Text, questionId : Text) : [Nat] {
    if (n == 0) { return [] };
    var perm = Array.tabulate<Nat>(n, func(i) { i });
    var state = hashSeed(seed # ":" # questionId);
    var i = n;
    while (i > 1) {
      i -= 1;
      state := lcgNext(state);
      let j = state % (i + 1);
      perm := swapAt(perm, i, j);
    };
    perm;
  };

  func mcDisplayIndexCorrect(
    q : Types.QuestionFull,
    displayIdx : Nat,
    seed : Text,
  ) : Bool {
    let perm = choicePermutation(q.choices.size(), seed, q.id);
    if (displayIdx >= perm.size()) { return false };
    perm[displayIdx] == q.correctIndex;
  };

  func mapGet(entries : [(Text, ICRC7.Value)], key : Text) : ?ICRC7.Value {
    for ((k, v) in entries.vals()) {
      if (Text.equal(k, key)) { return ?v };
    };
    null;
  };

  func parseOneAnswer(v : ICRC7.Value) : ?ParsedAnswer {
    switch (v) {
      case (#Map entries) {
        let id = switch (mapGet(entries, "id")) {
          case (?#Text t) t;
          case _ { return null };
        };
        var choice : ?Nat = null;
        var text : ?Text = null;
        switch (mapGet(entries, "choice")) {
          case (?#Nat n) { choice := ?n };
          case _ {};
        };
        switch (mapGet(entries, "text")) {
          case (?#Text t) { text := ?t };
          case _ {};
        };
        ?{ id; choice; text };
      };
      case _ null;
    };
  };

  public func parseAnswersJson(raw : Text) : Result.Result<ParsedSubmission, Text> {
    switch (JsonMini.parse(raw.encodeUtf8())) {
      case (#err e) { #err("Invalid answers JSON: " # e) };
      case (#ok(#Array items)) {
        var out : [ParsedAnswer] = [];
        for (item in items.vals()) {
          switch (parseOneAnswer(item)) {
            case (?a) { out := out.concat([a]) };
            case null { return #err("Malformed answer object") };
          };
        };
        #ok({ seed = null; answers = out });
      };
      case (#ok(#Map entries)) {
        var seed : ?Text = null;
        switch (mapGet(entries, "seed")) {
          case (?#Text t) {
            if (t.size() > 0 and t.size() <= 128) { seed := ?t };
          };
          case _ {};
        };
        switch (mapGet(entries, "answers")) {
          case (?#Array items) {
            var out : [ParsedAnswer] = [];
            for (item in items.vals()) {
              switch (parseOneAnswer(item)) {
                case (?a) { out := out.concat([a]) };
                case null { return #err("Malformed answer object") };
              };
            };
            #ok({ seed; answers = out });
          };
          case _ { #err("answersJson object must include answers array") };
        };
      };
      case (#ok _) { #err("answersJson must be a JSON array or {seed,answers} object") };
    };
  };

  // ── Progress JSON ─────────────────────────────────────────────────────────

  public func emptyProgressJson() : Text {
    "{\"version\":1,\"lessons\":{}}";
  };

  /// Minimal lesson-field extractor (tolerant of missing keys).
  public func readLessonProgress(json : Text, lessonId : Text) : Types.LessonProgress {
    // Default empty
    var attempts : Nat = 0;
    var bestScorePct : Nat = 0;
    var passed = false;
    var passedAt : Int = 0;
    var quizVersion : Nat = 0;
    switch (JsonMini.parse(json.encodeUtf8())) {
      case (#ok(#Map root)) {
        switch (mapGet(root, "lessons")) {
          case (?#Map lessons) {
            switch (mapGet(lessons, lessonId)) {
              case (?#Map entry) {
                switch (mapGet(entry, "attempts")) {
                  case (?#Nat n) { attempts := n };
                  case _ {};
                };
                switch (mapGet(entry, "bestScorePct")) {
                  case (?#Nat n) { bestScorePct := n };
                  case _ {};
                };
                switch (mapGet(entry, "passed")) {
                  case (?#Text t) { passed := t == "true" };
                  case _ {};
                };
                switch (mapGet(entry, "passedAt")) {
                  case (?#Int i) { passedAt := i };
                  case (?#Nat n) { passedAt := n };
                  case _ {};
                };
                switch (mapGet(entry, "quizVersion")) {
                  case (?#Nat n) { quizVersion := n };
                  case _ {};
                };
              };
              case _ {};
            };
          };
          case _ {};
        };
      };
      case _ {};
    };
    { lessonId; attempts; bestScorePct; passed; passedAt; quizVersion };
  };

  public func lessonPassedInJson(json : Text, lessonId : Text) : Bool {
    readLessonProgress(json, lessonId).passed;
  };

  /// Rebuild progress JSON after updating one lesson. Uses JsonMini-compatible literals
  /// (booleans as {"Text":"true"} style is awkward — we emit plain JSON bools; our reader
  /// also accepts #Text "true". Writer emits standard JSON for the frontend.)
  public func upsertLessonProgress(
    prevJson : Text,
    lessonId : Text,
    attempts : Nat,
    bestScorePct : Nat,
    passed : Bool,
    passedAt : Int,
    quizVersion : Nat,
  ) : Text {
    // Collect existing lesson keys we know about (M1 for now + this lesson).
    var ids : [Text] = QuizBank.M1_LESSON_IDS;
    if (Array.find<Text>(ids, func(x) { Text.equal(x, lessonId) }) == null) {
      ids := ids.concat([lessonId]);
    };
    var body = "{\"version\":1,\"lessons\":{";
    var first = true;
    for (id in ids.vals()) {
      let cur = if (Text.equal(id, lessonId)) {
        { lessonId = id; attempts; bestScorePct; passed; passedAt; quizVersion };
      } else {
        readLessonProgress(prevJson, id);
      };
      // Skip never-attempted lessons to keep blob small
      if (cur.attempts == 0 and not cur.passed) {
        // omit
      } else {
        if (not first) { body #= "," };
        first := false;
        let passedLit = if (cur.passed) { "true" } else { "false" };
        body #= "\"" # id # "\":{\"attempts\":" # Nat.toText(cur.attempts)
          # ",\"bestScorePct\":" # Nat.toText(cur.bestScorePct)
          # ",\"passed\":" # passedLit
          # ",\"passedAt\":" # Int.toText(cur.passedAt)
          # ",\"quizVersion\":" # Nat.toText(cur.quizVersion) # "}";
      };
    };
    body #= "}}";
    Sanitize.sanitizeText(body, MAX_PROGRESS_JSON_CHARS);
  };

  public func listProgressEntries(json : Text) : [Types.LessonProgress] {
    var out : [Types.LessonProgress] = [];
    for (id in QuizBank.M1_LESSON_IDS.vals()) {
      let p = readLessonProgress(json, id);
      if (p.attempts > 0 or p.passed) {
        out := out.concat([p]);
      };
    };
    out;
  };

  /// Merge progress blobs across linked principals (best-of per lesson).
  public func mergeProgressJson(blobs : [Text]) : Text {
    var merged = emptyProgressJson();
    for (id in QuizBank.M1_LESSON_IDS.vals()) {
      var attempts : Nat = 0;
      var bestScorePct : Nat = 0;
      var passed = false;
      var passedAt : Int = 0;
      var quizVersion : Nat = 0;
      for (b in blobs.vals()) {
        let p = readLessonProgress(b, id);
        attempts += p.attempts;
        if (p.bestScorePct > bestScorePct) { bestScorePct := p.bestScorePct };
        if (p.passed) {
          passed := true;
          if (passedAt == 0 or (p.passedAt != 0 and p.passedAt < passedAt)) {
            passedAt := p.passedAt;
          };
        };
        if (p.quizVersion > quizVersion) { quizVersion := p.quizVersion };
      };
      if (attempts > 0 or passed) {
        merged := upsertLessonProgress(
          merged,
          id,
          attempts,
          bestScorePct,
          passed,
          passedAt,
          quizVersion,
        );
      };
    };
    merged;
  };

  // ── Grade attempt ─────────────────────────────────────────────────────────

  public type GradeResult = {
    correct : Nat;
    total : Nat;
    scorePct : Nat;
    passed : Bool;
    questionResults : [Types.QuestionGrade];
  };

  public func gradeAttempt(
    bank : QuizBank.Bank,
    submission : ParsedSubmission,
  ) : Result.Result<GradeResult, Text> {
    let answers = submission.answers;
    let need = bank.drawCount;
    if (answers.size() != need) {
      return #err(
        "Expected " # Nat.toText(need) # " answers, got " # Nat.toText(answers.size()),
      );
    };
    // MC grading uses seeded display-index remap — reject legacy payloads without seed.
    for (a in answers.vals()) {
      switch (QuizBank.findQuestion(bank, a.id)) {
        case (?{ kind = #mc }) {
          switch (submission.seed) {
            case null {
              return #err("Missing attempt seed — refresh and resubmit the quiz");
            };
            case (?_) {};
          };
        };
        case _ {};
      };
    };
    // Distinct IDs
    var seen : [Text] = [];
    var correct : Nat = 0;
    var questionResults : [Types.QuestionGrade] = [];
    for (a in answers.vals()) {
      switch (Array.find<Text>(seen, func(x) { Text.equal(x, a.id) })) {
        case (?_) { return #err("Duplicate question id: " # a.id) };
        case null { seen := seen.concat([a.id]) };
      };
      switch (QuizBank.findQuestion(bank, a.id)) {
        case null { return #err("Unknown question id: " # a.id) };
        case (?q) {
          let ok = switch (q.kind) {
            case (#mc) {
              switch (a.choice) {
                case (?idx) {
                  switch (submission.seed) {
                    case (?s) { mcDisplayIndexCorrect(q, idx, s) };
                    case null { false };
                  };
                };
                case null { false };
              };
            };
            case (#sa) {
              switch (a.text) {
                case (?t) { gradeSa(t, q.acceptedKeywords, q.minKeywords) };
                case null { false };
              };
            };
          };
          if (ok) { correct += 1 };
          questionResults := questionResults.concat([{ id = a.id; correct = ok }]);
        };
      };
    };
    let total = need;
    let scorePct = if (total == 0) { 0 } else { (correct * 100) / total };
    let passed = correct >= bank.passCorrect;
    #ok({ correct; total; scorePct; passed; questionResults });
  };

  // ── Verified-pass mint (internal only — callers must be gated) ────────────

  public func maybeMintModuleAndCapstone(
    nextAchievementTokenId : { var value : Nat },
    icrc7Owners : Map.Map<Nat, ICRC7.Account>,
    icrc7Balances : Map.Map<Principal, Set.Set<Nat>>,
    badgeRegistry : Map.Map<Nat, AchievementTypes.BadgeRecord>,
    badgeByOwnerType : Map.Map<Text, Nat>,
    linkedWallets : Map.Map<Principal, [Principal]>,
    walletToIdentity : Map.Map<Principal, Principal>,
    owner : Principal,
    progressJson : Text,
    moduleId : Text,
  ) : {
    moduleBadgeMinted : ?Nat;
    capstoneBadgeMinted : ?Nat;
  } {
    var moduleBadgeMinted : ?Nat = null;
    var capstoneBadgeMinted : ?Nat = null;

    // Module mint when all known lessons for that module are passed.
    if (moduleId == "module-01-soil-biology") {
      var allPassed = true;
      for (lid in QuizBank.M1_LESSON_IDS.vals()) {
        if (not lessonPassedInJson(progressJson, lid)) { allPassed := false };
      };
      if (allPassed) {
        switch (
          AchievementsLib.mintBadge(
            nextAchievementTokenId,
            icrc7Owners,
            icrc7Balances,
            badgeRegistry,
            badgeByOwnerType,
            linkedWallets,
            walletToIdentity,
            owner,
            Types.BADGE_SOIL_BIOLOGY,
            "completed",
            "{\"module\":\"module-01-soil-biology\"}",
            #masterclass,
          )
        ) {
          case (#ok tid) { moduleBadgeMinted := ?tid };
          case (#err _) {};
        };
      };
    };

    // Capstone: all six module badges present (idempotent). Unreachable until M2–M6 ship.
    var allModules = true;
    for (badgeType in QuizBank.ALL_MODULE_BADGES.vals()) {
      let principals = LinkedIdentity.principalsForUser(
        owner,
        linkedWallets,
        walletToIdentity,
      );
      switch (
        AchievementsLib.findExistingBadgeToken(badgeByOwnerType, principals, badgeType)
      ) {
        case null { allModules := false };
        case (?_) {};
      };
    };
    if (allModules) {
      switch (
        AchievementsLib.mintBadge(
          nextAchievementTokenId,
          icrc7Owners,
          icrc7Balances,
          badgeRegistry,
          badgeByOwnerType,
          linkedWallets,
          walletToIdentity,
          owner,
          Types.BADGE_CERTIFIED_GROWER,
          "gold",
          "{\"capstone\":true}",
          #masterclass,
        )
      ) {
        case (#ok tid) { capstoneBadgeMinted := ?tid };
        case (#err _) {};
      };
    };

    { moduleBadgeMinted; capstoneBadgeMinted };
  };

  public func now() : Int { Time.now() };
};
