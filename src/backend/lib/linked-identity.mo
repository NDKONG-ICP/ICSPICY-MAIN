// lib/linked-identity.mo — Additive helpers over existing II↔OISY link maps.
//
// Does NOT alter linkWallet / unlinkWallet. Reuses:
//   linkedWallets   : II → [wallets]
//   walletToIdentity: wallet → II
//
// Intended unlink behavior (not a bug): if a user UNLINKS after earning a
// badge, the badge stays soulbound to the principal it was minted to —
// unlinking separates identities and badge queries no longer union them.

import Array "mo:core/Array";
import Map "mo:core/Map";
import Principal "mo:core/Principal";
import CoopLib "./coop";

module {
  /// II if `caller` is a linked OISY wallet; otherwise `caller` itself
  /// (II session, or an unlinked OISY-only principal).
  public func canonicalPrincipal(
    caller : Principal,
    walletToIdentity : Map.Map<Principal, Principal>,
  ) : Principal {
    switch (walletToIdentity.get(caller)) {
      case (?ii) ii;
      case null caller;
    };
  };

  /// All principals that represent this user for badge ownership / queries:
  /// canonical II (if any) + every linked wallet. Works when `caller` is
  /// either the II key or a linked OISY wallet.
  public func principalsForUser(
    caller : Principal,
    linkedWallets : Map.Map<Principal, [Principal]>,
    walletToIdentity : Map.Map<Principal, Principal>,
  ) : [Principal] {
    let canon = canonicalPrincipal(caller, walletToIdentity);
    let base = CoopLib.principalsToCheck(canon, linkedWallets);
    // Defensive: ensure the original caller is present even if maps drift.
    switch (Array.find<Principal>(base, func(p) { Principal.equal(p, caller) })) {
      case (?_) base;
      case null base.concat([caller]);
    };
  };
};
