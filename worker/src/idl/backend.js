/** Minimal backend IDL for agent worker reads */
export function backendIdlFactory({ IDL }) {
  const RecipePublic = IDL.Record({
    id: IDL.Nat,
    slug: IDL.Text,
    title: IDL.Text,
    description: IDL.Text,
    ingredients: IDL.Vec(
      IDL.Record({
        amount: IDL.Text,
        is_optional: IDL.Bool,
        name: IDL.Text,
        notes: IDL.Opt(IDL.Text),
      }),
    ),
    steps: IDL.Vec(
      IDL.Record({
        duration: IDL.Opt(IDL.Text),
        image_key: IDL.Opt(IDL.Text),
        instruction: IDL.Text,
        step_number: IDL.Nat,
        tips: IDL.Opt(IDL.Text),
      }),
    ),
  });

  const TropicalStormLite = IDL.Record({
    name: IDL.Text,
    classification: IDL.Text,
    maxWindKt: IDL.Nat,
    movementText: IDL.Text,
  });

  const TropicalSummaryLite = IDL.Record({
    fetchedAt: IDL.Int,
    seasonActive: IDL.Bool,
    dataSource: IDL.Text,
    disclaimer: IDL.Text,
    storms: IDL.Vec(TropicalStormLite),
  });

  // Subset of ProductPublic — Candid decoding skips wire fields we don't declare.
  const Product = IDL.Record({
    id: IDL.Nat,
    name: IDL.Text,
    description: IDL.Text,
    price_cents: IDL.Nat,
    active: IDL.Bool,
    inventory_remaining: IDL.Opt(IDL.Nat),
  });

  const WeatherBrief = IDL.Record({
    generatedAt: IDL.Int,
    gridKey: IDL.Text,
    text: IDL.Text,
    outlookFetchedAt: IDL.Int,
    tropicalFetchedAt: IDL.Opt(IDL.Int),
  });

  // Subset records: Candid decoding skips extra wire fields, so we only
  // declare the fields the worker reads.
  const VerifiedGrowerStat = IDL.Record({
    statLabel: IDL.Text,
    value: IDL.Text,
  });

  const VerifiedGrower = IDL.Record({
    id: IDL.Text,
    name: IDL.Text,
    owners: IDL.Text,
    tagline: IDL.Text,
    story: IDL.Text,
    url: IDL.Text,
    imageKey: IDL.Text,
    growerOfTheMonth: IDL.Opt(IDL.Text),
    establishedYear: IDL.Opt(IDL.Nat),
    stats: IDL.Vec(VerifiedGrowerStat),
    sortOrder: IDL.Nat,
  });

  const DailyOutlook = IDL.Record({
    date: IDL.Text,
    tempHighF: IDL.Float64,
    tempLowF: IDL.Float64,
    precipInches: IDL.Float64,
    windMphMax: IDL.Float64,
    uvIndexMax: IDL.Float64,
    weatherCode: IDL.Nat,
  });

  const WeatherOutlookLite = IDL.Record({
    gridKey: IDL.Text,
    fetchedAt: IDL.Int,
    stale: IDL.Bool,
    daily: IDL.Vec(DailyOutlook),
  });

  const DailyFeatureStat = IDL.Record({
    day: IDL.Nat,
    feature: IDL.Text,
    action: IDL.Text,
    count: IDL.Nat,
    uniqueUsers: IDL.Nat,
  });

  const AdminOrderStatusFilter = IDL.Variant({
    all: IDL.Null,
    pending: IDL.Null,
    paid: IDL.Null,
    shipped: IDL.Null,
  });

  return IDL.Service({
    getFeaturedRecipes: IDL.Func([IDL.Nat], [IDL.Vec(RecipePublic)], ["query"]),
    listProducts: IDL.Func([], [IDL.Vec(Product)], ["query"]),
    getWeatherBrief: IDL.Func(
      [IDL.Opt(IDL.Float64), IDL.Opt(IDL.Float64)],
      [IDL.Opt(WeatherBrief)],
      ["query"],
    ),
    getTropicalSummary: IDL.Func([], [IDL.Opt(TropicalSummaryLite)], ["query"]),
    listVerifiedGrowers: IDL.Func([], [IDL.Vec(VerifiedGrower)], ["query"]),
    getNurseryWeatherDesk: IDL.Func([], [IDL.Opt(WeatherOutlookLite)], ["query"]),
    getUsageRollups: IDL.Func([IDL.Nat], [IDL.Vec(DailyFeatureStat)], ["query"]),
    listAllOrdersAdmin: IDL.Func(
      [AdminOrderStatusFilter],
      [IDL.Vec(IDL.Record({ id: IDL.Nat, status: IDL.Text, buyer: IDL.Text }))],
      ["query"],
    ),
    getNewOrderCount: IDL.Func([], [IDL.Nat], ["query"]),
    adminListClaimRequests: IDL.Func(
      [IDL.Opt(IDL.Variant({ pending: IDL.Null, approved: IDL.Null, rejected: IDL.Null }))],
      [IDL.Vec(IDL.Record({
        plantId: IDL.Nat,
        requester: IDL.Principal,
        status: IDL.Text,
        requestedAt: IDL.Int,
      }))],
      ["query"],
    ),
    getFleetCanisterHealth: IDL.Func(
      [],
      [
        IDL.Record({
          canisters: IDL.Vec(IDL.Record({
            canisterId: IDL.Text,
            label: IDL.Text,
            cycles: IDL.Nat,
            memorySize: IDL.Nat,
            burnPerDay: IDL.Nat,
          })),
          appBurnPerDay: IDL.Nat,
          appCumulativeBurned: IDL.Nat,
        }),
      ],
      [],
    ),
    getCycleBalance: IDL.Func([], [IDL.Nat], ["query"]),
    publishDailyAlmanac: IDL.Func(
      [IDL.Text, IDL.Text, IDL.Text, IDL.Opt(IDL.Text), IDL.Vec(IDL.Nat)],
      [],
      [],
    ),
    getDailyAlmanac: IDL.Func(
      [IDL.Opt(IDL.Text)],
      [IDL.Opt(IDL.Record({
        dateKey: IDL.Text,
        publishedAt: IDL.Int,
        title: IDL.Text,
        body: IDL.Text,
        recipeSlug: IDL.Opt(IDL.Text),
        varietyIds: IDL.Vec(IDL.Nat),
        retracted: IDL.Bool,
      }))],
      ["query"],
    ),
    listPosts: IDL.Func(
      [IDL.Nat, IDL.Nat],
      [IDL.Vec(IDL.Record({ id: IDL.Nat, content: IDL.Text, author: IDL.Text }))],
      ["query"],
    ),
    listAllPostsAdmin: IDL.Func(
      [IDL.Nat, IDL.Nat],
      [IDL.Vec(IDL.Record({ id: IDL.Nat, content: IDL.Text, author: IDL.Text }))],
      ["query"],
    ),
  });
}
