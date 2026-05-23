import Array "mo:core/Array";
import Blob "mo:core/Blob";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Text "mo:core/Text";

module {
  public type Key = Text;
  public type BatchId = Nat;
  public type ChunkId = Nat;

  public type HeaderField = (Text, Text);

  public type CreateAssetArguments = {
    key : Key;
    content_type : Text;
    max_age : ?Nat64;
    headers : ?[HeaderField];
    enable_aliasing : ?Bool;
    allow_raw_access : ?Bool;
  };

  public type SetAssetContentArguments = {
    key : Key;
    content_encoding : Text;
    chunk_ids : [ChunkId];
    last_chunk : ?Blob;
    sha256 : ?Blob;
  };

  public type BatchOperationKind = {
    #CreateAsset : CreateAssetArguments;
    #SetAssetContent : SetAssetContentArguments;
  };

  public type AssetCanister = actor {
    store : ({
      key : Key;
      content_type : Text;
      content_encoding : Text;
      content : Blob;
      sha256 : ?Blob;
    }) -> async ();
    create_batch : () -> async { batch_id : BatchId };
    create_chunk : ({ batch_id : BatchId; content : Blob }) -> async {
      chunk_id : ChunkId;
    };
    commit_batch : ({
      batch_id : BatchId;
      operations : [BatchOperationKind];
    }) -> async ();
  };

  let maxSingleStoreBytes : Nat = 1_900_000;
  let chunkBytes : Nat = 1_800_000;

  public func assetKey(path : Text) : Text {
    switch (path.chars().next()) {
      case (?'/') path;
      case _ "/" # path;
    };
  };

  public func storeToUploadsCanister(
    uploadsCanister : ?Principal,
    path : Text,
    data : [Nat8],
    mimeType : Text,
  ) : async () {
    switch (uploadsCanister) {
      case null {
        Runtime.trap(
          "Uploads canister not configured — admin must call setUploadsCanisterId",
        );
      };
      case (?principal) {
        let assets : AssetCanister = actor (Principal.toText(principal));
        let key = assetKey(path);
        let size = data.size();
        if (size == 0) {
          Runtime.trap("Cannot store empty file");
        };
        if (size <= maxSingleStoreBytes) {
          await assets.store({
            key = key;
            content_type = mimeType;
            content_encoding = "identity";
            content = Blob.fromArray(data);
            sha256 = null;
          });
        } else {
          await storeLarge(assets, key, data, mimeType);
        };
      };
    };
  };

  func storeLarge(
    assets : AssetCanister,
    key : Text,
    data : [Nat8],
    mimeType : Text,
  ) : async () {
    let batchRes = await assets.create_batch();
    let batchId = batchRes.batch_id;
    var chunkIds : [ChunkId] = [];
    var offset : Nat = 0;
    let total = data.size();
    while (offset < total) {
      let take = if (offset + chunkBytes > total) {
        total - offset;
      } else {
        chunkBytes;
      };
      let slice = Array.tabulate<Nat8>(take, func i = data[offset + i]);
      let chunkRes = await assets.create_chunk({
        batch_id = batchId;
        content = Blob.fromArray(slice);
      });
      chunkIds := Array.concat(chunkIds, [chunkRes.chunk_id]);
      offset += take;
    };
    await assets.commit_batch({
      batch_id = batchId;
      operations = [
        #CreateAsset({
          key = key;
          content_type = mimeType;
          max_age = null;
          headers = null;
          enable_aliasing = null;
          allow_raw_access = ?true;
        }),
        #SetAssetContent({
          key = key;
          content_encoding = "identity";
          chunk_ids = chunkIds;
          last_chunk = null;
          sha256 = null;
        }),
      ];
    });
  };
};
