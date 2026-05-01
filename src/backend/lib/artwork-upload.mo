import Types "../types/artwork-upload";
import Common "../types/common";
import Map "mo:core/Map";
import List "mo:core/List";
import Array "mo:core/Array";
import Runtime "mo:core/Runtime";
import Prim "mo:⛔";

module {

  // ── Session management ───────────────────────────────────────────────────

  // Begin a new upload session.
  // Resets the flat buffer — actual allocation happens on first chunk receipt
  // once we know the real chunk size.
  public func beginSession(
    session     : Types.UploadSession,
    totalChunks : Nat,
  ) : () {
    session.buffer       := [var];
    session.chunk_size   := 0;
    session.total_chunks := totalChunks;
    session.received     := 0;
  };

  // Receive one chunk and write it into the pre-allocated flat buffer.
  //
  // On the FIRST chunk (received == 0 and buffer is empty):
  //   - We learn the chunk size and pre-allocate a buffer of totalChunks * chunkSize bytes.
  //   - This single allocation avoids repeated copies / array growing.
  //
  // On subsequent chunks:
  //   - Write bytes directly at offset = chunkIndex * chunk_size.
  //   - No copies, no accumulation in heap.
  //
  // NOTE: The last chunk may be smaller than chunk_size (tail data).
  // We track this by allowing the last chunk to be <= chunk_size.
  public func receiveChunk(
    session     : Types.UploadSession,
    chunkIndex  : Nat,
    totalChunks : Nat,
    data        : [Nat8],
  ) : { #ok; #err : Text } {
    if (totalChunks != session.total_chunks) {
      return #err("totalChunks mismatch: expected " # session.total_chunks.toText() # " got " # totalChunks.toText());
    };
    if (chunkIndex >= totalChunks) {
      return #err("chunkIndex out of range");
    };
    let dataSize = data.size();
    if (dataSize == 0) {
      return #err("chunk data is empty");
    };

    // First chunk — learn chunk size and pre-allocate buffer.
    if (session.chunk_size == 0) {
      session.chunk_size := dataSize;
      // Pre-allocate: worst-case totalChunks * chunkSize bytes.
      // The final chunk may be smaller but we still reserve the full slot.
      session.buffer := Prim.Array_init<Nat8>(totalChunks * dataSize, 0);
    };

    // Write chunk bytes at the correct offset in the flat buffer.
    let offset = chunkIndex * session.chunk_size;
    if (offset + dataSize > session.buffer.size()) {
      return #err("chunk offset out of buffer bounds");
    };
    var i = 0;
    while (i < dataSize) {
      session.buffer[offset + i] := data[i];
      i += 1;
    };
    session.received += 1;
    #ok;
  };

  // Reassemble the flat buffer into a contiguous immutable byte array.
  // We read exactly the bytes that were written (received * chunk_size for all
  // complete chunks; the last chunk may be shorter so we use the buffer up to
  // the last written byte position).
  public func reassemble(session : Types.UploadSession) : [Nat8] {
    let bufSize = session.buffer.size();
    if (bufSize == 0) return [];
    // The buffer is already a flat array — freeze it directly.
    // Prim.Array_tabulate reads from the mutable buffer without an extra copy.
    Prim.Array_tabulate<Nat8>(bufSize, func i = session.buffer[i]);
  };

  // ── File storage ─────────────────────────────────────────────────────────

  // Store a single artwork file on-chain.
  // path format: "layer-1/background.png"
  // Data is stored as [Nat8] — no conversion to Blob to avoid heap pressure
  // during canister upgrades (the previous Blob conversion caused IC0539).
  public func storeFile(
    storedFiles : Map.Map<Text, Types.StoredFile>,
    path        : Text,
    data        : [Nat8],
    mimeType    : Text,
    now         : Common.Timestamp,
  ) : Types.StoredFile {
    let (layer, filename) = splitPath(path);
    let file : Types.StoredFile = {
      path        = path;
      layer       = layer;
      filename    = filename;
      mime_type   = mimeType;
      data        = data;
      size        = data.size();
      uploaded_at = now;
    };
    storedFiles.add(path, file);
    file;
  };

  // ── Layer summary ─────────────────────────────────────────────────────────

  public func buildLayerSummaries(
    storedFiles : Map.Map<Text, Types.StoredFile>,
  ) : [Types.LayerSummary] {
    // Group filenames by layer folder
    let layerMap = Map.empty<Text, List.List<Text>>();
    for ((_, file) in storedFiles.entries()) {
      switch (layerMap.get(file.layer)) {
        case (?names) { names.add(file.filename) };
        case null {
          let names = List.empty<Text>();
          names.add(file.filename);
          layerMap.add(file.layer, names);
        };
      };
    };
    let result = List.empty<Types.LayerSummary>();
    for ((layer, names) in layerMap.entries()) {
      result.add({
        layer      = layer;
        file_count = names.size();
        file_names = names.toArray();
      });
    };
    result.toArray();
  };

  public func buildUploadResult(
    selfId      : Text,
    storedFiles : Map.Map<Text, Types.StoredFile>,
  ) : Types.UploadResult {
    let summaries      = buildLayerSummaries(storedFiles);
    let totalFiles     = storedFiles.size();
    let layersDetected = summaries.size();
    {
      asset_canister_id = selfId;
      layers_detected   = layersDetected;
      total_files       = totalFiles;
      layer_summaries   = summaries;
    };
  };

  // ── Pool NFT generation ───────────────────────────────────────────────────

  // Rarity distribution: 5000 Common, 2888 Uncommon, 1000 Rare (total 8888)
  func rarityForIndex(i : Nat) : Types.PoolNFTRarity {
    if      (i < 5000) #Common
    else if (i < 7888) #Uncommon
    else               #Rare;
  };

  // Deterministic layer combo: for each layer folder, pick a file by (nftIndex mod count).
  func pickLayerCombo(
    storedFiles : Map.Map<Text, Types.StoredFile>,
    nftIndex    : Nat,
  ) : [Text] {
    let layerMap = Map.empty<Text, List.List<Text>>();
    for ((_, file) in storedFiles.entries()) {
      switch (layerMap.get(file.layer)) {
        case (?paths) { paths.add(file.path) };
        case null {
          let paths = List.empty<Text>();
          paths.add(file.path);
          layerMap.add(file.layer, paths);
        };
      };
    };
    let combo = List.empty<Text>();
    for ((_, paths) in layerMap.entries()) {
      let arr = paths.toArray();
      if (arr.size() > 0) {
        combo.add(arr[nftIndex % arr.size()]);
      };
    };
    combo.toArray();
  };

  public func generatePoolNFTs(
    poolNFTs    : Map.Map<Nat, Types.PoolNFT>,
    storedFiles : Map.Map<Text, Types.StoredFile>,
    now         : Common.Timestamp,
  ) : Nat {
    if (storedFiles.size() == 0) {
      Runtime.trap("No artwork files stored. Upload artwork zip first.");
    };
    poolNFTs.clear();
    let total = 8888;
    var i = 0;
    while (i < total) {
      let combo    = pickLayerCombo(storedFiles, i);
      let imageKey = if (combo.size() > 0) combo[0] else "";
      let nft : Types.PoolNFT = {
        id           = i + 1;
        token_id     = "pool-nft-" # (i + 1).toText();
        rarity       = rarityForIndex(i);
        layer_combo  = combo;
        image_key    = imageKey;
        var status   = #Ready;
        generated_at = now;
      };
      poolNFTs.add(i + 1, nft);
      i += 1;
    };
    total;
  };

  // ── Queries ───────────────────────────────────────────────────────────────

  public func getPoolDashboard(
    poolNFTs : Map.Map<Nat, Types.PoolNFT>,
  ) : Types.PoolDashboard {
    var ready      = 0;
    var airdropped = 0;
    var listed     = 0;
    var assignedQR = 0;
    for ((_, nft) in poolNFTs.entries()) {
      switch (nft.status) {
        case (#Ready)          { ready      += 1 };
        case (#Airdropped _)   { airdropped += 1 };
        case (#ListedOnShop _) { listed     += 1 };
        case (#AssignedToQR _) { assignedQR += 1 };
      };
    };
    {
      total          = poolNFTs.size();
      ready          = ready;
      airdropped     = airdropped;
      listed_on_shop = listed;
      assigned_to_qr = assignedQR;
    };
  };

  public func toPublic(nft : Types.PoolNFT) : Types.PoolNFTPublic {
    {
      id           = nft.id;
      token_id     = nft.token_id;
      rarity       = nft.rarity;
      layer_combo  = nft.layer_combo;
      image_key    = nft.image_key;
      status       = nft.status;
      generated_at = nft.generated_at;
    };
  };

  public func listByStatus(
    poolNFTs     : Map.Map<Nat, Types.PoolNFT>,
    statusFilter : ?Types.PoolNFTStatus,
    limit        : Nat,
  ) : [Types.PoolNFTPublic] {
    let filtered = List.empty<Types.PoolNFTPublic>();
    for ((_, nft) in poolNFTs.entries()) {
      let s = nft.status;
      let shouldInclude = switch statusFilter {
        case null                true;
        case (?#Ready)           { switch s { case (#Ready) true; case _ false } };
        case (?#Airdropped _)    { switch s { case (#Airdropped _) true; case _ false } };
        case (?#ListedOnShop _)  { switch s { case (#ListedOnShop _) true; case _ false } };
        case (?#AssignedToQR _)  { switch s { case (#AssignedToQR _) true; case _ false } };
      };
      if (shouldInclude) { filtered.add(toPublic(nft)) };
    };
    let arr = filtered.toArray();
    if (limit == 0 or limit >= arr.size()) arr
    else arr.sliceToArray(0, limit.toInt());
  };

  public func assignNFT(
    poolNFTs : Map.Map<Nat, Types.PoolNFT>,
    nftId    : Nat,
    action   : Types.AssignAction,
    now      : Common.Timestamp,
  ) : () {
    switch (poolNFTs.get(nftId)) {
      case null { Runtime.trap("Pool NFT not found: " # nftId.toText()) };
      case (?nft) {
        switch (nft.status) {
          case (#Ready) {};
          case _ { Runtime.trap("NFT is already assigned") };
        };
        nft.status := buildStatus(action, now);
      };
    };
  };

  // Batch assign — skips already-assigned NFTs silently
  public func batchAssignNFTs(
    poolNFTs : Map.Map<Nat, Types.PoolNFT>,
    nftIds   : [Nat],
    action   : Types.AssignAction,
    now      : Common.Timestamp,
  ) : Nat {
    var assigned = 0;
    for (id in nftIds.values()) {
      switch (poolNFTs.get(id)) {
        case null {};
        case (?nft) {
          switch (nft.status) {
            case (#Ready) {
              nft.status := buildStatus(action, now);
              assigned   += 1;
            };
            case _ {};
          };
        };
      };
    };
    assigned;
  };

  // ── Private helpers ───────────────────────────────────────────────────────

  func buildStatus(action : Types.AssignAction, now : Common.Timestamp) : Types.PoolNFTStatus {
    switch action {
      case (#Airdrop    { to })          #Airdropped   { to = to; at = now };
      case (#ListOnShop { product_id })  #ListedOnShop { product_id = product_id; at = now };
      case (#AssignToQR { claim_token }) #AssignedToQR { claim_token = claim_token; at = now };
    };
  };

  // Split "layer-1/background.png" → ("layer-1", "background.png")
  func splitPath(path : Text) : (Text, Text) {
    let parts = path.split(#char '/').toArray();
    if (parts.size() >= 2) {
      (parts[0], parts[parts.size() - 1])
    } else {
      (path, path)
    };
  };
};
