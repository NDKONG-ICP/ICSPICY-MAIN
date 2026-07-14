// lib/slicer-log.mo — canonical slice-log serialization + sha256 pin.

import Array "mo:core/Array";
import Blob "mo:core/Blob";
import Nat "mo:core/Nat";
import Nat8 "mo:core/Nat8";
import Text "mo:core/Text";
import Sha256 "mo:sha2/Sha256";
import RunTypes "../types/slicer-run";

module {
  public type ParsedRun = {
    durationMs : Nat;
    livesLost : Nat;
    slices : [RunTypes.SliceLogEntry];
  };

  func sortSlices(slices : [RunTypes.SliceLogEntry]) : [RunTypes.SliceLogEntry] {
    Array.sort<RunTypes.SliceLogEntry>(
      slices,
      func(a : RunTypes.SliceLogEntry, b : RunTypes.SliceLogEntry) : {
        #less; #equal; #greater;
      } {
        if (a.sliceTimeMs < b.sliceTimeMs) { #less }
        else if (a.sliceTimeMs > b.sliceTimeMs) { #greater }
        else if (a.objectIndex < b.objectIndex) { #less }
        else if (a.objectIndex > b.objectIndex) { #greater }
        else { #equal };
      },
    );
  };

  /// Deterministic JSON (no whitespace) — slices sorted by (sliceTimeMs, objectIndex).
  public func canonicalSliceLogJson(run : ParsedRun) : Text {
    let sorted = sortSlices(run.slices);
    var slicesText = "";
    for (s in sorted.vals()) {
      if (slicesText.size() > 0) { slicesText := slicesText # "," };
      slicesText :=
        slicesText #
        "{\"objectIndex\":" # Nat.toText(s.objectIndex) #
        ",\"sliceTimeMs\":" # Nat.toText(s.sliceTimeMs) # "}";
    };
    "{\"durationMs\":" # Nat.toText(run.durationMs) #
    ",\"livesLost\":" # Nat.toText(run.livesLost) #
    ",\"slices\":[" # slicesText # "]}";
  };

  let HEX : [Text] = [
    "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "a", "b", "c", "d", "e", "f",
  ];

  func hexDigit(n : Nat) : Text {
    if (n < HEX.size()) { HEX[n] } else { "0" };
  };

  public func sha256HexLower(text : Text) : Text {
    let digest = Sha256.fromBlob(#sha256, text.encodeUtf8());
    let bytes = Blob.toArray(digest);
    var out = "";
    for (b in bytes.vals()) {
      let n = Nat8.toNat(b);
      let hi = n / 16;
      let lo = n % 16;
      out := out # hexDigit(hi) # hexDigit(lo);
    };
    out;
  };

  public func sliceLogHash(run : ParsedRun) : Text {
    sha256HexLower(canonicalSliceLogJson(run));
  };
};
