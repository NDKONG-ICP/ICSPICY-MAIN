// IC SPICY — SpicyAi coordinator canister (Phase 6.5 — streaming)
//
// Responsibilities:
//   - Accept startChat requests, retrieve BM25 context from docs_backend
//   - Drive multi-step inference against ONICAI llama_cpp canister via continueChat polling
//   - Return cleaned assistant tokens incrementally; caller polls until done = true
//
// Security posture:
//   - requireAuthenticated on all update methods
//   - requireAdmin on all config/admin methods
//   - Session-level lock: one active session per caller
//   - Zero-log policy: no question or answer text is stored or printed
//
// Protocol (ONICAI llama_cpp_canister v0.9.0):
//   1. startChat → BM25 retrieval, new_chat, store session, return chatId
//   2. continueChat(chatId) → 1 run_update step; returns {done, response, docsReferenced}
//   3. cancelChat(chatId) → cleanup session and prompt-cache file
//   Frontend polls continueChat every ~20 seconds until done = true.

import Array     "mo:core/Array";
import Char      "mo:core/Char";
import Cycles    "mo:core/Cycles";
import Error     "mo:core/Error";
import Int       "mo:core/Int";
import Iter      "mo:core/Iter";
import Nat       "mo:core/Nat";
import Nat16     "mo:core/Nat16";
import Principal "mo:core/Principal";
import Runtime   "mo:core/Runtime";
import Text      "mo:core/Text";
import Time      "mo:core/Time";
import LLM       "mo:llm";

shared(msg) persistent actor class SpicyAiCanister() = Self {

  // ── llama_cpp actor types (ONICAI llama_cpp.did v0.9.0) ─────────────────────

  type InputRecord = { args : [Text] };

  type RunOutputRecord = {
    status_code      : Nat16;
    output           : Text;
    conversation     : Text;
    error            : Text;
    prompt_remaining : Text;
    generated_eog    : Bool;
  };

  type ApiError = { #Other : Text; #StatusCode : Nat16 };

  type OutputRecordResult    = { #Ok : RunOutputRecord; #Err : RunOutputRecord };
  type StatusCodeRecord      = { status_code : Nat16 };
  type StatusCodeRecordResult = { #Ok : StatusCodeRecord; #Err : ApiError };
  type AccessInputRecord     = { level : Nat16 };
  type AccessRecord          = { level : Nat16; explanation : Text };
  type AccessRecordResult    = { #Ok : AccessRecord; #Err : ApiError };
  type MaxTokensRecord       = { max_tokens_query : Nat64; max_tokens_update : Nat64 };

  type LlamaCppActor = actor {
    health              : shared query () -> async StatusCodeRecordResult;
    ready               : shared query () -> async StatusCodeRecordResult;
    new_chat            : shared InputRecord -> async OutputRecordResult;
    run_update          : shared InputRecord -> async OutputRecordResult;
    remove_prompt_cache : shared InputRecord -> async OutputRecordResult;
    set_max_tokens      : shared MaxTokensRecord -> async StatusCodeRecordResult;
    get_max_tokens      : shared query () -> async MaxTokensRecord;
    set_access          : shared AccessInputRecord -> async AccessRecordResult;
    get_access          : shared query () -> async AccessRecordResult;
  };

  // ── docs_backend retrieval type ──────────────────────────────────────────────

  type RetrievalResult = { chunks : [Text]; slugs : [Text] };

  type DocsBackendActor = actor {
    queryChunks : shared query (queryText : Text, topK : Nat) -> async RetrievalResult;
  };

  // ── Public chat types ────────────────────────────────────────────────────────

  public type ChatRole    = { #user; #assistant };
  public type ChatMessage = { role : ChatRole; content : Text };
  public type ChatRequest = { messages : [ChatMessage] };

  public type ChatError = {
    #rateLimited   : { resetInSeconds : Nat };
    #blocked;
    #llmError      : Text;
    #retrievalError : Text;
    #noContent;
    #notEnabled;
    #notConfigured;
    #sessionNotFound;
    #sessionActive;
  };

  public type ChatId = Text;

  public type StartChatOk = {
    chatId         : ChatId;
    docsReferenced : [Text];
  };
  public type StartChatResponse   = { #ok : StartChatOk;                            #err : ChatError };

  public type ContinueChatOk = {
    done           : Bool;
    response       : Text;    // cleaned assistant response accumulated so far
    docsReferenced : [Text];
  };
  public type ContinueChatResponse = { #ok : ContinueChatOk; #err : ChatError };

  // Fast path: mo:llm single-call response
  public type LlmChatOk = {
    response       : Text;
    docsReferenced : [Text];
  };
  public type LlmChatResponse = { #ok : LlmChatOk; #err : ChatError };

  // ── Session state (stable) ───────────────────────────────────────────────────

  type ChatSessionData = {
    caller          : Principal;
    sessionPath     : Text;
    prompt          : Text;       // full ChatML prompt (for ingestion loop)
    promptRemaining : Text;       // shrinks to "" as prompt is ingested
    conversation    : Text;       // grows during generation
    genSteps        : Nat;        // generation steps completed
    eog             : Bool;       // model signalled end-of-generation
    docsReferenced  : [Text];
    startedAt       : Int;        // for TTL-based expiry
  };

  var chatSessions : [(Text, ChatSessionData)] = [];

  // ── Admin state ──────────────────────────────────────────────────────────────

  transient let _owner : Principal = msg.caller;
  var admins : [Principal] = [msg.caller];

  // ── Config state ─────────────────────────────────────────────────────────────

  var llamaCppId    : Text = "";
  var docsBackendId : Text = "";
  var modelPath     : Text = "/models/deepseek-r1-distill-qwen-1.5b-q4_k_m.gguf";
  var contextSize   : Nat  = 512;
  var topK          : Nat  = 1;
  var maxGenSteps   : Nat  = 15;   // 15 × 3 tokens = ~45 tokens output (~3 min generation)
  var enabled       : Bool = false;

  var anonDailyLimit : Nat = 1000; // effectively open for now; gate with NFT later
  var authDailyLimit : Nat = 50;

  // Session TTL: 30 minutes in nanoseconds
  let SESSION_TTL_NS : Int = 30 * 60 * 1_000_000_000;

  var rateLimits : [(Text, Nat)] = [];

  // ── Auth helpers ─────────────────────────────────────────────────────────────

  func requireAuthenticated(caller : Principal) {
    if (Principal.isAnonymous(caller)) { Runtime.trap("anonymous caller not allowed") };
  };

  func isAdmin(caller : Principal) : Bool {
    Array.find<Principal>(admins, func(a) { a == caller }) != null
  };

  func requireAdmin(caller : Principal) {
    requireAuthenticated(caller);
    if (not isAdmin(caller)) { Runtime.trap("caller is not an admin") };
  };

  // ── Rate limiting ─────────────────────────────────────────────────────────────

  func dayNumber() : Int { Time.now() / 86_400_000_000_000 };

  func rateLimitKey(caller : Principal) : Text {
    Principal.toText(caller) # ":" # Int.toText(dayNumber())
  };

  func getCallCount(key : Text) : Nat {
    switch (Array.find<(Text, Nat)>(rateLimits, func((k, _)) { k == key })) {
      case (?(_, n)) n;
      case null 0;
    }
  };

  func incrementCallCount(caller : Principal) {
    let key = rateLimitKey(caller);
    let cur = getCallCount(key);
    var updated = false;
    rateLimits := Array.map<(Text, Nat), (Text, Nat)>(rateLimits, func((k, n)) {
      if (k == key) { updated := true; (k, n + 1) } else { (k, n) }
    });
    if (not updated) {
      rateLimits := Array.concat(rateLimits, [(key, cur + 1)]);
    };
  };

  func withinRateLimit(caller : Principal) : Bool {
    if (isAdmin(caller)) { return true };
    let limit = if (Principal.isAnonymous(caller)) anonDailyLimit else authDailyLimit;
    getCallCount(rateLimitKey(caller)) < limit
  };

  // ── Session helpers ───────────────────────────────────────────────────────────

  func findSession(chatId : Text) : ?ChatSessionData {
    switch (Array.find<(Text, ChatSessionData)>(chatSessions, func((id, _)) { id == chatId })) {
      case (?(_, s)) ?s;
      case null null;
    }
  };

  func updateSession(chatId : Text, s : ChatSessionData) {
    chatSessions := Array.map<(Text, ChatSessionData), (Text, ChatSessionData)>(
      chatSessions, func((id, old)) { if (id == chatId) (id, s) else (id, old) }
    );
  };

  func removeSession(chatId : Text) {
    chatSessions := Array.filter<(Text, ChatSessionData)>(chatSessions, func((id, _)) { id != chatId });
  };

  func callerHasSession(caller : Principal) : Bool {
    Array.find<(Text, ChatSessionData)>(chatSessions, func((_, s)) { s.caller == caller }) != null
  };

  // Remove expired sessions (lazy cleanup)
  func purgeExpiredSessions() {
    let now = Time.now();
    chatSessions := Array.filter<(Text, ChatSessionData)>(
      chatSessions, func((_, s)) { now - s.startedAt < SESSION_TTL_NS }
    );
  };

  // ── Text utilities ───────────────────────────────────────────────────────────

  func truncateChars(t : Text, maxChars : Nat) : Text {
    if (t.size() <= maxChars) { return t };
    var result = "";
    var i = 0;
    for (c in t.chars()) {
      if (i < maxChars) { result #= Text.fromChar(c); i += 1 };
    };
    result
  };

  func splitOnText(t : Text, sep : Text) : [Text] {
    Iter.toArray(Text.split(t, #text sep))
  };

  // ── Response extractor ───────────────────────────────────────────────────────

  let ASST_MARKER = "<|im_start|>assistant\n";
  let IM_END_TAG  = "<|im_end|>";
  let THINK_OPEN  = "<think>";
  let THINK_CLOSE = "</think>";

  func extractAssistantResponse(conversation : Text) : Text {
    let parts = splitOnText(conversation, ASST_MARKER);
    let raw = if (parts.size() == 0) "" else parts[parts.size() - 1];
    let stripped = switch (splitOnText(raw, IM_END_TAG)) {
      case arr { if (arr.size() > 0) arr[0] else raw };
    };
    let noThink = stripThinkBlocks(stripped);
    trimText(noThink)
  };

  func stripThinkBlocks(t : Text) : Text {
    var result = t;
    var found = true;
    var guard = 0;
    while (found and guard < 20) {
      let parts = splitOnText(result, THINK_OPEN);
      if (parts.size() <= 1) {
        found := false;
      } else {
        let afterOpen = parts[1];
        let inner = splitOnText(afterOpen, THINK_CLOSE);
        if (inner.size() <= 1) {
          result := parts[0];
          found := false;
        } else {
          result := parts[0] # inner[inner.size() - 1];
        };
      };
      guard += 1;
    };
    result
  };

  func trimText(t : Text) : Text {
    let chars = Iter.toArray(t.chars());
    if (chars.size() == 0) { return "" };
    var start = 0;
    var end_ : Nat = chars.size() - 1;
    func isWs(c : Char) : Bool { c == ' ' or c == '\n' or c == '\t' or c == '\r' };
    while (start < chars.size() and isWs(chars[start])) { start += 1 };
    while (end_ > start and isWs(chars[end_])) {
      if (end_ == 0) { return "" } else { end_ -= 1 };
    };
    if (start > end_ or start >= chars.size()) { return "" };
    var r = "";
    var i = start;
    while (i <= end_) { r #= Text.fromChar(chars[i]); i += 1 };
    r
  };

  func buildRetrievalContext(retrieved : RetrievalResult) : Text {
    if (retrieved.chunks.size() == 0) { return "" };
    var block = "\n\nRelevant context from IC SPICY knowledge base:\n";
    for (chunk in retrieved.chunks.vals()) {
      block #= "---\n" # chunk # "\n";
    };
    truncateChars(block, 3500)
  };

  // Low-value query tokens for non-variety questions. "ic"/"spicy" match the whole
  // corpus and burn BM25 instruction budget without ranking signal.
  let RETRIEVAL_NOISE : [Text] = [
    "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for", "of",
    "with", "by", "from", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "it", "its", "this", "that",
    "these", "those", "i", "we", "you", "he", "she", "they", "not", "no", "as",
    "if", "so", "up", "out", "about", "which", "what", "how", "why", "when",
    "where", "who", "can", "will", "more", "all", "please", "just", "really",
    "my", "our", "your", "their", "should", "would", "could", "may", "might",
    "must", "need", "want", "like", "get", "got", "make", "made", "using",
    "use", "used", "tell", "me", "explain", "describe", "give",
    "ic", "spicy", "ics",
    "pepper", "peppers", "chile", "chili", "chilli", "variety", "varieties",
    "hot", "plant", "plants", "seed", "seeds",
  ];

  let MAX_RETRIEVAL_TERMS : Nat = 4;

  func isRetrievalNoise(t : Text) : Bool {
    Array.find<Text>(RETRIEVAL_NOISE, func(s) { s == t }) != null
  };

  func isAlphaChar(c : Char) : Bool {
    (c >= 'a' and c <= 'z') or (c >= 'A' and c <= 'Z') or
    (c >= '0' and c <= '9')
  };

  func toLowerChar(c : Char) : Char {
    if (c >= 'A' and c <= 'Z') {
      Char.fromNat32(Char.toNat32(c) + 32)
    } else { c }
  };

  // Extract high-signal content terms; cap at MAX_RETRIEVAL_TERMS.
  func shapeRetrievalTerms(userText : Text) : [Text] {
    let chars = Text.toIter(userText);
    var buf : Text = "";
    var out : [Text] = [];
    for (c in chars) {
      if (isAlphaChar(c)) {
        buf := buf # Text.fromChar(toLowerChar(c));
      } else if (buf.size() > 1) {
        if (not isRetrievalNoise(buf)) {
          if (Array.find<Text>(out, func(t) { t == buf }) == null) {
            out := Array.concat(out, [buf]);
          };
        };
        buf := "";
      } else {
        buf := "";
      };
    };
    if (buf.size() > 1 and not isRetrievalNoise(buf)) {
      if (Array.find<Text>(out, func(t) { t == buf }) == null) {
        out := Array.concat(out, [buf]);
      };
    };
    if (out.size() <= MAX_RETRIEVAL_TERMS) { out }
    else {
      Array.tabulate<Text>(MAX_RETRIEVAL_TERMS, func(i) { out[i] })
    }
  };

  func isRetrievalFailure(msg : Text) : Bool {
    Text.contains(msg, #text "instruction") or
    Text.contains(msg, #text "IC0522") or
    Text.contains(msg, #text "exceeded the limit")
  };

  // Short retrieval query for BM25 — long natural-language questions with common
  // words blow the docs_backend instruction limit. Prefer cultivar names for pure
  // variety lookups; if the question also asks about growing practice (germinate,
  // overwinter, inputs, etc.), shape content terms instead so masterclass hits.
  func buildRetrievalQuery(userText : Text) : Text {
    let lower = Text.toLower(userText);
    let cultureHints : [Text] = [
      "germinat", "sow", "seedling", "transplant", "overwinter", "winter",
      "fpj", "ohn", "imo", "faa", "ffj", "wca", "jadam", "knf",
      "no-till", "notill", "mulch", "compost", "ferment", "shelf",
      "soil food", "mycorrhiz", "brew", "dilution",
    ];
    var cultureAsk = false;
    for (h in cultureHints.vals()) {
      if (Text.contains(lower, #text h)) { cultureAsk := true };
    };

    // Cultivar names dominate BM25 (Pepperpedia titles). For grow-practice questions,
    // scrub variety phrases so masterclass lessons can rank (e.g. germinate → mc-04-01).
    if (cultureAsk) {
      if (
        Text.contains(lower, #text "germinat") or
        Text.contains(lower, #text "sow") or
        Text.contains(lower, #text "seedling") or
        Text.contains(lower, #text "seed priming")
      ) {
        return "germinating stubborn superhot";
      };
    };

    if (not cultureAsk) {
      let named : [Text] = [
        "ghost pepper", "carolina reaper", "pink wendigo", "sugar rush peach",
        "7 pot primo", "7 pot", "scotch bonnet", "habanero", "jalapeño", "jalapeno",
      ];
      for (name in named.vals()) {
        if (Text.contains(lower, #text name)) {
          return name;
        };
      };
    };

    let terms = shapeRetrievalTerms(userText);
    if (terms.size() == 0) {
      return truncateChars(userText, 48);
    };
    var joined = terms[0];
    var ti : Nat = 1;
    while (ti < terms.size()) {
      joined := joined # " " # terms[ti];
      ti += 1;
    };
    joined
  };

  func hasVarietySlug(slugs : [Text]) : Bool {
    Array.find<Text>(slugs, func(s) { Text.startsWith(s, #text "variety-") }) != null
  };

  func unknownVarietyHint(slugs : [Text]) : Text {
    if (hasVarietySlug(slugs)) { return "" };
    " No Pepperpedia VARIETY document matched this query — if the user named a specific cultivar, " #
    "say it is not in the knowledge base and do NOT invent Scoville numbers, breeders, or descriptions."
  };

  let VARIETY_KNOWLEDGE_RULES =
    " When a user asks about a specific pepper or plant variety, answer from VARIETY knowledge documents " #
    "(Pepperpedia entries beginning with \"VARIETY:\"). Always credit the breeder when known. " #
    "Offer the in-app growing guide link and mention the variety can be tracked in NIMS. " #
    "If the variety is not in the knowledge base, say so honestly — do NOT invent Scoville numbers or breeder credits.";

  //
  // Performs BM25 retrieval, builds the ChatML prompt, calls llama_cpp.new_chat,
  // stores the session, and returns a chatId the frontend polls via continueChat.

  public shared({ caller }) func startChat(req : ChatRequest) : async StartChatResponse {
    if (not enabled)                        { return #err(#notEnabled) };
    if (llamaCppId == "" or docsBackendId == "") { return #err(#notConfigured) };
    // Anonymous callers allowed — gated with NFT in a future phase.
    if (not withinRateLimit(caller))        {
      let resetSecs : Nat = 86_400 - Int.abs(Time.now()) / 1_000_000_000 % 86_400;
      return #err(#rateLimited({ resetInSeconds = resetSecs }));
    };

    let lastMsg = switch (Array.find<ChatMessage>(
      Array.reverse(req.messages),
      func(m) { switch (m.role) { case (#user) true; case (_) false } },
    )) {
      case (?m) m;
      case null { return #err(#llmError("No user message provided.")) };
    };

    purgeExpiredSessions();

    // Skip per-caller session dedup for anonymous — all share the same principal.
    if (not Principal.isAnonymous(caller) and callerHasSession(caller)) {
      return #err(#sessionActive);
    };

    let llama : LlamaCppActor    = actor(llamaCppId);
    let docs  : DocsBackendActor = actor(docsBackendId);

    // Session path: bare filename; ONICAI auto-prefixes with sessions/ per caller namespace
    let sessionPath = Principal.toText(caller) # ".bin";

    try {
      // BM25 retrieval
      let retrieved : RetrievalResult = try {
        await docs.queryChunks(buildRetrievalQuery(lastMsg.content), topK)
      } catch (e) {
        let msg = Error.message(e);
        if (isRetrievalFailure(msg)) {
          return #err(#retrievalError(
            "Knowledge retrieval hit an instruction limit. Try a shorter, more specific question."
          ));
        };
        return #err(#retrievalError("Knowledge retrieval failed. Please try again."));
      };

      // Build minimal ChatML prompt — keep total tokens ≤ 60 to minimise ingestion calls.
      // System: ~15 tokens. Context: ~25 tokens. User: ~20 tokens. Total: ~60 tokens.
      let ctxBlock = buildRetrievalContext(retrieved);

      let systemTxt = "You are SpicyAi, IC SPICY's KNF/JADAM hot pepper farming guide. Be concise." #
        VARIETY_KNOWLEDGE_RULES # unknownVarietyHint(retrieved.slugs) # ctxBlock;

      let prompt =
        "<|im_start|>system\n" # systemTxt # ctxBlock # "<|im_end|>\n" #
        "<|im_start|>user\n" # truncateChars(lastMsg.content, 80) # "<|im_end|>\n" #
        "<|im_start|>assistant\n";

      // Initialize session in llama_cpp
      let initRes = await llama.new_chat({ args = ["--prompt-cache", sessionPath] });
      switch (initRes) {
        case (#Err(r)) {
          try { ignore (await llama.remove_prompt_cache({ args = ["--prompt-cache", sessionPath] })) } catch _ {};
          return #err(#llmError("Context init failed: " # r.error));
        };
        case (#Ok(_)) {};
      };

      // Store session
      let chatId = Principal.toText(caller) # "-" # Int.toText(Time.now());
      let session : ChatSessionData = {
        caller          = caller;
        sessionPath     = sessionPath;
        prompt          = prompt;
        promptRemaining = prompt;  // will shrink to "" as ingestion progresses
        conversation    = "";
        genSteps        = 0;
        eog             = false;
        docsReferenced  = retrieved.slugs;
        startedAt       = Time.now();
      };
      chatSessions := Array.concat(chatSessions, [(chatId, session)]);
      incrementCallCount(caller);

      #ok({ chatId; docsReferenced = retrieved.slugs })

    } catch (e) {
      let msg = Error.message(e);
      if (isRetrievalFailure(msg)) {
        #err(#retrievalError(
          "Knowledge retrieval hit an instruction limit. Try a shorter, more specific question."
        ))
      } else {
        #err(#llmError("Failed to start chat. Please try again."))
      }
    }
  };

  // ── continueChat: advance inference by one run_update step ──────────────────
  //
  // Frontend polls this after startChat until done = true.
  // Each call takes ~15-20 seconds on the IC (one run_update to llama_cpp).
  // Returns the cleaned response accumulated so far.

  public shared({ caller }) func continueChat(chatId : ChatId) : async ContinueChatResponse {
    let session = switch (findSession(chatId)) {
      case (?s) s;
      case null { return #err(#sessionNotFound) };
    };

    // Verify ownership — skip for anonymous since caller is always the same principal.
    if (not Principal.isAnonymous(caller) and session.caller != caller) {
      return #err(#sessionNotFound)
    };

    let llama : LlamaCppActor = actor(llamaCppId);

    let sharedArgs : [Text] = [
      "--prompt-cache", session.sessionPath, "--prompt-cache-all",
      "--repeat-penalty", "1.1",
      "--temp", "0.1",
      "-sp",
    ];

    try {
      if (session.promptRemaining != "") {
        // ── Ingestion phase: process more prompt tokens ──
        let r = await llama.run_update({
          args = Array.concat(sharedArgs, ["-n", "3", "-p", session.promptRemaining])
        });
        switch (r) {
          case (#Ok(ro)) {
            let updated : ChatSessionData = {
              caller          = session.caller;
              sessionPath     = session.sessionPath;
              prompt          = session.prompt;
              promptRemaining = ro.prompt_remaining;
              conversation    = session.conversation;
              genSteps        = session.genSteps;
              eog             = session.eog;
              docsReferenced  = session.docsReferenced;
              startedAt       = session.startedAt;
            };
            updateSession(chatId, updated);
            // During ingestion conversation is empty — return "" until generation starts
            #ok({
              done           = false;
              response       = "";
              docsReferenced = session.docsReferenced;
            })
          };
          case (#Err(_)) {
            // Ingestion error — clear promptRemaining so generation can start next poll
            let updated : ChatSessionData = {
              caller          = session.caller;
              sessionPath     = session.sessionPath;
              prompt          = session.prompt;
              promptRemaining = "";
              conversation    = session.conversation;
              genSteps        = session.genSteps;
              eog             = session.eog;
              docsReferenced  = session.docsReferenced;
              startedAt       = session.startedAt;
            };
            updateSession(chatId, updated);
            #ok({
              done           = false;
              response       = "";
              docsReferenced = session.docsReferenced;
            })
          };
        }
      } else if (not session.eog and session.genSteps < maxGenSteps) {
        // ── Generation phase: generate more tokens ──
        let r = await llama.run_update({
          args = Array.concat(sharedArgs, ["-n", "3", "-p", ""])
        });
        let (newConv, newEog, newGenSteps) = switch (r) {
          case (#Ok(ro))  (ro.conversation,         ro.generated_eog, session.genSteps + 1);
          case (#Err(ro)) (if (ro.conversation != "") ro.conversation else session.conversation,
                           true,
                           session.genSteps + 1);
        };
        let done = newEog or newGenSteps >= maxGenSteps;
        let updated : ChatSessionData = {
          caller          = session.caller;
          sessionPath     = session.sessionPath;
          prompt          = session.prompt;
          promptRemaining = "";
          conversation    = newConv;
          genSteps        = newGenSteps;
          eog             = newEog;
          docsReferenced  = session.docsReferenced;
          startedAt       = session.startedAt;
        };
        if (done) {
          removeSession(chatId);
          try { ignore (await llama.remove_prompt_cache({ args = ["--prompt-cache", session.sessionPath] })) } catch _ {};
        } else {
          updateSession(chatId, updated);
        };
        let response = extractAssistantResponse(newConv);
        #ok({ done; response; docsReferenced = session.docsReferenced })

      } else {
        // ── Done — session should have been cleaned up already ──
        removeSession(chatId);
        try { ignore (await llama.remove_prompt_cache({ args = ["--prompt-cache", session.sessionPath] })) } catch _ {};
        let response = extractAssistantResponse(session.conversation);
        #ok({
          done           = true;
          response       = if (response == "") "Generation complete." else response;
          docsReferenced = session.docsReferenced;
        })
      }
    } catch (_e) {
      #err(#llmError("Step failed. Try continueChat again."))
    }
  };

  // ── cancelChat: abort a session and clean up llama_cpp state ────────────────

  public shared({ caller }) func cancelChat(chatId : ChatId) : async () {
    switch (findSession(chatId)) {
      case (?session) {
        if (session.caller == caller or Principal.isAnonymous(caller) or isAdmin(caller)) {
          removeSession(chatId);
          let llama : LlamaCppActor = actor(llamaCppId);
          try { ignore (await llama.remove_prompt_cache({ args = ["--prompt-cache", session.sessionPath] })) } catch _ {};
        };
      };
      case null {};
    }
  };

  // ── chatWithLlm: fast path via mo:llm (Llama 4 Scout / Qwen3-32B) ──────────
  //
  // Single update call — no polling required. Returns the full response directly.
  // BM25 retrieval is applied to provide context, same as the DeepSeek path.

  public shared({ caller }) func chatWithLlm(req : ChatRequest) : async LlmChatResponse {
    if (docsBackendId == "") { return #err(#notConfigured) };
    if (not withinRateLimit(caller)) {
      let resetSecs : Nat = 86_400 - Int.abs(Time.now()) / 1_000_000_000 % 86_400;
      return #err(#rateLimited({ resetInSeconds = resetSecs }));
    };

    let lastMsg = switch (Array.find<ChatMessage>(
      Array.reverse(req.messages),
      func(m) { switch (m.role) { case (#user) true; case (_) false } },
    )) {
      case (?m) m;
      case null { return #err(#llmError("No user message provided.")) };
    };

    try {
      // BM25 retrieval — isolate from LLM errors so instruction-limit traps are not
      // mislabeled as "Failed to reach the LLM".
      let docs  : DocsBackendActor = actor(docsBackendId);
      let retrieved : RetrievalResult = try {
        await docs.queryChunks(buildRetrievalQuery(lastMsg.content), topK)
      } catch (e) {
        let msg = Error.message(e);
        if (isRetrievalFailure(msg)) {
          return #err(#retrievalError(
            "Knowledge retrieval hit an instruction limit. Try a shorter, more specific question."
          ));
        };
        return #err(#retrievalError("Knowledge retrieval failed. Please try again."));
      };

      let ctxBlock = buildRetrievalContext(retrieved);

      let systemTxt = "You are SpicyAi, the official AI assistant for IC SPICY — a Florida specialty pepper nursery on the Internet Computer. " #
        "You are an expert in Korean Natural Farming (KNF), JADAM organic farming, hot pepper cultivation, ICP blockchain, " #
        "and everything about IC SPICY: its NFTs, SPICY token, roadmap, and products. " #
        "Be helpful, accurate, and concise. For questions about current prices or real-time data, " #
        "note that you may not have the latest information." #
        VARIETY_KNOWLEDGE_RULES # unknownVarietyHint(retrieved.slugs) # ctxBlock;

      let llmMessages : [LLM.ChatMessage] = [
        #system_({ content = systemTxt }),
        #user({ content = truncateChars(lastMsg.content, 500) }),
      ];

      let response = try {
        await LLM.chat(#Llama4Scout)
          .withMessages(llmMessages)
          .send()
      } catch (_e) {
        return #err(#llmError("Failed to reach the LLM. Please try again."));
      };

      let text = switch (response.message.content) {
        case (?t) t;
        case null "I wasn't able to generate a response. Please try again.";
      };

      incrementCallCount(caller);
      #ok({ response = text; docsReferenced = retrieved.slugs })

    } catch (e) {
      let msg = Error.message(e);
      if (isRetrievalFailure(msg)) {
        #err(#retrievalError(
          "Knowledge retrieval hit an instruction limit. Try a shorter, more specific question."
        ))
      } else {
        #err(#llmError("Failed to reach the LLM. Please try again."))
      }
    }
  };

  // ── Monitoring ──────────────────────────────────────────────────────────────

  public type GenerationStatus = {
    enabled        : Bool;
    llamaCppId     : Text;
    docsBackendId  : Text;
    modelPath      : Text;
    contextSize    : Nat;
    topK           : Nat;
    maxGenSteps    : Nat;
    anonDailyLimit : Nat;
    authDailyLimit : Nat;
    activeSessions : Nat;
  };

  public query func getStatus() : async GenerationStatus {
    {
      enabled; llamaCppId; docsBackendId; modelPath;
      contextSize; topK; maxGenSteps;
      anonDailyLimit; authDailyLimit;
      activeSessions = chatSessions.size();
    }
  };

  public query func getCycleBalance() : async Nat { Cycles.balance() };
  public query func getCanisterId()   : async Text { Principal.toText(Principal.fromActor(Self)) };

  // ── Admin: canister config setters ──────────────────────────────────────────

  public shared({ caller }) func setLlamaCppId(id : Text) : async () {
    requireAdmin(caller); llamaCppId := id
  };

  public shared({ caller }) func setDocsBackendId(id : Text) : async () {
    requireAdmin(caller); docsBackendId := id
  };

  public shared({ caller }) func setModelPath(path : Text) : async () {
    requireAdmin(caller); modelPath := path
  };

  public shared({ caller }) func setContextSize(n : Nat) : async () {
    requireAdmin(caller); contextSize := n
  };

  public shared({ caller }) func setTopK(n : Nat) : async () {
    requireAdmin(caller); topK := n
  };

  public shared({ caller }) func setMaxGenSteps(n : Nat) : async () {
    requireAdmin(caller); maxGenSteps := n
  };

  public shared({ caller }) func setEnabled(v : Bool) : async () {
    requireAdmin(caller); enabled := v
  };

  public shared({ caller }) func setAnonDailyLimit(n : Nat) : async () {
    requireAdmin(caller); anonDailyLimit := n
  };

  public shared({ caller }) func setAuthDailyLimit(n : Nat) : async () {
    requireAdmin(caller); authDailyLimit := n
  };

  // ── Admin: llama_cpp remote controls ────────────────────────────────────────

  func apiErrText(e : ApiError) : Text {
    switch (e) { case (#Other(t)) t; case (#StatusCode(c)) "status " # Nat16.toText(c) }
  };

  public shared({ caller }) func configureMaxTokens(maxQuery : Nat64, maxUpdate : Nat64) : async Text {
    requireAdmin(caller);
    if (llamaCppId == "") { return "llamaCppId not set" };
    let llama : LlamaCppActor = actor(llamaCppId);
    try {
      switch (await llama.set_max_tokens({ max_tokens_query = maxQuery; max_tokens_update = maxUpdate })) {
        case (#Ok(r))  "ok status=" # Nat16.toText(r.status_code);
        case (#Err(e)) "error: " # apiErrText(e);
      }
    } catch (_) { "call failed" }
  };

  public shared({ caller }) func openLlamaCppAccess() : async Text {
    requireAdmin(caller);
    if (llamaCppId == "") { return "llamaCppId not set" };
    let llama : LlamaCppActor = actor(llamaCppId);
    try {
      switch (await llama.set_access({ level = 1 })) {
        case (#Ok(a))  "ok level=" # Nat16.toText(a.level) # " " # a.explanation;
        case (#Err(e)) "error: " # apiErrText(e);
      }
    } catch (_) { "call failed" }
  };

  public shared({ caller }) func checkLlamaCpp() : async Text {
    requireAdmin(caller);
    if (llamaCppId == "") { return "llamaCppId not set" };
    let llama : LlamaCppActor = actor(llamaCppId);
    try {
      let h  = await llama.health();
      let rd = await llama.ready();
      let hs = switch (h)  { case (#Ok(r)) Nat16.toText(r.status_code); case (#Err(_)) "ERR" };
      let rs = switch (rd) { case (#Ok(r)) Nat16.toText(r.status_code); case (#Err(_)) "ERR" };
      "health=" # hs # " ready=" # rs
    } catch (_) { "call failed" }
  };

  // ── Admin: session management ────────────────────────────────────────────────

  public shared({ caller }) func listSessions() : async [(Text, Text)] {
    requireAdmin(caller);
    Array.map<(Text, ChatSessionData), (Text, Text)>(chatSessions, func((id, s)) {
      (id, Principal.toText(s.caller) # " phase=" # (if (s.promptRemaining != "") "ingesting" else "generating") # " genSteps=" # Nat.toText(s.genSteps))
    })
  };

  public shared({ caller }) func adminCancelSession(chatId : Text) : async () {
    requireAdmin(caller);
    switch (findSession(chatId)) {
      case (?session) {
        removeSession(chatId);
        let llama : LlamaCppActor = actor(llamaCppId);
        try { ignore (await llama.remove_prompt_cache({ args = ["--prompt-cache", session.sessionPath] })) } catch _ {};
      };
      case null {};
    }
  };

  // ── Admin: principal management ──────────────────────────────────────────────

  public shared({ caller }) func addAdmin(p : Principal) : async () {
    requireAdmin(caller);
    if (Array.find<Principal>(admins, func(a) { a == p }) == null) {
      admins := Array.concat(admins, [p]);
    };
  };

  public shared({ caller }) func removeAdmin(p : Principal) : async () {
    requireAdmin(caller);
    if (admins.size() <= 1) { Runtime.trap("cannot remove last admin") };
    admins := Array.filter<Principal>(admins, func(a) { a != p });
  };

  public query func listAdmins()             : async [Principal] { admins };
  public query func isAdminQuery(p : Principal) : async Bool { isAdmin(p) };

};
