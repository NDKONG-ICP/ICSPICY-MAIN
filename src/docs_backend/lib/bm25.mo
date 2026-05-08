// BM25-inspired retrieval over a flat ChunkRecord array.
//
// We use a simplified TF-weighted scoring (no log-IDF) because:
//   - Corpus is tiny (~200 chunks); linear scan is trivial
//   - Avoiding Float keeps the module dependency-free
//   - Title and tag boosts more than compensate for IDF omission at this scale
//
// Score formula:
//   score(chunk, query) = Σ_terms  tf(term, chunk) * 10
//                        + title_match(term, docMeta) * 30
//                        + tag_match(term, docMeta)   * 20
//
// Chunks with score > 0 are returned, sorted descending, top-K selected.

import Array "mo:core/Array";
import Text  "mo:core/Text";
import Order "mo:core/Order";
import Nat   "mo:core/Nat";
import Char  "mo:core/Char";
import Iter  "mo:core/Iter";

import Types "../types";

module {

  // ── Tokenizer ────────────────────────────────────────────────────────────────

  // Minimal English stop words — keeps query signal clean.
  let STOP_WORDS : [Text] = [
    "a", "an", "the", "and", "or", "but", "in", "on", "at", "to",
    "for", "of", "with", "by", "from", "is", "are", "was", "were",
    "be", "been", "being", "have", "has", "had", "do", "does", "did",
    "it", "its", "this", "that", "these", "those", "i", "we", "you",
    "he", "she", "they", "not", "no", "as", "if", "so", "up", "out",
    "about", "which", "what", "how", "can", "will", "more", "all",
  ];

  func isStopWord(t : Text) : Bool {
    Array.find<Text>(STOP_WORDS, func(s) { s == t }) != null
  };

  func isAlpha(c : Char) : Bool {
    (c >= 'a' and c <= 'z') or (c >= 'A' and c <= 'Z') or
    (c >= '0' and c <= '9')
  };

  // Lowercases a Char safely.
  func toLowerChar(c : Char) : Char {
    if (c >= 'A' and c <= 'Z') {
      Char.fromNat32(Char.toNat32(c) + 32)
    } else {
      c
    }
  };

  // Splits text into lowercase alphabetic tokens, removing stop words.
  public func tokenize(t : Text) : [Text] {
    let chars = Text.toIter(t);
    var buf : Text = "";
    var out : [Text] = [];
    for (c in chars) {
      if (isAlpha(c)) {
        buf := buf # Text.fromChar(toLowerChar(c));
      } else if (buf.size() > 1) {
        if (not isStopWord(buf)) {
          out := Array.concat(out, [buf]);
        };
        buf := "";
      } else {
        buf := "";
      };
    };
    if (buf.size() > 1 and not isStopWord(buf)) {
      out := Array.concat(out, [buf]);
    };
    out
  };

  // ── Chunk builder ────────────────────────────────────────────────────────────

  // Splits a markdown document into chunks of roughly `targetWords` words each.
  // Preserves paragraph boundaries where possible by splitting on blank lines.
  public func buildChunks(slug : Text, markdown : Text, targetWords : Nat) : [Types.ChunkRecord] {
    // Split into lines.
    let lines = Iter.toArray(Text.split(markdown, #char '\n'));

    // Group lines into paragraphs (separated by blank lines).
    var paragraphs : [Text] = [];
    var para : Text = "";
    for (line in lines.vals()) {
      let trimmed = Text.trim(line, #char ' ');
      if (trimmed.size() == 0) {
        if (para.size() > 0) {
          paragraphs := Array.concat(paragraphs, [para]);
          para := "";
        };
      } else {
        para := if (para.size() == 0) trimmed else para # " " # trimmed;
      };
    };
    if (para.size() > 0) {
      paragraphs := Array.concat(paragraphs, [para]);
    };

    // Merge paragraphs into chunks of ~targetWords.
    var chunks : [Types.ChunkRecord] = [];
    var chunkText : Text = "";
    var chunkWords : Nat = 0;
    var idx : Nat = 0;

    for (p in paragraphs.vals()) {
      let tokens = tokenize(p);
      let wc = tokens.size();
      if (chunkWords + wc > targetWords and chunkWords > 0) {
        // Flush current chunk.
        chunks := Array.concat(chunks, [makeChunk(slug, idx, chunkText)]);
        idx += 1;
        chunkText := p;
        chunkWords := wc;
      } else {
        chunkText := if (chunkText.size() == 0) p else chunkText # "\n\n" # p;
        chunkWords += wc;
      };
    };
    if (chunkText.size() > 0) {
      chunks := Array.concat(chunks, [makeChunk(slug, idx, chunkText)]);
    };
    chunks
  };

  func makeChunk(slug : Text, idx : Nat, text : Text) : Types.ChunkRecord {
    let tokens = tokenize(text);
    let terms = countTerms(tokens);
    {
      slug;
      idx;
      text;
      terms;
      totalTerms = tokens.size();
    }
  };

  // Counts (term, frequency) pairs from a token list.
  func countTerms(tokens : [Text]) : [(Text, Nat)] {
    var pairs : [(Text, Nat)] = [];
    for (tok in tokens.vals()) {
      var found = false;
      pairs := Array.map<(Text, Nat), (Text, Nat)>(pairs, func(pair) {
        let (t, n) = pair;
        if (t == tok) {
          found := true;
          (t, n + 1)
        } else {
          (t, n)
        }
      });
      if (not found) {
        pairs := Array.concat(pairs, [(tok, 1)]);
      };
    };
    pairs
  };

  // ── Retrieval ────────────────────────────────────────────────────────────────

  // ── Acronym expansion ────────────────────────────────────────────────────────

  // Natural farming acronym expansions.  When the user types an abbreviation
  // like "FPJ", we inject its expanded tokens so retrieval hits the full text.
  let ACRONYM_MAP : [(Text, [Text])] = [
    ("knf",     ["korean", "natural", "farming"]),
    ("cgnf",    ["cho", "global", "natural", "farming"]),
    ("jadam",   ["jadam", "organic", "farming"]),
    ("imo",     ["indigenous", "microorganisms"]),
    ("lab",     ["lactic", "acid", "bacteria"]),
    ("fpj",     ["fermented", "plant", "juice"]),
    ("ffj",     ["fermented", "fruit", "juice"]),
    ("faa",     ["fish", "amino", "acid"]),
    ("ohn",     ["oriental", "herbal", "nutrient"]),
    ("wca",     ["water", "soluble", "calcium"]),
    ("wcp",     ["water", "soluble", "calcium", "phosphate"]),
    ("brv",     ["brown", "rice", "vinegar"]),
    ("jms",     ["jadam", "microorganism", "solution"]),
    ("js",      ["jadam", "sulfur"]),
    ("jwa",     ["jadam", "wetting", "agent"]),
    ("jhs",     ["jadam", "herbal", "solution"]),
    ("jmp",     ["jadam", "microbial", "pesticide"]),
    ("ber",     ["blossom", "end", "rot"]),
    ("som",     ["soil", "organic", "matter"]),
    ("sea",     ["seawater", "fermented"]),
  ];

  func expandAcronyms(terms : [Text]) : [Text] {
    var expanded = terms;
    for ((acronym, expansion) in ACRONYM_MAP.vals()) {
      if (Array.find<Text>(terms, func(t) { t == acronym }) != null) {
        // Add expansion terms that are not already present.
        for (expTerm in expansion.vals()) {
          if (Array.find<Text>(expanded, func(t) { t == expTerm }) == null) {
            expanded := Array.concat(expanded, [expTerm]);
          };
        };
      };
    };
    expanded
  };

  // Returns the text of the top-K chunks most relevant to the query,
  // along with the unique doc slugs they came from.
  public func retrieve(
    queryText : Text,
    chunks : [Types.ChunkRecord],
    docs : [Types.DocumentRecord],
    topK : Nat,
  ) : { chunks : [Text]; slugs : [Text] } {
    let rawTerms = tokenize(queryText);
    let queryTerms = expandAcronyms(rawTerms);
    if (queryTerms.size() == 0) {
      return { chunks = []; slugs = [] };
    };

    // Score every chunk.
    let scored = Array.map<Types.ChunkRecord, (Nat, Types.ChunkRecord)>(
      chunks,
      func(c) { (scoreChunk(c, queryTerms, docs), c) },
    );

    // Filter to only positive-scoring chunks and sort descending.
    let positive = Array.filter<(Nat, Types.ChunkRecord)>(
      scored,
      func((s, _)) { s > 0 },
    );
    let sorted = Array.sort<(Nat, Types.ChunkRecord)>(
      positive,
      func((a, _), (b, _)) {
        if (a > b) #less else if (a < b) #greater else #equal
      },
    );

    // Take top-K.
    let k = if (topK > sorted.size()) sorted.size() else topK;
    var resultChunks : [Text] = [];
    var resultSlugs : [Text] = [];
    var i = 0;
    while (i < k) {
      let (_, chunk) = sorted[i];
      resultChunks := Array.concat(resultChunks, [chunk.text]);
      // Deduplicate slugs.
      if (Array.find<Text>(resultSlugs, func(s) { s == chunk.slug }) == null) {
        resultSlugs := Array.concat(resultSlugs, [chunk.slug]);
      };
      i += 1;
    };
    { chunks = resultChunks; slugs = resultSlugs }
  };

  // ── Scoring ──────────────────────────────────────────────────────────────────

  func scoreChunk(
    chunk : Types.ChunkRecord,
    queryTerms : [Text],
    docs : [Types.DocumentRecord],
  ) : Nat {
    // Find the owning document for title/tag boosts.
    let docMeta = Array.find<Types.DocumentRecord>(docs, func(d) { d.slug == chunk.slug });

    var score : Nat = 0;
    for (term in queryTerms.vals()) {
      // Term frequency in chunk body.
      let tfMatch = Array.find<(Text, Nat)>(chunk.terms, func(pair) {
        let (t, _) = pair; t == term
      });
      switch (tfMatch) {
        case (?(_, freq)) { score += freq * 10 };
        case null {};
      };

      // Title and tag boosts.
      switch (docMeta) {
        case (?meta) {
          if (Text.contains(Text.toLower(meta.title), #text term)) {
            score += 30;
          };
          for (tag in meta.tags.vals()) {
            if (Text.toLower(tag) == term) { score += 20 };
          };
          if (Text.contains(Text.toLower(meta.subtitle), #text term)) {
            score += 15;
          };
          if (Text.contains(Text.toLower(meta.summary), #text term)) {
            score += 5;
          };
        };
        case null {};
      };
    };
    score
  };
};
