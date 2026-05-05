import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Runtime "mo:core/Runtime";
import Common "../types/common";
import PlantTypes "../types/plants";
import PlantsLib "../lib/plants";

// Phase 3.0: legacy plant-NFT mint flow stubbed.
//
// Until Phase 3, this mixin minted per-plant NFTs in three different formats
// (ICRC-37 misnamed, EXT, Hedera-mirror-node via HTTPS outcall). Phase 3
// replaces that architecture: plant lifecycle data becomes provenance metadata
// on the 8888-NFT ICRC-7 collection (see PROJECT_CONTEXT.md "Provenance
// metadata"). The four deprecated methods remain as trap stubs to preserve
// the Candid surface during the transition; `generatePickupQRPayload` stays
// functional because the active admin flow uses it.
//
// The legacy NFTMintingTab in src/frontend/src/pages/Admin.tsx (lines
// 2323-2400) calls these stubs and will trap with a deprecation message when
// invoked. Phase 4 removes both the tab and these stubs, replacing them with
// an ICRC-7-aware admin flow that uses icrc7_transfer to assign pool tokens
// to plant owners. See PROJECT_CONTEXT.md "Pre-existing technical debt" item
// B7 for the full migration plan.

mixin (
  plants : Map.Map<Common.PlantId, PlantTypes.Plant>,
) {

  // ── Deprecated stubs (Phase 4 removal) ────────────────────────────────────

  public shared func mintICRC37(
    _plant_id : Common.PlantId,
    _image_key : ?Text,
    _attributes : [(Text, Text)],
  ) : async Text {
    Runtime.trap(
      "mintICRC37 is deprecated as of Phase 3.0. " #
      "Per-plant NFTs have been replaced by lifecycle provenance on the 8888-token ICRC-7 collection. " #
      "To bind a pool token to a plant owner in the new architecture, use icrc7_transfer (available from Phase 3.3) to move a pool token from the canister-owned inventory to the plant owner's principal. " #
      "The legacy NFTMintingTab admin UI will be removed in Phase 4."
    );
  };

  public shared func mintEXT(
    _plantId : Nat,
    _imageKey : Text,
    _attributes : [(Text, Text)],
  ) : async Text {
    Runtime.trap(
      "mintEXT is deprecated as of Phase 3.0. " #
      "The Entrepot Token eXtension format is no longer used; the project standardizes on ICRC-7 for the 8888-token NFT collection. " #
      "To bind a pool token to a plant owner, use icrc7_transfer (available from Phase 3.3) to move a pool token to the plant owner's principal. " #
      "The legacy NFTMintingTab admin UI will be removed in Phase 4."
    );
  };

  public shared func mintHederaNFT(
    _plant_id : Common.PlantId,
    _image_key : ?Text,
    _attributes : [(Text, Text)],
  ) : async Text {
    Runtime.trap(
      "mintHederaNFT is deprecated as of Phase 3.0. " #
      "The Hedera bridge has been removed in favor of single-chain ICP per the architecture decision in PROJECT_CONTEXT.md. " #
      "RWA provenance is now ICRC-7 metadata on the 8888-token collection, certified via the IC certified-data subsystem (Phase 3.6). " #
      "The HTTPS outcall to the Hedera mirror node was removed for security. " #
      "The legacy NFTMintingTab admin UI will be removed in Phase 4."
    );
  };

  public shared func airdropNFT(_token_id : Text, _recipient : Principal) : async () {
    Runtime.trap(
      "airdropNFT is deprecated as of Phase 3.0. " #
      "Airdrops in the new architecture are batch transfers from the canister-owned pool: use icrc7_transfer (available from Phase 3.3) to move a pool token from Account { owner = Principal.fromActor(Self); subaccount = null } to the recipient's principal. " #
      "Batch airdrop tooling for the 8888-token pool is planned for Phase 4. " #
      "The legacy NFTMintingTab admin UI will be removed in Phase 4."
    );
  };

  // ── Functional: plant pickup QR payload (kept; used by active admin UI) ───

  public query func generatePickupQRPayload(plant_id : Common.PlantId) : async Text {
    switch (PlantsLib.getPlant(plants, plant_id)) {
      case (?plant) {
        let stageStr = switch (plant.stage) {
          case (#Seed) "Seed";
          case (#Seedling) "Seedling";
          case (#Mature) "Mature";
        };
        let nftStr = switch (plant.nft_id) {
          case (?id) "\"" # id # "\"";
          case null "null";
        };
        "{\"type\":\"ic_spicy_pickup\",\"plant_id\":" # plant.id.toText() #
        ",\"variety\":\"" # plant.variety # "\"" #
        ",\"stage\":\"" # stageStr # "\"" #
        ",\"nft_id\":" # nftStr # "}";
      };
      case null { Runtime.trap("Plant not found: " # plant_id.toText()) };
    };
  };
};
