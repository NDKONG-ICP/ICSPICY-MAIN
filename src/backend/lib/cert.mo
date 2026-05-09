// lib/cert.mo
//
// Certified-data path encoding + thin wrappers over ic-certification's
// CertTree for the ICRC-7 token-metadata Merkle tree (Phase 3.6).
//
// Path scheme (locked in Phase 3.6 design Q1):
//
//   ["icrc7", "<tokenId>"]   — both keys text-encoded as UTF-8 blobs.
//
// Token ID is rendered as decimal Text (not raw Nat bytes) so the path
// is debug-readable from a hex dump of the tree, matching whatever the
// off-chain verifier sees in the witness.
//
// Tree topology: per-token leaves under a single "icrc7" prefix. A
// witness for one token is a Merkle path of ~14 nodes (log₂ 8888); a
// client can verify a single token without needing any other blob.
// This is the core requirement that drove Q1 — a single-root-over-all
// would force clients to fetch all 8888 blobs to verify any one.
//
// Module owns ONLY the path encoding + small wrappers. Storage of the
// CertTree.Store lives in main.mo (persistent across upgrades) and the
// mutator path runs through mixins/icrc7-api.mo's loadStaticMetadata.

import CertTree "mo:ic-certification/CertTree";
import MerkleTree "mo:ic-certification/MerkleTree";
import BaseText "mo:base/Text";
import Nat "mo:core/Nat";

module {
  // Re-exported types so callers don't need their own ic-certification
  // imports just to spell parameter types.
  public type Store   = CertTree.Store;
  public type Path    = MerkleTree.Path;
  public type Witness = MerkleTree.Witness;

  // Re-export so callers don't need their own ic-certification import
  // just to construct the persistent store at actor-body level.
  public func newStore() : Store = CertTree.newStore();

  public func tokenPath(tokenId : Nat) : Path {
    [BaseText.encodeUtf8("icrc7"), BaseText.encodeUtf8(Nat.toText(tokenId))];
  };

  // Convenience wrapper used by loadStaticMetadata: stores the metadata
  // blob at the canonical token path. Caller is responsible for
  // batching setCertifiedData (do NOT call it per-entry — see Q2).
  public func putTokenMetadata(
    store    : Store,
    tokenId  : Nat,
    metadata : Blob,
  ) {
    CertTree.Ops(store).put(tokenPath(tokenId), metadata);
  };

  // Build the Merkle witness for one token. Used by the certified query
  // method; returns a witness regardless of presence/absence (the witness
  // proves either inclusion or non-inclusion).
  public func tokenWitness(store : Store, tokenId : Nat) : Blob {
    let ops = CertTree.Ops(store);
    ops.encodeWitness(ops.reveal(tokenPath(tokenId)));
  };

  // Re-establishes the IC subnet's certified-data slot to the current
  // tree root hash. Must be called from an UPDATE method (CertifiedData.set
  // traps in queries). The CertTree.Ops wrapper does the Prim call for us.
  public func setCertifiedData(store : Store) {
    CertTree.Ops(store).setCertifiedData();
  };
};
