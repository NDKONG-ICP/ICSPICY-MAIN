import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Time "mo:core/Time";
import ComplianceTypes "../types/compliance";

module {
  public func requireAgeAttested(
    ageAttestations : Map.Map<Principal, ComplianceTypes.AgeAttestation>,
    caller : Principal,
  ) {
    switch (ageAttestations.get(caller)) {
      case null {
        Runtime.trap("Age attestation required. Confirm you are 13 or older in the app.");
      };
      case (?_) {};
    };
  };

  public func setAttestation(
    ageAttestations : Map.Map<Principal, ComplianceTypes.AgeAttestation>,
    caller : Principal,
  ) : ComplianceTypes.AgeAttestationPublic {
    let rec : ComplianceTypes.AgeAttestation = {
      attestedAt = Time.now();
      method = #self_cert_13_plus;
    };
    ageAttestations.add(caller, rec);
    toPublic(rec);
  };

  public func getAttestation(
    ageAttestations : Map.Map<Principal, ComplianceTypes.AgeAttestation>,
    caller : Principal,
  ) : ?ComplianceTypes.AgeAttestationPublic {
    switch (ageAttestations.get(caller)) {
      case null null;
      case (?rec) ?toPublic(rec);
    };
  };

  func toPublic(rec : ComplianceTypes.AgeAttestation) : ComplianceTypes.AgeAttestationPublic {
    {
      attestedAt = rec.attestedAt;
      method = switch (rec.method) {
        case (#self_cert_13_plus) "self_cert_13_plus";
      };
    };
  };
};
