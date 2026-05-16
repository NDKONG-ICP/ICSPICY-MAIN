// mixins/claim-api.mo
//
// Phase 4 QR-claim wiring for IC SPICY NFTs.
//
// Claim tokens are short opaque strings (format: spcy_<10 hex chars>) that an
// admin pre-generates offline and encodes in QR stickers attached to physical
// IC SPICY pepper products. When a customer scans the QR, the frontend shows
// an NFT preview (getClaimInfo) then lets the user redeem (redeemClaim) to
// transfer the NFT from the canister pool directly to their wallet.
//
// Methods:
//   generateClaimToken(tokenId)     — admin, single NFT → spcy_ token
//   generateClaimTokens(tokenIds)   — admin, batch generate for CSV export
//   redeemClaim(claimToken)         — authenticated user, NFT transfer + audit
//   getClaimInfo(token)             — public query, NFT preview for landing page

import AccessControl "../lib/access-control";
import AuditLog      "../lib/audit-log";
import ICRC7Lib      "../lib/icrc7";
import ClaimTypes    "../types/claim";
import ICRC7         "../types/icrc7";
import Array "mo:core/Array";
import Map   "mo:core/Map";
import Set   "mo:core/Set";
import Principal "mo:core/Principal";
import Text  "mo:core/Text";
import Nat   "mo:core/Nat";
import Int   "mo:core/Int";
import Time  "mo:core/Time";
import Runtime "mo:core/Runtime";

mixin (
  accessControlState : AccessControl.AccessControlState,
  nftClaimTokens     : Map.Map<Text, ClaimTypes.NftClaimEntry>,
  icrc7Owners        : Map.Map<Nat, ICRC7.Account>,
  icrc7Balances      : Map.Map<Principal, Set.Set<Nat>>,
  selfPrincipal      : () -> Principal,
  auditLog           : { var value : AuditLog.AuditLog },
) {

  // ── Hex encoding helpers ──────────────────────────────────────────────────

  func hexChar(n : Nat) : Char {
    let chars = ['0','1','2','3','4','5','6','7','8','9','a','b','c','d','e','f'];
    chars[n % 16]
  };

  // Format lower 10 hex digits of n (zero-padded on the left).
  func toHex10(n : Nat) : Text {
    var result = "";
    var rem = n;
    var i = 0;
    while (i < 10) {
      result := Text.fromChar(hexChar(rem % 16)) # result;
      rem := rem / 16;
      i += 1;
    };
    result
  };

  // Derive a deterministic-but-unique claim token from (tokenId, now, count).
  // Entropy is sufficient for Phase 4 offline admin generation. The format
  // spcy_<10hex> gives 16^10 ≈ 1 trillion possible values — collision-free
  // for any realistic collection size.
  func makeClaimToken(tokenId : Nat, now : Int, existingCount : Nat) : Text {
    // Mix inputs with coprime multipliers to spread entropy across the range.
    let seed = Int.abs(now) + tokenId * 1_000_000_007 + existingCount * 997;
    // Mod 16^10 = 1_099_511_627_776 → exactly 10 hex digits.
    "spcy_" # toHex10(seed % 1_099_511_627_776)
  };

  // ── Admin: single-token claim generation ─────────────────────────────────

  /// Admin: generate a QR claim token for a specific NFT token ID.
  ///
  /// Returns the claim token string (e.g. "spcy_7f3a9b2e4d") that the admin
  /// encodes into a QR sticker or CSV export. Call generateClaimTokens for
  /// bulk generation.
  public shared ({ caller }) func generateClaimToken(
    tokenId : Nat,
  ) : async Text {
    AccessControl.requireAdmin(accessControlState, caller);
    let token = makeClaimToken(tokenId, Time.now(), nftClaimTokens.size());
    let entry : ClaimTypes.NftClaimEntry = { tokenId; var redeemed = false };
    nftClaimTokens.add(token, entry);
    auditLog.value := AuditLog.append(auditLog.value, {
      ts     = Time.now();
      admin  = caller;
      action = "claim_token_generated";
      detail = "token=" # token # " tokenId=" # Nat.toText(tokenId);
    });
    token
  };

  // ── Admin: batch claim generation ────────────────────────────────────────

  /// Admin: generate QR claim tokens for multiple NFT token IDs in one call.
  ///
  /// Returns an array of { tokenId; claimToken } pairs suitable for export to
  /// a CSV → QR-code generation pipeline. One audit log entry per token.
  public shared ({ caller }) func generateClaimTokens(
    tokenIds : [Nat],
  ) : async [{ tokenId : Nat; claimToken : Text }] {
    AccessControl.requireAdmin(accessControlState, caller);
    let now = Time.now();
    var idx = 0;
    Array.map<Nat, { tokenId : Nat; claimToken : Text }>(tokenIds, func(tokenId) {
      let token = makeClaimToken(tokenId, now + idx, nftClaimTokens.size());
      let entry : ClaimTypes.NftClaimEntry = { tokenId; var redeemed = false };
      nftClaimTokens.add(token, entry);
      auditLog.value := AuditLog.append(auditLog.value, {
        ts     = now;
        admin  = caller;
        action = "claim_token_generated";
        detail = "token=" # token # " tokenId=" # Nat.toText(tokenId) # " batch=true";
      });
      idx += 1;
      { tokenId; claimToken = token }
    })
  };

  // ── Authenticated: redeem claim ───────────────────────────────────────────

  /// Authenticated: redeem a QR claim token and receive the linked NFT.
  ///
  /// Flow (all synchronous — no CallerGuard needed):
  ///   1. Validate token exists.
  ///   2. Validate token not yet redeemed.
  ///   3. Verify linked NFT is still in the canister pool.
  ///   4. Mark token as redeemed (before assignment — compensation reverts on failure).
  ///   5. assignOwnership: canister pool → caller.
  ///   6. Audit log.
  public shared ({ caller }) func redeemClaim(
    claimToken : Text,
  ) : async { success : Bool; tokenId : ?Nat; message : Text } {
    AccessControl.requireAuthenticated(caller);
    let entry = switch (nftClaimTokens.get(claimToken)) {
      case null return { success = false; tokenId = null; message = "Claim token not found" };
      case (?e) e;
    };
    if (entry.redeemed) {
      return { success = false; tokenId = null; message = "Claim token already redeemed" };
    };
    let canister = selfPrincipal();
    let poolAccount : ICRC7.Account = { owner = canister; subaccount = null };
    let buyerAccount : ICRC7.Account = { owner = caller; subaccount = null };
    // Verify the NFT is still owned by the canister pool.
    let currentOwner = switch (icrc7Owners.get(entry.tokenId)) {
      case null return { success = false; tokenId = null; message = "NFT token not found" };
      case (?o) o;
    };
    if (not (Principal.equal(currentOwner.owner, canister) and currentOwner.subaccount == null)) {
      return { success = false; tokenId = null; message = "NFT not in pool — already transferred or reserved" };
    };
    // Mark redeemed BEFORE the assignment so any re-entry sees it as consumed.
    entry.redeemed := true;
    // Transfer: pool → buyer
    switch (ICRC7Lib.assignOwnership(icrc7Owners, icrc7Balances, entry.tokenId, ?poolAccount, buyerAccount)) {
      case (#err(e)) {
        // Compensate: undo the redeemed flag so the token can be retried.
        entry.redeemed := false;
        return { success = false; tokenId = null; message = "NFT transfer failed: " # e };
      };
      case (#ok) {};
    };
    auditLog.value := AuditLog.append(auditLog.value, {
      ts     = Time.now();
      admin  = caller;
      action = "claim_redeemed";
      detail = "token=" # claimToken #
               " tokenId=" # Nat.toText(entry.tokenId) #
               " by=" # Principal.toText(caller);
    });
    { success = true; tokenId = ?entry.tokenId; message = "IC SPICY #" # Nat.toText(entry.tokenId) # " is yours" }
  };

  // ── Public query: claim info for landing page preview ────────────────────

  /// Public query: return info about a claim token for the QR landing page.
  ///
  /// The frontend calls this before the user logs in to show them which NFT
  /// they're about to claim. Returns null for unknown or invalid tokens.
  public query func getClaimInfo(
    token : Text,
  ) : async ?{ tokenId : Nat; redeemed : Bool; nftName : Text } {
    switch (nftClaimTokens.get(token)) {
      case null null;
      case (?entry) {
        ?{
          tokenId  = entry.tokenId;
          redeemed = entry.redeemed;
          nftName  = "IC SPICY #" # Nat.toText(entry.tokenId);
        }
      };
    }
  };
};
