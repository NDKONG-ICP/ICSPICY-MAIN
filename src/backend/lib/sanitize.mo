import Text "mo:core/Text";
import Nat "mo:core/Nat";
import Char "mo:core/Char";

module {
  /// Trim whitespace, strip HTML tags, and enforce max character length.
  public func sanitizeText(input : Text, maxLength : Nat) : Text {
    let stripped = stripHtmlTags(input);
    let trimmed = Text.trim(stripped, #char ' ');
    truncate(trimmed, maxLength);
  };

  func stripHtmlTags(t : Text) : Text {
    var out = "";
    var inTag = false;
    for (c in t.chars()) {
      switch (c, inTag) {
        case ('<', _) { inTag := true };
        case ('>', true) { inTag := false };
        case (_, true) {};
        case (c, false) { out #= Char.toText(c) };
      };
    };
    out;
  };

  func truncate(t : Text, maxLen : Nat) : Text {
    var i : Nat = 0;
    var out = "";
    for (c in t.chars()) {
      if (i >= maxLen) return out;
      out #= Char.toText(c);
      i += 1;
    };
    out;
  };
};
