// Public and internal types for the IC SPICY docs catalog + SpicyAi chatbot canister.

module {

  // ── Catalog types ─────────────────────────────────────────────────────────

  public type Category = {
    id : Text;
    name : Text;
    description : Text;
  };

  public type CategoryWithCount = {
    id : Text;
    name : Text;
    description : Text;
    count : Nat;
  };

  public type DocumentRecord = {
    slug : Text;
    title : Text;
    subtitle : Text;
    audience : Text;
    summary : Text;
    collection : Text;
    category : Text;
    tags : [Text];
    featured : Bool;
    sortOrder : Nat;
    wordCount : Nat;
    readingMinutes : Nat;
    pdfBytes : Nat;
    // Paths are now derived at query time; kept for backward compat but may be empty.
    pdfPath : Text;
    markdownPath : Text;
  };

  public type DocumentStats = {
    totalDocuments : Nat;
    totalCategories : Nat;
    totalWords : Nat;
    totalPdfBytes : Nat;
    manifestVersion : Text;
  };

  // ── BM25 / retrieval types ──────────────────────────────────────────────────

  // A paragraph-sized chunk of a document, with precomputed term frequencies.
  public type ChunkRecord = {
    slug : Text;       // owning document
    idx : Nat;         // position within doc (0-indexed)
    text : Text;       // raw text used for prompt assembly
    terms : [(Text, Nat)];   // (lowercased term, frequency) pairs
    totalTerms : Nat;  // total term count (for length normalization)
  };

  // ── Upload types ───────────────────────────────────────────────────────────

  // A transient in-progress upload session.
  public type FileType = { #pdf; #markdown };

  public type UploadSession = {
    slug : Text;
    fileType : FileType;
    chunks : [var ?Blob];    // indexed slots, None = not yet received
    totalChunks : Nat;
    receivedCount : Nat;
  };

  // ── Chatbot config ──────────────────────────────────────────────────────────

  public type PersonaPreset = {
    #charming;  // brand concierge (default)
    #spec;      // plain informational
    #founder;   // first-person founder voice
  };

  // Mutable chatbot configuration (stored in stable record, updated via setters).
  public type ChatbotConfig = {
    systemPromptExtra : Text;  // appended after the retrieved chunks block
    persona : PersonaPreset;
    anonDailyLimit : Nat;      // anonymous calls per day
    authDailyLimit : Nat;      // authenticated calls per day
    topK : Nat;                // number of chunks to retrieve per query
    blockedPhrases : [Text];   // reject requests containing these (case-insensitive)
  };

  // ── Chat API types ──────────────────────────────────────────────────────────

  public type ChatRole = { #user; #assistant };

  public type ChatMessage = {
    role : ChatRole;
    content : Text;
  };

  // Outbound request from the frontend.
  public type ChatRequest = {
    messages : [ChatMessage];  // last N turns; last must be #user
  };

  public type ChatError = {
    #rateLimited : { resetInSeconds : Nat };
    #blocked;
    #llmError : Text;
    #noContent;
  };

  public type ChatResponse = {
    #ok : { response : Text; docsReferenced : [Text] };
    #err : ChatError;
  };

  // ── Admin result helpers ────────────────────────────────────────────────────

  public type AdminResult<T> = { #ok : T; #err : Text };
};
