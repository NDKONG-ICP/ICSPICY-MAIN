import Map "mo:core/Map";
import Principal "mo:core/Principal";
import AccessControl "../lib/access-control";
import ComplianceLib "../lib/compliance";
import ComplianceTypes "../types/compliance";

mixin (
  accessControlState : AccessControl.AccessControlState,
  ageAttestations : Map.Map<Principal, ComplianceTypes.AgeAttestation>,
) {
  public shared ({ caller }) func setAgeAttestation() : async ComplianceTypes.AgeAttestationPublic {
    AccessControl.requireAuthenticated(caller);
    ComplianceLib.setAttestation(ageAttestations, caller);
  };

  public query ({ caller }) func getMyAgeAttestation() : async ?ComplianceTypes.AgeAttestationPublic {
    ComplianceLib.getAttestation(ageAttestations, caller);
  };
};
