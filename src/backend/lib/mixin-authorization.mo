// TODO Phase 1: replace with shared(msg) owner capture + addAdmin/removeAdmin/timelock pattern.
// Minimal in-tree stub preserving the caffeineai-authorization MixinAuthorization API exactly.
import AccessControl "./access-control";

mixin (accessControlState : AccessControl.AccessControlState) {
  public shared ({ caller }) func _initializeAccessControl() : async () {
    AccessControl.initialize(accessControlState, caller);
  };

  public query ({ caller }) func getCallerUserRole() : async AccessControl.UserRole {
    AccessControl.getUserRole(accessControlState, caller);
  };

  public shared ({ caller }) func assignCallerUserRole(user : Principal, role : AccessControl.UserRole) : async () {
    AccessControl.assignRole(accessControlState, caller, user, role);
  };

  public query ({ caller }) func isCallerAdmin() : async Bool {
    AccessControl.isAdmin(accessControlState, caller);
  };
};
