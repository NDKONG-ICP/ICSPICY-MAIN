import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Text "mo:core/Text";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Iter "mo:core/Iter";
import Array "mo:core/Array";
import AccessControl "../lib/access-control";
import VarietyTypes "../types/variety";
import ProvenanceTypes "../types/variety-provenance";

mixin (
  accessControlState : AccessControl.AccessControlState,
  varieties : Map.Map<Nat, VarietyTypes.Variety>,
  varietyProvenance : Map.Map<Nat, ProvenanceTypes.VarietyProvenance>,
  varietyIntros : Map.Map<Nat, Text>,
) {
  func provRequireAdmin(caller : Principal) {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Admin only");
    };
  };

  func validateProvenance(p : ProvenanceTypes.VarietyProvenance) : Bool {
    if (p.sources.size() > 8) return false;
    for (s in p.sources.vals()) {
      if (s.vendorName.size() == 0 or s.vendorName.size() > 120) return false;
      if (s.url.size() == 0 or s.url.size() > 500) return false;
    };
    switch (p.breeder) {
      case (?b) { if (b.size() > 200) return false };
      case null {};
    };
    switch (p.breederLocation) {
      case (?b) { if (b.size() > 200) return false };
      case null {};
    };
    switch (p.origin) {
      case (?o) { if (o.size() > 200) return false };
      case null {};
    };
    switch (p.species) {
      case (?s) { if (s.size() > 120) return false };
      case null {};
    };
    switch (p.heatClass) {
      case (?h) { if (h.size() > 40) return false };
      case null {};
    };
    switch (p.photoKey) {
      case (?k) { if (k.size() > 300) return false };
      case null {};
    };
    switch (p.photoCredit) {
      case (?c) { if (c.size() > 300) return false };
      case null {};
    };
    true;
  };

  public shared ({ caller }) func setVarietyProvenance(
    varietyId : Nat,
    provenance : ProvenanceTypes.VarietyProvenance,
  ) : async Bool {
    provRequireAdmin(caller);
    switch (varieties.get(varietyId)) {
      case null return false;
      case (?_) {};
    };
    if (not validateProvenance(provenance)) {
      Runtime.trap("Invalid provenance payload");
    };
    varietyProvenance.add(varietyId, provenance);
    true;
  };

  public query func getVarietyProvenance(
    varietyId : Nat,
  ) : async ?ProvenanceTypes.VarietyProvenancePublic {
    switch (varietyProvenance.get(varietyId)) {
      case (?p) {
        ?{
          variety_id = varietyId;
          breeder = p.breeder;
          breederLocation = p.breederLocation;
          origin = p.origin;
          species = p.species;
          heatClass = p.heatClass;
          sources = p.sources;
          photoKey = p.photoKey;
          photoCredit = p.photoCredit;
        };
      };
      case null null;
    };
  };

  public query func listVarietyProvenance(
    offset : Nat,
    limit : Nat,
  ) : async [ProvenanceTypes.VarietyProvenancePublic] {
    let cap = if (limit > 500) { 500 } else { limit };
    let all = Iter.toArray(
      Iter.map(
        varietyProvenance.entries(),
        func((id : Nat, p : ProvenanceTypes.VarietyProvenance)) : ProvenanceTypes.VarietyProvenancePublic {
          {
            variety_id = id;
            breeder = p.breeder;
            breederLocation = p.breederLocation;
            origin = p.origin;
            species = p.species;
            heatClass = p.heatClass;
            sources = p.sources;
            photoKey = p.photoKey;
            photoCredit = p.photoCredit;
          };
        },
      ),
    );
    Array.tabulate<ProvenanceTypes.VarietyProvenancePublic>(
      Nat.min(cap, if (offset >= all.size()) { 0 } else { all.size() - offset }),
      func(i : Nat) : ProvenanceTypes.VarietyProvenancePublic {
        all[offset + i];
      },
    );
  };

  public shared ({ caller }) func setVarietyIntro(
    varietyId : Nat,
    intro : Text,
  ) : async Bool {
    provRequireAdmin(caller);
    switch (varieties.get(varietyId)) {
      case null return false;
      case (?_) {};
    };
    if (intro.size() == 0) {
      ignore varietyIntros.delete(varietyId);
    } else {
      if (intro.size() > 2000) {
        Runtime.trap("Intro too long (max 2000 chars)");
      };
      varietyIntros.add(varietyId, intro);
    };
    true;
  };

  public query func getVarietyIntro(varietyId : Nat) : async ?Text {
    varietyIntros.get(varietyId);
  };

  public query func listVarietyIntros() : async [(Nat, Text)] {
    varietyIntros.entries().toArray();
  };
};
