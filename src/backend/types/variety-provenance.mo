module {
  public type VarietySource = {
    vendorName : Text;
    url : Text;
  };

  public type VarietyProvenance = {
    breeder : ?Text;
    breederLocation : ?Text;
    origin : ?Text;
    species : ?Text;
    heatClass : ?Text;
    sources : [VarietySource];
    photoKey : ?Text;
    photoCredit : ?Text;
  };

  public type VarietyProvenancePublic = {
    variety_id : Nat;
    breeder : ?Text;
    breederLocation : ?Text;
    origin : ?Text;
    species : ?Text;
    heatClass : ?Text;
    sources : [VarietySource];
    photoKey : ?Text;
    photoCredit : ?Text;
  };
};
