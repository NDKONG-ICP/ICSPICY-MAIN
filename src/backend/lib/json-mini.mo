/// Minimal JSON-to-ICRC7.Value parser.
///
/// Originally scoped to IC SPICY templated NFT metadata (Phase 3.2).
/// Extended in Phase 4 to handle general-purpose API responses (ICPay)
/// by adding null/true/false literal support and negative integers.
///
/// Supported:
/// - Objects with unique string keys
/// - Arrays of supported values
/// - String values (UTF-8; backslash escapes \" \\ \/ \b \f \n \r \t)
/// - Whole-number integers (mapped to #Nat)
/// - Negative integers like -5 (mapped to #Int)
/// - Decimal fractions like "5.0" (preserved as #Text; no #Float in ICRC-3)
/// - Negative decimals like "-5.0" (preserved as #Text "-5.0")
/// - null  → #Text "null"
/// - true  → #Text "true"
/// - false → #Text "false"
///
/// Explicitly NOT supported (returns #err with descriptive message):
/// - Scientific notation (no e/E)
/// - Unicode \uXXXX escape sequences in strings
/// - JSON comments
/// - Trailing commas
/// - Duplicate keys in an object (rejected as non-deterministic)
/// - Invalid UTF-8 bytes in strings
/// - Whitespace-only or empty input
/// - Trailing data after a top-level value
///
/// Mapping to ICRC-7 Value variant:
///   JSON object         → #Map [(Text, Value)]
///   JSON array          → #Array [Value]
///   JSON string         → #Text Text
///   JSON whole-int      → #Nat Nat
///   JSON negative int   → #Int Int       (e.g. -5 → #Int -5)
///   JSON decimal "5.0"  → #Text "5.0"    (preserve lexeme byte-for-byte)
///   JSON neg decimal    → #Text "-5.0"   (preserve lexeme byte-for-byte)
///   JSON null           → #Text "null"
///   JSON true           → #Text "true"
///   JSON false          → #Text "false"
///
/// Phase 3.2 ownership: this parser is invoked at metadata-load time
/// (in loadStaticMetadata) so malformed JSON is caught at deploy, not at
/// query. See PROJECT_CONTEXT.md "ICRC-7 implementation rules" for why.

import Array "mo:core/Array";
import Blob "mo:core/Blob";
import List "mo:core/List";
import Nat "mo:core/Nat";
import Nat8 "mo:core/Nat8";
import Result "mo:core/Result";
import Set "mo:core/Set";
import Text "mo:core/Text";
import ICRC7 "../types/icrc7";

module {
  // ── ASCII byte constants (small enough to inline-document each) ───────────
  let SPACE     : Nat8 = 0x20;
  let TAB       : Nat8 = 0x09;
  let LF        : Nat8 = 0x0A;
  let CR        : Nat8 = 0x0D;
  let QUOTE     : Nat8 = 0x22; // "
  let BACKSLASH : Nat8 = 0x5C; // \
  let SLASH     : Nat8 = 0x2F; // /
  let LBRACE    : Nat8 = 0x7B; // {
  let RBRACE    : Nat8 = 0x7D; // }
  let LBRACK    : Nat8 = 0x5B; // [
  let RBRACK    : Nat8 = 0x5D; // ]
  let COMMA     : Nat8 = 0x2C; // ,
  let COLON     : Nat8 = 0x3A; // :
  let DOT       : Nat8 = 0x2E; // .
  let DIGIT0    : Nat8 = 0x30; // 0
  let DIGIT9    : Nat8 = 0x39; // 9
  let LOWER_E   : Nat8 = 0x65; // e
  let UPPER_E   : Nat8 = 0x45; // E
  let MINUS     : Nat8 = 0x2D; // -
  // Literal keyword bytes (null / true / false)
  let L_n : Nat8 = 0x6E; // n
  let L_u : Nat8 = 0x75; // u
  let L_l : Nat8 = 0x6C; // l
  let L_t : Nat8 = 0x74; // t
  let L_r : Nat8 = 0x72; // r
  let L_f : Nat8 = 0x66; // f
  let L_a : Nat8 = 0x61; // a
  let L_s : Nat8 = 0x73; // s
  let L_e : Nat8 = 0x65; // e (reuse LOWER_E value, named for readability)

  // Mutable cursor over the input bytes. `var pos` is updated in place
  // across recursive calls; records with `var` fields are reference types
  // in Motoko (same pattern as `nextPlantId = { var value : Nat }` in main.mo).
  type State = {
    bytes  : [Nat8];
    var pos : Nat;
  };

  // ── Public entry ──────────────────────────────────────────────────────────

  public func parse(blob : Blob) : Result.Result<ICRC7.Value, Text> {
    let bytes = Blob.toArray(blob);
    if (bytes.size() == 0) return #err("empty input");
    let s : State = { bytes; var pos = 0 };
    skipWhitespace(s);
    if (s.pos >= bytes.size()) return #err("input is whitespace-only");
    switch (parseValue(s)) {
      case (#err e) #err(e);
      case (#ok v) {
        skipWhitespace(s);
        if (s.pos < bytes.size()) {
          return #err("trailing data after JSON value at pos " # Nat.toText(s.pos));
        };
        #ok(v);
      };
    };
  };

  // Convenience for tests / debug methods. Returns a short shape summary
  // useful for asserting "parsed something of the expected structure"
  // without comparing the full Value tree.
  public func summarize(v : ICRC7.Value) : Text {
    switch v {
      case (#Map entries) "object: " # Nat.toText(entries.size()) # " keys";
      case (#Array items) "array: "  # Nat.toText(items.size())   # " items";
      case (#Text t)      "text: \"" # t # "\"";
      case (#Nat n)       "nat: "    # Nat.toText(n);
      case (#Int _)       "int";
      case (#Blob _)      "blob";
    };
  };

  // ── Whitespace ────────────────────────────────────────────────────────────

  func skipWhitespace(s : State) {
    label loop_ws while (s.pos < s.bytes.size()) {
      let b = s.bytes[s.pos];
      if (b == SPACE or b == TAB or b == LF or b == CR) {
        s.pos += 1;
      } else {
        break loop_ws;
      };
    };
  };

  // ── Value dispatcher ──────────────────────────────────────────────────────

  func parseValue(s : State) : Result.Result<ICRC7.Value, Text> {
    skipWhitespace(s);
    if (s.pos >= s.bytes.size()) return #err("unexpected end of input");
    let b = s.bytes[s.pos];
    if (b == LBRACE) return parseObject(s);
    if (b == LBRACK) return parseArray(s);
    if (b == QUOTE) {
      switch (parseString(s)) {
        case (#err e) #err(e);
        case (#ok t) #ok(#Text t);
      };
    } else if (b >= DIGIT0 and b <= DIGIT9) {
      parseNumber(s);
    } else if (b == MINUS) {
      parseNegativeNumber(s);
    } else if (b == L_n) {
      parseLiteralNull(s);
    } else if (b == L_t) {
      parseLiteralTrue(s);
    } else if (b == L_f) {
      parseLiteralFalse(s);
    } else {
      #err(
        "unexpected character at pos " # Nat.toText(s.pos) #
        " (byte 0x" # nat8ToHex(b) #
        "); expected '{', '[', '\"', digit, '-', null, true, or false"
      );
    };
  };

  // ── Object ────────────────────────────────────────────────────────────────

  func parseObject(s : State) : Result.Result<ICRC7.Value, Text> {
    // Caller verified s.bytes[s.pos] == LBRACE
    s.pos += 1;
    let entries = List.empty<(Text, ICRC7.Value)>();
    let seen = Set.empty<Text>();
    skipWhitespace(s);
    // Empty object
    if (s.pos < s.bytes.size() and s.bytes[s.pos] == RBRACE) {
      s.pos += 1;
      return #ok(#Map([]));
    };
    label loop_obj loop {
      skipWhitespace(s);
      if (s.pos >= s.bytes.size()) return #err("unterminated object");
      if (s.bytes[s.pos] != QUOTE) {
        return #err("expected '\"' for object key at pos " # Nat.toText(s.pos));
      };
      let key = switch (parseString(s)) {
        case (#err e) return #err("error parsing object key: " # e);
        case (#ok t)  t;
      };
      if (Set.contains(seen, Text.compare, key)) {
        return #err("duplicate key '" # key # "' in object");
      };
      Set.add(seen, Text.compare, key);
      skipWhitespace(s);
      if (s.pos >= s.bytes.size() or s.bytes[s.pos] != COLON) {
        return #err("expected ':' after object key '" # key # "'");
      };
      s.pos += 1;
      switch (parseValue(s)) {
        case (#err e) return #err("error parsing value for key '" # key # "': " # e);
        case (#ok v)  List.add<(Text, ICRC7.Value)>(entries, (key, v));
      };
      skipWhitespace(s);
      if (s.pos >= s.bytes.size()) return #err("unterminated object");
      let b = s.bytes[s.pos];
      if (b == RBRACE) {
        s.pos += 1;
        break loop_obj;
      };
      if (b != COMMA) {
        return #err("expected ',' or '}' in object at pos " # Nat.toText(s.pos));
      };
      s.pos += 1; // consume comma
      skipWhitespace(s);
      // Trailing-comma check: comma must be followed by another key, not '}'
      if (s.pos < s.bytes.size() and s.bytes[s.pos] == RBRACE) {
        return #err("trailing comma in object at pos " # Nat.toText(s.pos));
      };
    };
    #ok(#Map(List.toArray(entries)));
  };

  // ── Array ─────────────────────────────────────────────────────────────────

  func parseArray(s : State) : Result.Result<ICRC7.Value, Text> {
    // Caller verified s.bytes[s.pos] == LBRACK
    s.pos += 1;
    let items = List.empty<ICRC7.Value>();
    skipWhitespace(s);
    // Empty array
    if (s.pos < s.bytes.size() and s.bytes[s.pos] == RBRACK) {
      s.pos += 1;
      return #ok(#Array([]));
    };
    label loop_arr loop {
      switch (parseValue(s)) {
        case (#err e) return #err("error parsing array element: " # e);
        case (#ok v)  List.add<ICRC7.Value>(items, v);
      };
      skipWhitespace(s);
      if (s.pos >= s.bytes.size()) return #err("unterminated array");
      let b = s.bytes[s.pos];
      if (b == RBRACK) {
        s.pos += 1;
        break loop_arr;
      };
      if (b != COMMA) {
        return #err("expected ',' or ']' in array at pos " # Nat.toText(s.pos));
      };
      s.pos += 1;
      skipWhitespace(s);
      // Trailing-comma check
      if (s.pos < s.bytes.size() and s.bytes[s.pos] == RBRACK) {
        return #err("trailing comma in array at pos " # Nat.toText(s.pos));
      };
    };
    #ok(#Array(List.toArray(items)));
  };

  // ── String ────────────────────────────────────────────────────────────────
  // Returns Text. Handles standard escapes; rejects \uXXXX. Decodes UTF-8
  // once at the end (fewer Char allocations than per-byte-to-Char append).

  func parseString(s : State) : Result.Result<Text, Text> {
    // Caller verified s.bytes[s.pos] == QUOTE
    s.pos += 1;
    let buf = List.empty<Nat8>();
    label loop_str loop {
      if (s.pos >= s.bytes.size()) return #err("unterminated string");
      let b = s.bytes[s.pos];
      if (b == QUOTE) {
        s.pos += 1;
        break loop_str;
      };
      if (b == BACKSLASH) {
        s.pos += 1;
        if (s.pos >= s.bytes.size()) return #err("unterminated escape sequence");
        let e = s.bytes[s.pos];
        if      (e == QUOTE)     List.add<Nat8>(buf, QUOTE)
        else if (e == BACKSLASH) List.add<Nat8>(buf, BACKSLASH)
        else if (e == SLASH)     List.add<Nat8>(buf, SLASH)
        else if (e == 0x62)      List.add<Nat8>(buf, 0x08)   // \b → BS
        else if (e == 0x66)      List.add<Nat8>(buf, 0x0C)   // \f → FF
        else if (e == 0x6E)      List.add<Nat8>(buf, 0x0A)   // \n → LF
        else if (e == 0x72)      List.add<Nat8>(buf, 0x0D)   // \r → CR
        else if (e == 0x74)      List.add<Nat8>(buf, 0x09)   // \t → TAB
        else if (e == 0x75)      return #err("\\uXXXX escapes not supported (out of subset) at pos " # Nat.toText(s.pos - 1))
        else                     return #err("invalid escape sequence \\<0x" # nat8ToHex(e) # "> at pos " # Nat.toText(s.pos - 1));
        s.pos += 1;
      } else {
        List.add<Nat8>(buf, b);
        s.pos += 1;
      };
    };
    let blobBytes = Blob.fromArray(List.toArray(buf));
    switch (Text.decodeUtf8(blobBytes)) {
      case (?t) #ok(t);
      case null #err("invalid UTF-8 in string ending near pos " # Nat.toText(s.pos));
    };
  };

  // ── Number ────────────────────────────────────────────────────────────────
  // Whole-int → #Nat. Decimal → #Text preserving lexeme. Rejects negative,
  // scientific notation, leading-zero-followed-by-digit (e.g. "01" is invalid
  // JSON; "0" and "0.5" are fine).

  func parseNumber(s : State) : Result.Result<ICRC7.Value, Text> {
    let start = s.pos;
    var hasDecimal = false;
    var natValue : Nat = 0;
    let firstByte = s.bytes[s.pos];
    let isLeadingZero = firstByte == DIGIT0;
    natValue := Nat8.toNat(firstByte) - Nat8.toNat(DIGIT0);
    s.pos += 1;
    // Consume integer digits
    label loop_int while (s.pos < s.bytes.size()) {
      let b = s.bytes[s.pos];
      if (b < DIGIT0 or b > DIGIT9) break loop_int;
      // Reject leading-zero-followed-by-digit (e.g. "01")
      if (isLeadingZero and s.pos == start + 1) {
        return #err("invalid number with leading zero at pos " # Nat.toText(start));
      };
      natValue := natValue * 10 + Nat8.toNat(b) - Nat8.toNat(DIGIT0);
      s.pos += 1;
    };
    // Optional decimal
    if (s.pos < s.bytes.size() and s.bytes[s.pos] == DOT) {
      hasDecimal := true;
      s.pos += 1;
      // Require ≥ 1 digit after dot
      if (s.pos >= s.bytes.size() or s.bytes[s.pos] < DIGIT0 or s.bytes[s.pos] > DIGIT9) {
        return #err("expected digit after '.' at pos " # Nat.toText(s.pos));
      };
      label loop_frac while (s.pos < s.bytes.size()) {
        let b = s.bytes[s.pos];
        if (b < DIGIT0 or b > DIGIT9) break loop_frac;
        s.pos += 1;
      };
    };
    // Reject e/E (scientific notation)
    if (s.pos < s.bytes.size()) {
      let nb = s.bytes[s.pos];
      if (nb == LOWER_E or nb == UPPER_E) {
        return #err("scientific notation (e/E) not supported (out of subset) at pos " # Nat.toText(s.pos));
      };
    };
    if (hasDecimal) {
      // Preserve the original lexeme as #Text (faithful + deterministic).
      let lex = Array.sliceToArray<Nat8>(s.bytes, start, s.pos);
      switch (Text.decodeUtf8(Blob.fromArray(lex))) {
        case (?t) #ok(#Text t);
        case null #err("internal error: invalid UTF-8 in number lexeme");
      };
    } else {
      #ok(#Nat natValue);
    };
  };

  // ── Literal keywords (null / true / false) ───────────────────────────────
  //
  // All three map to #Text to preserve the value without adding new variants.
  // Callers that need boolean semantics compare the Text value.

  func expectBytes(s : State, expected : [Nat8], _name : Text) : Bool {
    let len = expected.size();
    if (s.pos + len > s.bytes.size()) return false;
    var i = 0;
    while (i < len) {
      if (s.bytes[s.pos + i] != expected[i]) return false;
      i += 1;
    };
    s.pos += len;
    true
  };

  func parseLiteralNull(s : State) : Result.Result<ICRC7.Value, Text> {
    if (expectBytes(s, [L_n, L_u, L_l, L_l], "null")) #ok(#Text "null")
    else #err("invalid literal at pos " # Nat.toText(s.pos) # " (expected 'null')")
  };

  func parseLiteralTrue(s : State) : Result.Result<ICRC7.Value, Text> {
    if (expectBytes(s, [L_t, L_r, L_u, L_e], "true")) #ok(#Text "true")
    else #err("invalid literal at pos " # Nat.toText(s.pos) # " (expected 'true')")
  };

  func parseLiteralFalse(s : State) : Result.Result<ICRC7.Value, Text> {
    if (expectBytes(s, [L_f, L_a, L_l, L_s, L_e], "false")) #ok(#Text "false")
    else #err("invalid literal at pos " # Nat.toText(s.pos) # " (expected 'false')")
  };

  // ── Negative numbers ─────────────────────────────────────────────────────
  //
  // Negative whole-int → #Int (ICRC-3 Value has an #Int variant).
  // Negative decimal   → #Text "-5.0" (same lossless treatment as positive decimals).

  func parseNegativeNumber(s : State) : Result.Result<ICRC7.Value, Text> {
    // s.bytes[s.pos] == MINUS; advance past it before calling parseNumber.
    s.pos += 1;
    if (s.pos >= s.bytes.size() or s.bytes[s.pos] < DIGIT0 or s.bytes[s.pos] > DIGIT9) {
      return #err("expected digit after '-' at pos " # Nat.toText(s.pos));
    };
    switch (parseNumber(s)) {
      case (#err e) #err(e);
      case (#ok(#Nat n)) #ok(#Int(- n));
      case (#ok(#Text t)) {
        // Decimal — reconstruct the negative lexeme.
        #ok(#Text("-" # t))
      };
      case (#ok _) #err("internal: unexpected parseNumber result for negative");
    };
  };

  // ── Helpers ───────────────────────────────────────────────────────────────

  func nat8ToHex(b : Nat8) : Text {
    let hi = Nat8.toNat(b) / 16;
    let lo = Nat8.toNat(b) % 16;
    hexDigit(hi) # hexDigit(lo);
  };

  func hexDigit(n : Nat) : Text {
    if (n < 10) Nat.toText(n)
    else if (n == 10) "A"
    else if (n == 11) "B"
    else if (n == 12) "C"
    else if (n == 13) "D"
    else if (n == 14) "E"
    else "F";
  };
};
