// types/slicer-spawn.mo — deterministic slicer spawn events.

module {
  public type SpawnEvent = {
    index : Nat;
    objectId : Nat;
    kind : Nat;
    spawnTimeMs : Nat;
    isFrenzy : Bool;
  };
};
