import Map "mo:core/Map";
import List "mo:core/List";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";

module {
  // Admin set: Principal → true for every current admin.
  // Named AccessControlState (not AdminSet) to keep all 14 mixin parameter
  // signatures unchanged — they all declare `accessControlState : AccessControl.AccessControlState`.
  public type AccessControlState = Map.Map<Principal, Bool>;

  // Compat shim type — consumed only by the deprecated getCallerUserRole Candid method.
  public type UserRole = { #admin; #user; #guest };

  // Initialize a new admin set with the deployer as the sole member.
  // Called once at actor construction; result persists across upgrades.
  public func initState(deployer : Principal) : AccessControlState {
    let m = Map.empty<Principal, Bool>();
    m.add(deployer, true);
    m
  };

  // ── Core auth helpers ──────────────────────────────────────────────────────

  public func requireAuthenticated(caller : Principal) {
    if (Principal.isAnonymous(caller)) {
      Runtime.trap("anonymous caller not allowed");
    };
  };

  public func isAdmin(state : AccessControlState, caller : Principal) : Bool {
    switch (state.get(caller)) {
      case (?true) true;
      case _       false;
    };
  };

  public func requireAdmin(state : AccessControlState, caller : Principal) {
    requireAuthenticated(caller);
    if (not isAdmin(state, caller)) {
      Runtime.trap("caller is not an admin");
    };
  };

  // ── Admin set mutations ────────────────────────────────────────────────────

  public func addAdmin(state : AccessControlState, caller : Principal, newAdmin : Principal) {
    requireAdmin(state, caller);
    state.add(newAdmin, true);
  };

  // Refuses to remove the last admin (anti-brick safety).
  public func removeAdmin(state : AccessControlState, caller : Principal, toRemove : Principal) {
    requireAdmin(state, caller);
    if (state.size() <= 1) {
      Runtime.trap("cannot remove the last admin — add another admin first");
    };
    ignore state.delete(toRemove);
  };

  public func listAdmins(state : AccessControlState) : [Principal] {
    let result = List.empty<Principal>();
    for ((p, _) in state.entries()) {
      result.add(p);
    };
    result.toArray()
  };

  // ── Compat shim: computed UserRole for deprecated Candid surface ───────────

  public func getUserRole(state : AccessControlState, caller : Principal) : UserRole {
    if (Principal.isAnonymous(caller)) return #guest;
    if (isAdmin(state, caller)) return #admin;
    #user
  };
};
