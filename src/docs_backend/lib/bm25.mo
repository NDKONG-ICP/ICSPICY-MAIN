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
import Map   "mo:core/Map";

import Types "../types";

module {

  // ── Tokenizer ────────────────────────────────────────────────────────────────

  // Minimal English stop words — keeps query signal clean.
  // Also drop brand/corpus-wide tokens ("ic", "spicy") that match almost every doc
  // and inflate queryChunks instruction cost without adding ranking signal.
  let STOP_WORDS : [Text] = [
    "a", "an", "the", "and", "or", "but", "in", "on", "at", "to",
    "for", "of", "with", "by", "from", "is", "are", "was", "were",
    "be", "been", "being", "have", "has", "had", "do", "does", "did",
    "it", "its", "this", "that", "these", "those", "i", "we", "you",
    "he", "she", "they", "not", "no", "as", "if", "so", "up", "out",
    "about", "which", "what", "how", "can", "will", "more", "all",
    "why", "when", "where", "who", "whom", "whose", "please", "just",
    "really", "something", "anything", "someone", "anyone", "into",
    "over", "under", "again", "also", "than", "then", "too", "very",
    "my", "our", "your", "their", "should", "would", "could", "may",
    "might", "must", "shall", "need", "want", "like", "get", "got",
    "make", "made", "using", "use", "used",
    // Brand / corpus-wide — pure cost, no signal on this index.
    "ic", "spicy", "ics",
    // Pepperpedia corpus terms — match nearly every chunk and blow instruction limits.
    "pepper", "peppers", "chile", "chili", "chilli", "variety", "varieties",
    "hot", "plant", "plants", "seed", "seeds", "tell", "me",
  ];

  // Hard cap on scored query terms. Cost ≈ terms × chunks × meta Text.contains.
  // Empirically 6 terms × ~1219 chunks exceeded the 5B instruction limit;
  // 3–4 terms stay safe with headroom for ~1300+ chunks.
  let MAX_QUERY_TERMS : Nat = 4;
  // Soft budget: if terms × chunks would exceed this, drop to fewer terms.
  let SAFE_TERM_CHUNK_PRODUCT : Nat = 4500;

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

  // Acronym map kept for documentation. Expansion into full phrases is disabled
  // in expandAcronyms — injected words like "plant"/"oriental" match too broadly.
  let _ACRONYM_MAP_DOCS : [(Text, [Text])] = ACRONYM_MAP;

  func expandAcronyms(terms : [Text], maxTerms : Nat) : [Text] {
    ignore _ACRONYM_MAP_DOCS;
    takeTerms(terms, maxTerms)
  };

  func takeTerms(terms : [Text], max : Nat) : [Text] {
    if (terms.size() <= max) { terms }
    else {
      Array.tabulate<Text>(max, func(i) { terms[i] })
    }
  };

  // Cap query terms for instruction-budget safety given corpus size.
  // At ~1265 chunks, 3 terms stays under 4500; 4 does not.
  func budgetedMaxTerms(chunkCount : Nat) : Nat {
    if (chunkCount == 0) { return MAX_QUERY_TERMS };
    var maxT = MAX_QUERY_TERMS;
    while (maxT > 1 and maxT * chunkCount > SAFE_TERM_CHUNK_PRODUCT) {
      maxT -= 1;
    };
    maxT
  };

  type DocBoostCache = {
    titleLower : Text;
    subtitleLower : Text;
    tagsLower : [Text];
  };

  func buildDocBoost(meta : Types.DocumentRecord) : DocBoostCache {
    {
      titleLower = Text.toLower(meta.title);
      subtitleLower = Text.toLower(meta.subtitle);
      // Intentionally omit summary — Text.contains over ~1200 long summaries per
      // query term was a major instruction-cost driver.
      tagsLower = Array.map<Text, Text>(meta.tags, func(t) { Text.toLower(t) });
    }
  };

  // Returns the text of the top-K chunks most relevant to the query,
  // along with the unique doc slugs they came from.
  public func retrieve(
    queryText : Text,
    chunks : [Types.ChunkRecord],
    docs : [Types.DocumentRecord],
    topK : Nat,
  ) : { chunks : [Text]; slugs : [Text] } {
    let maxTerms = budgetedMaxTerms(chunks.size());
    let rawTerms = takeTerms(tokenize(queryText), maxTerms);
    let queryTerms = expandAcronyms(rawTerms, maxTerms);
    if (queryTerms.size() == 0) {
      return { chunks = []; slugs = [] };
    };

    // Precompute lowered meta once per doc — title/tags/subtitle only.
    let boostBySlug = Map.empty<Text, DocBoostCache>();
    let qLower = Text.toLower(queryText);
    for (d in docs.vals()) {
      Map.add(boostBySlug, Text.compare, d.slug, buildDocBoost(d));
    };

    // Precompute per-doc boost score once (same for all chunks of a slug).
    let docScoreBySlug = Map.empty<Text, Nat>();
    for (d in docs.vals()) {
      switch (Map.get(boostBySlug, Text.compare, d.slug)) {
        case (?boost) {
          Map.add(docScoreBySlug, Text.compare, d.slug, scoreDocBoost(boost, qLower, queryTerms));
        };
        case null {};
      };
    };

    // Score chunks; keep a bounded candidate set without re-sorting the full corpus.
    let CANDIDATE_CAP : Nat = 48;
    var candidates : [(Nat, Types.ChunkRecord)] = [];
    for (c in chunks.vals()) {
      let s = scoreChunk(c, queryTerms, docScoreBySlug);
      if (s == 0) { continue };
      candidates := insertCandidate(candidates, s, c, CANDIDATE_CAP);
    };

    let sorted = Array.sort<(Nat, Types.ChunkRecord)>(
      candidates,
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

  // Inserts (score, chunk) into a bounded candidate list — O(cap) per insert, no full re-sort.
  func insertCandidate(
    xs : [(Nat, Types.ChunkRecord)],
    score : Nat,
    chunk : Types.ChunkRecord,
    cap : Nat,
  ) : [(Nat, Types.ChunkRecord)] {
    if (xs.size() < cap) {
      return Array.concat(xs, [(score, chunk)]);
    };
    var minIdx : Nat = 0;
    var minScore = xs[0].0;
    var i : Nat = 1;
    while (i < xs.size()) {
      let (s, _) = xs[i];
      if (s < minScore) { minScore := s; minIdx := i };
      i += 1;
    };
    if (score <= minScore) { return xs };
    Array.tabulate<(Nat, Types.ChunkRecord)>(
      xs.size(),
      func(j : Nat) { if (j == minIdx) (score, chunk) else xs[j] },
    )
  };

  func scoreDocBoost(
    boost : DocBoostCache,
    qLower : Text,
    queryTerms : [Text],
  ) : Nat {
    var score : Nat = 0;
    if (boost.titleLower.size() > 4 and Text.contains(qLower, #text (boost.titleLower))) {
      score += 500;
    };
    for (term in queryTerms.vals()) {
      if (Text.contains(boost.titleLower, #text term)) {
        score += if (term.size() >= 4) { 70 } else { 30 };
      };
      for (tag in boost.tagsLower.vals()) {
        if (tag == term) { score += 20 };
      };
      if (Text.contains(boost.subtitleLower, #text term)) {
        score += 15;
      };
    };
    score
  };

  func scoreChunk(
    chunk : Types.ChunkRecord,
    queryTerms : [Text],
    docScoreBySlug : Map.Map<Text, Nat>,
  ) : Nat {
    var tfScore : Nat = 0;
    for (term in queryTerms.vals()) {
      let tfMatch = Array.find<(Text, Nat)>(chunk.terms, func(pair) {
        let (t, _) = pair; t == term
      });
      switch (tfMatch) {
        case (?(_, freq)) { tfScore += freq * 10 };
        case null {};
      };
    };
    let docScore = switch (Map.get(docScoreBySlug, Text.compare, chunk.slug)) {
      case (?s) s;
      case null 0;
    };
    // Skip chunks with no body hit unless the full title matched the query
    // (docScore >= 500). Prevents common title-substring matches from scoring
    // every chunk of weakly related docs into the candidate heap.
    if (tfScore == 0 and docScore < 500) { return 0 };
    tfScore + docScore
  };
};
