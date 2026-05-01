// Migration: adds sort_order, zone_notes, zone_photo_keys to every Tray record.
// Old Tray did NOT have these three fields; the new Tray does.
// All other actor-level stable state is unchanged and passes through untouched.
import Map "mo:core/Map";
import PlantTypes "types/plants";
import Common "types/common";

module {

  // ── Old types (inline copy from .old/src/backend/types/plants.mo) ──────────

  type OldNFTStandard = {
    #ICRC37;
    #Hedera;
    #EXT;
  };

  type OldTray = {
    id : Common.TrayId;
    var name : Text;
    planting_date : Common.Timestamp;
    cell_count : Nat;
    var cells : [?Common.PlantId];
    nft_standard : OldNFTStandard;
    // NOTE: sort_order / zone_notes / zone_photo_keys did NOT exist in the old version
  };

  // ── Actor state shapes ───────────────────────────────────────────────────────

  type OldActor = {
    trays : Map.Map<Common.TrayId, OldTray>;
  };

  type NewActor = {
    trays : Map.Map<Common.TrayId, PlantTypes.Tray>;
  };

  // ── Migration function ───────────────────────────────────────────────────────

  public func run(old : OldActor) : NewActor {
    let newTrays = old.trays.map<Common.TrayId, OldTray, PlantTypes.Tray>(
      func(_id, t) {
        {
          id             = t.id;
          var name       = t.name;
          planting_date  = t.planting_date;
          cell_count     = t.cell_count;
          var cells      = t.cells;
          nft_standard   = t.nft_standard;
          var sort_order      = 0;
          var zone_notes      = "";
          var zone_photo_keys = [];
        }
      }
    );
    { trays = newTrays };
  };
};
