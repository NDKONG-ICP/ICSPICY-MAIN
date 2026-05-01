import Common "common";

module {
  // A single stored artwork file (one layer image, stored on-chain as bytes).
  // Data is stored as [Nat8] — keeping as raw bytes avoids any [Nat8]→Blob
  // conversion during canister upgrades, which was causing IC0539 Wasm memory
  // overflow (1.9GB peak) when migrating large artwork collections.
  public type StoredFile = {
    path      : Text;       // e.g. "layer-1/background.png"
    layer     : Text;       // folder name e.g. "layer-1"
    filename  : Text;       // e.g. "background.png"
    mime_type : Text;       // e.g. "image/png"
    data      : [Nat8];     // raw file bytes
    size      : Nat;        // byte count
    uploaded_at : Common.Timestamp;
  };

  // Summary of layers detected after upload finalization
  public type LayerSummary = {
    layer       : Text;
    file_count  : Nat;
    file_names  : [Text];
  };

  // Result returned after finalizing a zip upload
  public type UploadResult = {
    asset_canister_id : Text;   // this canister's own principal
    layers_detected   : Nat;
    total_files       : Nat;
    layer_summaries   : [LayerSummary];
  };

  // In-progress upload session.
  // Uses a pre-allocated flat buffer written at byte offsets rather than
  // accumulating a [[Nat8]] list — avoids heap overflow on large zips.
  public type UploadSession = {
    // Flat byte buffer pre-allocated to totalChunks * chunkSize bytes.
    // Each receiveChunk call writes directly to the correct offset.
    var buffer       : [var Nat8];
    // Size of each chunk (set from the first chunk received).
    var chunk_size   : Nat;
    var total_chunks : Nat;
    var received     : Nat;
    started_at       : Common.Timestamp;
  };

  // Status of an in-progress session (public-facing, no data bytes)
  public type UploadSessionStatus = {
    total_chunks  : Nat;
    received      : Nat;
    started_at    : Common.Timestamp;
  };

  // ── Pool NFT types ──────────────────────────────────────────────────────────

  public type PoolNFTRarity = {
    #Common;    // 5,000
    #Uncommon;  // 2,888
    #Rare;      // 1,000
  };

  public type PoolNFTStatus = {
    #Ready;
    #Airdropped : { to : Principal; at : Common.Timestamp };
    #ListedOnShop : { product_id : Nat; at : Common.Timestamp };
    #AssignedToQR : { claim_token : Text; at : Common.Timestamp };
  };

  // A pre-generated pool NFT (metadata + layer combo, no plant required)
  public type PoolNFT = {
    id          : Nat;           // 1–8888
    token_id    : Text;          // "pool-nft-1" … "pool-nft-8888"
    rarity      : PoolNFTRarity;
    layer_combo : [Text];        // layer file paths chosen for this NFT
    image_key   : Text;          // composite image path (or first-layer path)
    var status  : PoolNFTStatus;
    generated_at : Common.Timestamp;
  };

  // Public view (no var fields)
  public type PoolNFTPublic = {
    id          : Nat;
    token_id    : Text;
    rarity      : PoolNFTRarity;
    layer_combo : [Text];
    image_key   : Text;
    status      : PoolNFTStatus;
    generated_at : Common.Timestamp;
  };

  // Pool dashboard summary
  public type PoolDashboard = {
    total          : Nat;
    ready          : Nat;
    airdropped     : Nat;
    listed_on_shop : Nat;
    assigned_to_qr : Nat;
  };

  // Admin assign action
  public type AssignAction = {
    #Airdrop     : { to : Principal };
    #ListOnShop  : { product_id : Nat };
    #AssignToQR  : { claim_token : Text };
  };
};
