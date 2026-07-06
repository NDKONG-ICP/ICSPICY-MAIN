module {
  public type NotificationKind = {
    #like;
    #comment;
    #tip;
    #follow;
    #orderPlaced;
    #newUser;
    #airdrop;
  };

  /// Stored notification. Records are immutable — read state lives in a
  /// separate per-user lastReadId map so no record mutation (or `var` field)
  /// is ever needed.
  ///
  /// Note: the spec named the acting principal `actor`, but `actor` is a
  /// reserved word in Motoko — the field is `sender` on the wire.
  public type Notification = {
    id : Nat;
    recipient : Principal;
    kind : NotificationKind;
    sender : ?Principal;
    ref_id : ?Text;
    message : Text;
    created_at : Int;
  };

  /// Wire type for queries — `read` computed from the lastReadId watermark.
  public type NotificationPublic = {
    id : Nat;
    kind : NotificationKind;
    sender : ?Principal;
    ref_id : ?Text;
    message : Text;
    created_at : Int;
    read : Bool;
  };
};
