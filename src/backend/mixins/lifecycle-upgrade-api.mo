import Map "mo:core/Map";
import List "mo:core/List";
import Time "mo:core/Time";
import Runtime "mo:core/Runtime";
import AccessControl "mo:caffeineai-authorization/access-control";
import Common "../types/common";
import ClaimTypes "../types/claim";
import PlantTypes "../types/plants";
import LifecycleLib "../lib/lifecycle-upgrade";

mixin (
  accessControlState : AccessControl.AccessControlState,
  plants : Map.Map<Common.PlantId, PlantTypes.Plant>,
  stageHistory : Map.Map<Common.PlantId, List.List<PlantTypes.StageHistory>>,
  rwaTokens : Map.Map<Text, PlantTypes.RWATokenMetadata>,
  upgradeEvents : Map.Map<Common.PlantId, List.List<ClaimTypes.LifecycleUpgradeEvent>>,
  artworkLayers : Map.Map<Common.ArtworkLayerId, PlantTypes.ArtworkLayer>,
) {
  // Admin: trigger a lifecycle NFT upgrade for a plant (burn old NFT, mint new one)
  public shared ({ caller }) func triggerLifecycleUpgrade(
    plant_id : Common.PlantId,
    new_stage : Text,
  ) : async Text {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Admin only");
    };
    LifecycleLib.triggerLifecycleUpgrade(
      plants, stageHistory, rwaTokens, upgradeEvents, artworkLayers,
      plant_id, new_stage, Time.now(),
    );
  };

  // Public query: fetch the full NFT upgrade history for a plant
  public query func getUpgradeHistory(
    plant_id : Common.PlantId,
  ) : async [ClaimTypes.LifecycleUpgradeEvent] {
    LifecycleLib.getUpgradeHistory(upgradeEvents, plant_id);
  };
};
