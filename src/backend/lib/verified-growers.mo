import Array "mo:core/Array";
import Iter "mo:core/Iter";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Result "mo:core/Result";
import Char "mo:core/Char";
import HubTypes "../types/verified-growers";

module {
  public type Store = Map.Map<Text, HubTypes.VerifiedGrower>;

  let MAX_NAME = 120;
  let MAX_OWNERS = 120;
  let MAX_TAGLINE = 280;
  let MAX_DESC = 600;
  let MAX_STORY = 2_500;
  let MAX_URL = 512;
  let MAX_CATEGORY = 48;
  let MAX_STAT_LABEL = 48;
  let MAX_STAT_VALUE = 48;
  let MAX_IMAGE_KEY = 256;
  let MAX_MONTH_LABEL = 64;
  let MAX_CATEGORIES = 6;
  let MAX_STATS = 4;

  func trimLen(t : Text, max : Nat) : Bool {
    t.size() > 0 and t.size() <= max
  };

  func isSlugChar(c : Char) : Bool {
    let n = Char.toNat32(c);
    (n >= 97 and n <= 122) or (n >= 48 and n <= 57) or c == '-'
  };

  public func isValidSlug(id : Text) : Bool {
    if (id.size() == 0 or id.size() > 64) return false;
    for (c in id.chars()) {
      if (not isSlugChar(c)) return false;
    };
    true
  };

  public func isHttpsUrl(url : Text) : Bool {
    let prefix = "https://";
    if (url.size() < prefix.size()) return false;
    var urlIter = url.chars();
    for (pc in prefix.chars()) {
      switch (urlIter.next()) {
        case null return false;
        case (?c) { if (c != pc) return false };
      };
    };
    true
  };

  func validateStat(s : HubTypes.VerifiedGrowerStat) : Bool {
    trimLen(s.statLabel, MAX_STAT_LABEL) and trimLen(s.value, MAX_STAT_VALUE)
  };

  public func validateUpsert(input : HubTypes.VerifiedGrowerUpsert) : Result.Result<(), Text> {
    if (not isValidSlug(input.id)) {
      return #err("Invalid id: use lowercase letters, numbers, and hyphens only");
    };
    if (not trimLen(input.name, MAX_NAME)) {
      return #err("Name required (max 120 chars)");
    };
    if (not trimLen(input.owners, MAX_OWNERS)) {
      return #err("Owners required (max 120 chars)");
    };
    if (not trimLen(input.tagline, MAX_TAGLINE)) {
      return #err("Tagline required (max 280 chars)");
    };
    if (not trimLen(input.description, MAX_DESC)) {
      return #err("Description required (max 600 chars)");
    };
    if (not trimLen(input.story, MAX_STORY)) {
      return #err("Story required (max 2500 chars)");
    };
    if (not isHttpsUrl(input.url)) {
      return #err("URL must start with https://");
    };
    if (input.url.size() > MAX_URL) {
      return #err("URL too long");
    };
    if (input.categories.size() == 0 or input.categories.size() > MAX_CATEGORIES) {
      return #err("Provide 1–6 categories");
    };
    for (c in input.categories.vals()) {
      if (not trimLen(c, MAX_CATEGORY)) {
        return #err("Each category max 48 chars");
      };
    };
    if (input.stats.size() == 0 or input.stats.size() > MAX_STATS) {
      return #err("Provide 1–4 stats");
    };
    for (s in input.stats.vals()) {
      if (not validateStat(s)) {
        return #err("Each stat needs label and value (max 48 chars)");
      };
    };
    if (input.imageKey.size() > MAX_IMAGE_KEY) {
      return #err("Image key too long");
    };
    switch (input.growerOfTheMonth) {
      case null {};
      case (?m) {
        if (not trimLen(m, MAX_MONTH_LABEL)) {
          return #err("Grower of the month label max 64 chars");
        };
      };
    };
    #ok(())
  };

  public func listSorted(store : Store) : [HubTypes.VerifiedGrower] {
    let rows = Iter.toArray(store.entries());
    let sorted = Array.sort<(Text, HubTypes.VerifiedGrower)>(
      rows,
      func((_, a), (_, b)) {
        if (a.sortOrder != b.sortOrder) {
          if (a.sortOrder < b.sortOrder) #less else #greater
        } else {
          Text.compare(a.name, b.name)
        }
      },
    );
    Array.map<(Text, HubTypes.VerifiedGrower), HubTypes.VerifiedGrower>(
      sorted,
      func((_, g)) { g },
    )
  };

  public func upsert(
    store : Store,
    input : HubTypes.VerifiedGrowerUpsert,
    now : Int,
  ) : HubTypes.VerifiedGrower {
    let existingCreated = switch (store.get(input.id)) {
      case (?g) g.createdAt;
      case null now;
    };
    let record : HubTypes.VerifiedGrower = {
      id = input.id;
      name = input.name;
      owners = input.owners;
      tagline = input.tagline;
      description = input.description;
      story = input.story;
      url = input.url;
      categories = input.categories;
      stats = input.stats;
      imageKey = input.imageKey;
      growerOfTheMonth = input.growerOfTheMonth;
      establishedYear = input.establishedYear;
      sortOrder = input.sortOrder;
      createdAt = existingCreated;
      updatedAt = now;
    };
    store.add(input.id, record);
    record
  };

  public func clearGrowerOfTheMonthExcept(store : Store, keepId : Text, now : Int) {
    for ((id, g) in store.entries()) {
      if (id != keepId and g.growerOfTheMonth != null) {
        store.add(id, {
          g with
          growerOfTheMonth = null;
          updatedAt = now;
        });
      };
    };
  };

  public func setGrowerOfTheMonth(
    store : Store,
    id : Text,
    monthLabel : Text,
    now : Int,
  ) : Result.Result<(), Text> {
    if (not trimLen(monthLabel, MAX_MONTH_LABEL)) {
      return #err("Month label required (max 64 chars)");
    };
    switch (store.get(id)) {
      case null #err("Grower not found");
      case (?g) {
        clearGrowerOfTheMonthExcept(store, id, now);
        store.add(id, {
          g with
          growerOfTheMonth = ?monthLabel;
          updatedAt = now;
        });
        #ok(())
      };
    }
  };

  public func seedDefaultsIfEmpty(store : Store, now : Int) : Bool {
    if (store.size() > 0) return false;
    ignore upsert(
      store,
      {
        id = "plant-some-kindness";
        name = "Plant Some Kindness";
        owners = "Jason & Rachel Duhamell";
        tagline = "Spreading love of growing through sustainability and education — one seed at a time.";
        description = "Husband-and-wife regenerative operation scaling from farmers markets to 475 pepper plants, 150+ varieties, and a cottage-certified hot sauce line.";
        story = "Plant Some Kindness began in 2022 at local farmers markets with air plants, succulents, and pepper starts. Jason grows Carolina Reaper, Habanero, and Sugar Rush Peach while Rachel's pollinator garden supports beneficial insects. By 2026 they run two grow sites with 475 plants, a 12-sauce line, rubs, and house-smoked salts — a closed seed-to-sauce loop shipping nationwide.";
        url = "https://plantsomekindness.com/";
        categories = ["Hot Sauce", "Rubs & Seasoning", "Seeds", "Smoked Salts"];
        stats = [
          { statLabel = "Pepper plants"; value = "475" },
          { statLabel = "Varieties"; value = "150+" },
          { statLabel = "Signature sauces"; value = "12" },
          { statLabel = "Reach"; value = "50 states · 5 countries" },
        ];
        imageKey = "verified-growers/plant-some-kindness.jpg";
        growerOfTheMonth = ?"August 2026";
        establishedYear = ?2022;
        sortOrder = 0;
      },
      now,
    );
    true
  };
};
