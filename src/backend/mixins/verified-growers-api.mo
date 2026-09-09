import AccessControl "../lib/access-control";
import AuditLog "../lib/audit-log";
import VerifiedGrowersLib "../lib/verified-growers";
import VerifiedGrowersTypes "../types/verified-growers";
import Map "mo:core/Map";
import Runtime "mo:core/Runtime";
import Time "mo:core/Time";
import Text "mo:core/Text";
import Result "mo:core/Result";

mixin (
  accessControlState : AccessControl.AccessControlState,
  auditLog : { var value : AuditLog.AuditLog },
  verifiedGrowers : VerifiedGrowersLib.Store,
) {
  public query func listVerifiedGrowers() : async [VerifiedGrowersTypes.VerifiedGrower] {
    VerifiedGrowersLib.listSorted(verifiedGrowers)
  };

  public shared ({ caller }) func adminUpsertVerifiedGrower(
    input : VerifiedGrowersTypes.VerifiedGrowerUpsert,
  ) : async VerifiedGrowersTypes.VerifiedGrower {
    AccessControl.requireAdmin(accessControlState, caller);
    switch (VerifiedGrowersLib.validateUpsert(input)) {
      case (#err(msg)) Runtime.trap(msg);
      case (#ok(_)) {};
    };
    let now = Time.now();
    if (input.growerOfTheMonth != null) {
      VerifiedGrowersLib.clearGrowerOfTheMonthExcept(verifiedGrowers, input.id, now);
    };
    let saved = VerifiedGrowersLib.upsert(verifiedGrowers, input, now);
    auditLog.value := AuditLog.append(auditLog.value, {
      ts = now;
      admin = caller;
      action = "adminUpsertVerifiedGrower";
      detail = input.id # " · " # input.name;
    });
    saved
  };

  public shared ({ caller }) func adminDeleteVerifiedGrower(id : Text) : async () {
    AccessControl.requireAdmin(accessControlState, caller);
    if (not VerifiedGrowersLib.isValidSlug(id)) {
      Runtime.trap("Invalid grower id");
    };
    ignore verifiedGrowers.delete(id);
    auditLog.value := AuditLog.append(auditLog.value, {
      ts = Time.now();
      admin = caller;
      action = "adminDeleteVerifiedGrower";
      detail = id;
    });
  };

  public shared ({ caller }) func adminSetGrowerOfTheMonth(
    id : Text,
    monthLabel : Text,
  ) : async () {
    AccessControl.requireAdmin(accessControlState, caller);
    if (not VerifiedGrowersLib.isValidSlug(id)) {
      Runtime.trap("Invalid grower id");
    };
    switch (VerifiedGrowersLib.setGrowerOfTheMonth(verifiedGrowers, id, monthLabel, Time.now())) {
      case (#err(msg)) Runtime.trap(msg);
      case (#ok(_)) {};
    };
    auditLog.value := AuditLog.append(auditLog.value, {
      ts = Time.now();
      admin = caller;
      action = "adminSetGrowerOfTheMonth";
      detail = id # " · " # monthLabel;
    });
  };
};
