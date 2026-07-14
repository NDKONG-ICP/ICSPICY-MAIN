import Masterclass "lib/masterclass";
import Debug "mo:core/Debug";
import Nat "mo:core/Nat";
import Text "mo:core/Text";

func eq(a : [Nat], b : [Nat]) : Bool {
  if (a.size() != b.size()) return false;
  for (i in a.keys()) { if (a[i] != b[i]) return false };
  true;
};

let inputs : [(Text, Text)] = [("a5lZbvbm4G6B1", "m1-l1-q03")];
let expected : [[Nat]] = [[(0 : Nat), (1 : Nat), (2 : Nat), (3 : Nat)]];
var failed : Nat = 0;
var first : Text = "";
for (i in inputs.keys()) {
  let (seed, qid) = inputs[i];
  let got = Masterclass.choicePermutation(4, seed, qid);
  if (not eq(got, expected[i])) {
    failed += 1;
    if (first.size() == 0) {
      first := seed # "|" # qid;
    };
  };
};
if (failed > 0) {
  Debug.trap("MISMATCH count=" # Nat.toText(failed) # " first=" # first);
};
Debug.print("OK " # Nat.toText(inputs.size()));
