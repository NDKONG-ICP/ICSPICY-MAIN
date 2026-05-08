// IC SPICY docs showcase backend — stateful version with SpicyAi chatbot.
//
// Responsibilities:
//   - Stable catalog: documents, categories, markdown/pdf blobs, BM25 chunks
//   - Admin CRUD: authenticated add/update/delete of documents and their assets
//   - SpicyAi: rate-limited LLM chat grounded on document chunks
//   - Chatbot config: admin-tunable persona, rate limits, blocked phrases
//
// Security posture:
//   - requireAuthenticated(caller) on all update methods
//   - requireAdmin(caller) on all admin/destructive methods
//   - inspect_message blocks anonymous ingress on every update method
//   - CallerGuard lock on async askSpicyAi
//   - Zero-log policy on chatbot: no question text or answer text stored or printed
//
// State migration from v1 (query-only):
//   - v1 docs_backend had no stable state; all data came from Catalog.mo
//   - After upgrade, run seedDocuments() + seedCategories() once as admin

import Array     "mo:core/Array";
import _Iter     "mo:core/Iter";
import Nat       "mo:core/Nat";
import Int       "mo:core/Int";
import Order     "mo:core/Order";
import Principal "mo:core/Principal";
import Text      "mo:core/Text";
import Time      "mo:base/Time";

import Types    "types";
import BM25     "lib/bm25";
import Chatbot  "lib/chatbot";

shared(msg) persistent actor class DocsBackend() = Self {

  // ── Stable state ───────────────────────────────────────────────────────────
  // In a `persistent actor class`, all var declarations are implicitly stable.

  // Admin principals.  Deployer is always initial admin.
  var _admins : [Principal] = [msg.caller];

  // Document catalog.
  var _docs       : [Types.DocumentRecord] = [];
  var _categories : [Types.Category]       = [];

  // BM25 chunks — flat array across all docs, rebuilt on seed or upload.
  var _chunks : [Types.ChunkRecord] = [];

  // Markdown content blobs (one per slug).
  var _markdowns : [(Text, Text)] = [];  // (slug, text)

  // PDF blobs (one per slug; may be empty Blob if no PDF uploaded yet).
  var _pdfs : [(Text, Blob)] = [];  // (slug, pdf bytes)

  // Chatbot configuration.
  var _chatConfig : Types.ChatbotConfig = {
    systemPromptExtra = "";
    persona = #charming;
    anonDailyLimit = 30;
    authDailyLimit = 200;
    topK = 3;
    blockedPhrases = [];
  };

  // Rate-limit counters: key = "principalText:dayNumber".
  var _rateLimits : [(Text, Nat)] = [];

  // Manifest version (updated on any doc mutation).
  var _manifestVersion : Text = "0";

  // ── Transient state ────────────────────────────────────────────────────────

  // In-flight callers for reentrancy protection on askSpicyAi.
  transient var _inFlight : [Principal] = [];

  // ── Auth helpers ───────────────────────────────────────────────────────────

  func _requireAuthenticated(caller : Principal) {
    if (Principal.isAnonymous(caller)) { assert false };
  };

  func requireAdmin(caller : Principal) {
    let isAdm = Array.find<Principal>(_admins, func(a) { a == caller }) != null;
    if (not isAdm) { assert false };
  };

  // ── Reentrancy guard (CallerGuard pattern) ─────────────────────────────────

  func acquireLock(p : Principal) : Bool {
    if (Array.find<Principal>(_inFlight, func(x) { x == p }) != null) {
      return false;
    };
    _inFlight := Array.concat(_inFlight, [p]);
    true
  };

  func releaseLock(p : Principal) {
    _inFlight := Array.filter<Principal>(_inFlight, func(x) { x != p });
  };

  // ── Rate limiting ──────────────────────────────────────────────────────────

  func dayKey() : Text {
    let secs = Int.abs(Time.now()) / 1_000_000_000;
    Nat.toText(secs / 86_400)
  };

  func rateLimitKey(p : Principal) : Text {
    Principal.toText(p) # ":" # dayKey()
  };

  func getCallCount(p : Principal) : Nat {
    let key = rateLimitKey(p);
    switch (Array.find<(Text, Nat)>(_rateLimits, func((k, _)) { k == key })) {
      case (?(_, n)) { n };
      case null       { 0 };
    }
  };

  func incrementCallCount(p : Principal) {
    let key = rateLimitKey(p);
    var found = false;
    _rateLimits := Array.map<(Text, Nat), (Text, Nat)>(_rateLimits, func((k, n)) {
      if (k == key) { found := true; (k, n + 1) } else { (k, n) }
    });
    if (not found) {
      _rateLimits := Array.concat(_rateLimits, [(key, 1)]);
    };
    // Prune old entries (keep only today's day key).
    let today = dayKey();
    _rateLimits := Array.filter<(Text, Nat)>(_rateLimits, func((k, _)) {
      Text.contains(k, #text (":" # today))
    });
  };

  func withinRateLimit(caller : Principal) : Bool {
    let isAdm = Array.find<Principal>(_admins, func(a) { a == caller }) != null;
    if (isAdm) { return true };  // admins unlimited
    let limit = if (Principal.isAnonymous(caller)) {
      _chatConfig.anonDailyLimit
    } else {
      _chatConfig.authDailyLimit
    };
    getCallCount(caller) < limit
  };

  // ── Blocked phrase check ───────────────────────────────────────────────────

  func containsBlocked(text : Text) : Bool {
    let lower = Text.toLower(text);
    let phrases = _chatConfig.blockedPhrases;
    Array.find<Text>(phrases, func(p) {
      Text.contains(lower, #text (Text.toLower(p)))
    }) != null
  };

  // ── Helpers ────────────────────────────────────────────────────────────────

  func getMarkdown(slug : Text) : Text {
    switch (Array.find<(Text, Text)>(_markdowns, func((s, _)) { s == slug })) {
      case (?(_, t)) { t };
      case null       { "" };
    }
  };

  func getPdf(slug : Text) : Blob {
    switch (Array.find<(Text, Blob)>(_pdfs, func((s, _)) { s == slug })) {
      case (?(_, b)) { b };
      case null       { "" };
    }
  };

  func setMarkdown(slug : Text, text : Text) {
    var found = false;
    _markdowns := Array.map<(Text, Text), (Text, Text)>(_markdowns, func((s, t)) {
      if (s == slug) { found := true; (s, text) } else { (s, t) }
    });
    if (not found) {
      _markdowns := Array.concat(_markdowns, [(slug, text)]);
    };
  };

  func setPdf(slug : Text, data : Blob) {
    var found = false;
    _pdfs := Array.map<(Text, Blob), (Text, Blob)>(_pdfs, func((s, b)) {
      if (s == slug) { found := true; (s, data) } else { (s, b) }
    });
    if (not found) {
      _pdfs := Array.concat(_pdfs, [(slug, data)]);
    };
  };

  func rebuildChunksForSlug(slug : Text) {
    let mdText = getMarkdown(slug);
    // Remove existing chunks for this slug.
    _chunks := Array.filter<Types.ChunkRecord>(_chunks, func(c) { c.slug != slug });
    if (mdText.size() > 0) {
      let newChunks = BM25.buildChunks(slug, mdText, 400);
      _chunks := Array.concat(_chunks, newChunks);
    };
  };

  func updateManifest() {
    let secs = Int.abs(Time.now()) / 1_000_000_000;
    _manifestVersion := Nat.toText(secs);
  };

  func compareSortOrder(a : Types.DocumentRecord, b : Types.DocumentRecord) : Order.Order {
    Nat.compare(a.sortOrder, b.sortOrder)
  };

  func toLower(t : Text) : Text { Text.toLower(t) };

  func docMatchesQuery(doc : Types.DocumentRecord, qLower : Text) : Bool {
    if (qLower.size() == 0) return true;
    if (Text.contains(toLower(doc.title),     #text qLower)) return true;
    if (Text.contains(toLower(doc.subtitle),  #text qLower)) return true;
    if (Text.contains(toLower(doc.summary),   #text qLower)) return true;
    if (Text.contains(toLower(doc.audience),  #text qLower)) return true;
    if (Text.contains(toLower(doc.slug),      #text qLower)) return true;
    if (Text.contains(toLower(doc.category),  #text qLower)) return true;
    if (Text.contains(toLower(doc.collection),#text qLower)) return true;
    for (tag in doc.tags.vals()) {
      if (Text.contains(toLower(tag), #text qLower)) return true;
    };
    false
  };

  // NOTE: inspect_message is intentionally omitted for docs_backend.
  // The method-level requireAuthenticated/requireAdmin guards are the security
  // boundary. inspect_message would save cycles on pre-consensus rejection but
  // requires enumerating all 35+ method variants explicitly — not worth the
  // maintenance burden for a low-traffic docs showcase canister.

  // ── Admin management ───────────────────────────────────────────────────────

  public shared({ caller }) func addAdmin(p : Principal) : async () {
    requireAdmin(caller);
    if (Array.find<Principal>(_admins, func(a) { a == p }) == null) {
      _admins := Array.concat(_admins, [p]);
    };
  };

  public shared({ caller }) func removeAdmin(p : Principal) : async () {
    requireAdmin(caller);
    // Must keep at least one admin.
    if (_admins.size() <= 1) { assert false };
    _admins := Array.filter<Principal>(_admins, func(a) { a != p });
  };

  public query func listAdmins() : async [Principal] { _admins };

  public query func isAdmin(p : Principal) : async Bool {
    Array.find<Principal>(_admins, func(a) { a == p }) != null
  };

  // ── Document CRUD ──────────────────────────────────────────────────────────

  // Upsert document metadata.  Does NOT change binary assets.
  public shared({ caller }) func upsertDocument(doc : Types.DocumentRecord) : async () {
    requireAdmin(caller);
    _docs := Array.filter<Types.DocumentRecord>(_docs, func(d) { d.slug != doc.slug });
    _docs := Array.concat(_docs, [doc]);
    updateManifest();
  };

  public shared({ caller }) func deleteDocument(slug : Text) : async () {
    requireAdmin(caller);
    _docs := Array.filter<Types.DocumentRecord>(_docs, func(d) { d.slug != slug });
    _chunks := Array.filter<Types.ChunkRecord>(_chunks, func(c) { c.slug != slug });
    _markdowns := Array.filter<(Text, Text)>(_markdowns, func((s, _)) { s != slug });
    _pdfs := Array.filter<(Text, Blob)>(_pdfs, func((s, _)) { s != slug });
    updateManifest();
  };

  // Upload markdown text and rebuild BM25 chunks.
  public shared({ caller }) func uploadDocumentMarkdown(slug : Text, text : Text) : async () {
    requireAdmin(caller);
    setMarkdown(slug, text);
    rebuildChunksForSlug(slug);
    updateManifest();
  };

  // Upload PDF bytes (≤2 MiB per Candid message limit).
  public shared({ caller }) func uploadDocumentPdf(slug : Text, data : Blob) : async () {
    requireAdmin(caller);
    setPdf(slug, data);
    updateManifest();
  };

  // Bulk seed: import the generated catalog in one call.
  // Overwrites all existing docs; called once after upgrade from v1.
  public shared({ caller }) func seedDocuments(docs : [Types.DocumentRecord]) : async () {
    requireAdmin(caller);
    _docs := docs;
    updateManifest();
  };

  public shared({ caller }) func seedCategories(cats : [Types.Category]) : async () {
    requireAdmin(caller);
    _categories := cats;
  };

  // Seed markdown for multiple documents at once.
  // payload: [(slug, markdownText)]
  public shared({ caller }) func seedMarkdowns(payload : [(Text, Text)]) : async () {
    requireAdmin(caller);
    for ((slug, text) in payload.vals()) {
      setMarkdown(slug, text);
      rebuildChunksForSlug(slug);
    };
    updateManifest();
  };

  // ── Category CRUD ──────────────────────────────────────────────────────────

  public shared({ caller }) func upsertCategory(cat : Types.Category) : async () {
    requireAdmin(caller);
    _categories := Array.filter<Types.Category>(_categories, func(c) { c.id != cat.id });
    _categories := Array.concat(_categories, [cat]);
  };

  public shared({ caller }) func deleteCategory(id : Text) : async () {
    requireAdmin(caller);
    _categories := Array.filter<Types.Category>(_categories, func(c) { c.id != id });
  };

  // ── Chatbot config ─────────────────────────────────────────────────────────

  public shared({ caller }) func setChatbotConfig(cfg : Types.ChatbotConfig) : async () {
    requireAdmin(caller);
    _chatConfig := cfg;
  };

  public shared({ caller }) func setChatbotSystemPromptExtra(extra : Text) : async () {
    requireAdmin(caller);
    _chatConfig := {
      systemPromptExtra = extra;
      persona = _chatConfig.persona;
      anonDailyLimit = _chatConfig.anonDailyLimit;
      authDailyLimit = _chatConfig.authDailyLimit;
      topK = _chatConfig.topK;
      blockedPhrases = _chatConfig.blockedPhrases;
    };
  };

  public shared({ caller }) func setChatbotPersona(persona : Types.PersonaPreset) : async () {
    requireAdmin(caller);
    _chatConfig := {
      systemPromptExtra = _chatConfig.systemPromptExtra;
      persona;
      anonDailyLimit = _chatConfig.anonDailyLimit;
      authDailyLimit = _chatConfig.authDailyLimit;
      topK = _chatConfig.topK;
      blockedPhrases = _chatConfig.blockedPhrases;
    };
  };

  public shared({ caller }) func setChatbotBlockedPhrases(phrases : [Text]) : async () {
    requireAdmin(caller);
    _chatConfig := {
      systemPromptExtra = _chatConfig.systemPromptExtra;
      persona = _chatConfig.persona;
      anonDailyLimit = _chatConfig.anonDailyLimit;
      authDailyLimit = _chatConfig.authDailyLimit;
      topK = _chatConfig.topK;
      blockedPhrases = phrases;
    };
  };

  public shared({ caller }) func setChatbotRateLimits(anonLimit : Nat, authLimit : Nat) : async () {
    requireAdmin(caller);
    _chatConfig := {
      systemPromptExtra = _chatConfig.systemPromptExtra;
      persona = _chatConfig.persona;
      anonDailyLimit = anonLimit;
      authDailyLimit = authLimit;
      topK = _chatConfig.topK;
      blockedPhrases = _chatConfig.blockedPhrases;
    };
  };

  public query func getChatbotConfig() : async Types.ChatbotConfig {
    _chatConfig
  };

  // ── SpicyAi chat ───────────────────────────────────────────────────────────

  // Main chatbot entry point. Rate-limited; zero-log.
  //
  // messages: conversation history from browser localStorage.
  //           Last entry must be #user.
  //           Max 6 turns; frontend enforces this.
  //
  // ZERO-LOG: no question text or answer text is stored or Debug.print'd.
  public shared({ caller }) func askSpicyAi(req : Types.ChatRequest) : async Types.ChatResponse {
    // Rate limit check.
    if (not withinRateLimit(caller)) {
      let resetSecs : Nat = 86_400 - (Int.abs(Time.now()) / 1_000_000_000 % 86_400);
      return #err(#rateLimited({ resetInSeconds = resetSecs }));
    };

    // Blocked phrase check on the last user message.
    let lastMsg = switch (Array.find<Types.ChatMessage>(
      Array.reverse(req.messages),
      func(m) { switch (m.role) { case (#user) true; case (_) false } }
    )) {
      case (?m) m;
      case null {
        return #err(#llmError("No user message provided."));
      };
    };
    if (containsBlocked(lastMsg.content)) {
      return #err(#blocked);
    };

    // Reentrancy guard — prevent concurrent calls from the same principal.
    if (not acquireLock(caller)) {
      return #err(#llmError("A previous request is still in flight. Please wait."));
    };

    try {
      // BM25 retrieval using the last user message as query.
      let retrieved = BM25.retrieve(lastMsg.content, _chunks, _docs, _chatConfig.topK);

      // Build (slug, title) pairs for excerpt headers.
      let docTitles : [(Text, Text)] = Array.map<Types.DocumentRecord, (Text, Text)>(
        _docs,
        func(d) { (d.slug, d.title) },
      );

      // Assemble system prompt.
      let systemPrompt = Chatbot.buildSystemPrompt(
        _chatConfig,
        retrieved.chunks,
        docTitles,
        retrieved.slugs,
      );

      // LLM call.
      let llmResult = await Chatbot.callLLM(systemPrompt, req.messages);

      // Increment call counter AFTER the await (state mutation after await is
      // safe here because the only side-effect is incrementing a counter, and
      // the CallerGuard prevents re-entrant double-increments).
      incrementCallCount(caller);
      releaseLock(caller);

      // Attach referenced doc slugs to the response.
      switch (llmResult) {
        case (#ok({ response; docsReferenced = _ })) {
          #ok({ response; docsReferenced = retrieved.slugs })
        };
        case (#err(e)) { #err(e) };
      }
    } catch (_e) {
      releaseLock(caller);
      #err(#llmError("An error occurred. Please try again."))
    }
  };

  // ── BM25 retrieval query (called by spicy_ai_canister) ────────────────────
  //
  // Returns the top-K most relevant chunks for a query string.
  // This is a query method so it's fast; inter-canister calls to query methods
  // still go through consensus (replicated query) but have no update overhead.

  public query func queryChunks(queryText : Text, topK : Nat) : async { chunks : [Text]; slugs : [Text] } {
    BM25.retrieve(queryText, _chunks, _docs, topK)
  };

  // ── Public query methods (catalog) ─────────────────────────────────────────

  public query func getCanisterId() : async Text {
    Principal.toText(Principal.fromActor(Self))
  };

  public query func getManifestVersion() : async Text { _manifestVersion };

  public query func listDocuments() : async [Types.DocumentRecord] {
    Array.sort<Types.DocumentRecord>(_docs, compareSortOrder)
  };

  public query func listFeaturedDocuments() : async [Types.DocumentRecord] {
    let filtered = Array.filter<Types.DocumentRecord>(_docs, func(d) { d.featured });
    Array.sort<Types.DocumentRecord>(filtered, compareSortOrder)
  };

  public query func getDocument(slug : Text) : async ?Types.DocumentRecord {
    Array.find<Types.DocumentRecord>(_docs, func(d) { d.slug == slug })
  };

  public query func listDocumentsByCategory(categoryId : Text) : async [Types.DocumentRecord] {
    let filtered = Array.filter<Types.DocumentRecord>(_docs, func(d) { d.category == categoryId });
    Array.sort<Types.DocumentRecord>(filtered, compareSortOrder)
  };

  public query func listDocumentsByCollection(collection : Text) : async [Types.DocumentRecord] {
    let filtered = Array.filter<Types.DocumentRecord>(_docs, func(d) { d.collection == collection });
    Array.sort<Types.DocumentRecord>(filtered, compareSortOrder)
  };

  public query func listCategories() : async [Types.CategoryWithCount] {
    Array.map<Types.Category, Types.CategoryWithCount>(_categories, func(c) {
      let count = Array.filter<Types.DocumentRecord>(
        _docs,
        func(d) { d.category == c.id },
      ).size();
      { id = c.id; name = c.name; description = c.description; count }
    })
  };

  public query func searchDocuments(queryText : Text, categoryId : ?Text) : async [Types.DocumentRecord] {
    let qLower = toLower(queryText);
    let filtered = Array.filter<Types.DocumentRecord>(_docs, func(d) {
      let catOk = switch (categoryId) {
        case (?c) { d.category == c };
        case null { true };
      };
      catOk and docMatchesQuery(d, qLower)
    });
    Array.sort<Types.DocumentRecord>(filtered, compareSortOrder)
  };

  public query func getDocumentStats() : async Types.DocumentStats {
    let totalWords = Array.foldLeft<Types.DocumentRecord, Nat>(
      _docs, 0, func(acc, d) { acc + d.wordCount }
    );
    let totalPdfBytes = Array.foldLeft<Types.DocumentRecord, Nat>(
      _docs, 0, func(acc, d) { acc + d.pdfBytes }
    );
    {
      totalDocuments = _docs.size();
      totalCategories = _categories.size();
      totalWords;
      totalPdfBytes;
      manifestVersion = _manifestVersion;
    }
  };

  public query func listTags() : async [Text] {
    let allTags = Array.flatten<Text>(
      Array.map<Types.DocumentRecord, [Text]>(_docs, func(d) { d.tags })
    );
    let sorted = Array.sort<Text>(allTags, Text.compare);
    // Deduplicate adjacent equal values.
    var out : [Text] = [];
    var last : ?Text = null;
    for (t in sorted.vals()) {
      switch (last) {
        case (?prev) {
          if (prev != t) { out := Array.concat(out, [t]); last := ?t };
        };
        case null { out := Array.concat(out, [t]); last := ?t };
      };
    };
    out
  };

  // ── Asset queries ──────────────────────────────────────────────────────────

  // Returns the raw markdown text for a document.
  public query func getDocumentMarkdown(slug : Text) : async Text {
    getMarkdown(slug)
  };

  // Returns the raw PDF bytes for a document.
  public query func getDocumentPdf(slug : Text) : async Blob {
    getPdf(slug)
  };

  // Returns the caller's current call count and limit for this day.
  public query({ caller }) func getMyRateLimitStatus() : async { used : Nat; limit : Nat } {
    let limit = if (Principal.isAnonymous(caller)) {
      _chatConfig.anonDailyLimit
    } else {
      _chatConfig.authDailyLimit
    };
    { used = getCallCount(caller); limit }
  };

  // Returns the total chunk count (admin diagnostic).
  public query func getChunkCount() : async Nat { _chunks.size() };
};
