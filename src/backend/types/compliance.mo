module {
  public type AgeAttestationMethod = { #self_cert_13_plus };

  public type AgeAttestation = {
    attestedAt : Int;
    method : AgeAttestationMethod;
  };

  public type AgeAttestationPublic = {
    attestedAt : Int;
    method : Text;
  };
};
