/**
 * Read-only Dvinity calls. Paid spins and ticket buys need an ICRC deposit
 * into Dvinity before the game method, and that spend is not sent from here.
 *
 * Canister IDs are the ones baked into https://dvinity.eu (2026-10-09).
 */

import { Actor, HttpAgent } from "@dfinity/agent";
import { IDL } from "@dfinity/candid";

export const DVINITY = {
  site: "https://dvinity.eu",
  slots: "qhfek-wyaaa-aaaad-qlfxq-cai",
  scratch: "enjrz-zqaaa-aaaad-qjtpq-cai",
  yearly: "zo5wt-ziaaa-aaaad-qimua-cai",
  daily: "uls2e-uiaaa-aaaae-qf37q-cai",
};

const HOST = process.env.IC_HOST?.trim() || "https://icp-api.io";

const Account = IDL.Record({
  sub: IDL.Opt(IDL.Vec(IDL.Nat8)),
  owner: IDL.Principal,
});

const SlotId = IDL.Variant({
  Classic: IDL.Null,
  DvinityFortune: IDL.Null,
  DominicAndTheMotokos: IDL.Null,
  RuggyRichesMegaways: IDL.Null,
  WumboWays: IDL.Null,
});

const slotsIdl = ({ IDL: l }) =>
  l.Service({
    status: l.Func(
      [],
      [
        l.Record({
          maintenance_mode: l.Bool,
          icp_ledger: l.Principal,
          engine_canister: l.Opt(l.Principal),
          slot_pauses: l.Vec(SlotId),
          stakers_vault: Account,
          paused: l.Bool,
          housekeeping_timer_set: l.Bool,
          treasury: Account,
        }),
      ],
      ["query"],
    ),
    spin_available: l.Func([], [l.Bool], ["query"]),
    ruggy_riches_config: l.Func(
      [],
      [
        l.Record({
          target_rtp_bps: l.Nat16,
          next_jackpot_contribution_bps: l.Nat16,
          name: l.Text,
          slot: SlotId,
          max_reel_height: l.Nat8,
          max_bet_credits: l.Nat64,
          max_win_multiplier_cents: l.Nat,
          jackpot_hit_one_in: l.Nat64,
          max_result_steps_per_call: l.Nat8,
          precision_cents_per_credit: l.Nat8,
          jackpot_pot_cents: l.Nat,
          min_reel_height: l.Nat8,
          min_bet_credits: l.Nat64,
          reels: l.Nat8,
          next_jackpot_reserve_cents: l.Nat,
          jackpot_contribution_bps: l.Nat16,
        }),
      ],
      ["query"],
    ),
  });

const scratchIdl = ({ IDL: l }) =>
  l.Service({
    status: l.Func(
      [],
      [
        l.Record({
          paused: l.Bool,
          plays: l.Nat64,
          wins: l.Nat64,
          pending_treasury_e8s: l.Nat,
          pending_stakers_e8s: l.Nat,
          pending_backing_e8s: l.Nat,
          pending_owner_entries: l.Nat64,
          last_play_ns: l.Nat64,
        }),
      ],
      ["query"],
    ),
  });

const yearlyIdl = ({ IDL: l }) =>
  l.Service({
    yearly_status: l.Func(
      [],
      [
        l.Record({
          purchases_count: l.Nat32,
          ends_ns: l.Nat64,
          pot_e8s: l.Nat,
          total_tickets: l.Nat,
          drawn: l.Bool,
        }),
      ],
      ["query"],
    ),
  });

const LotteryKind = IDL.Variant({ Daily24h: IDL.Null, Weekly: IDL.Null });
const LotteryStatus = IDL.Variant({
  Pending: IDL.Null,
  Active: IDL.Null,
  Paused: IDL.Null,
  Drawn: IDL.Null,
  PaidOut: IDL.Null,
  Cancelled: IDL.Null,
});
const LotteryLite = IDL.Record({
  id: IDL.Nat64,
  name: IDL.Text,
  kind: LotteryKind,
  status: LotteryStatus,
  ticket_price: IDL.Nat,
  total_tickets: IDL.Nat,
  prize_topup_from_pot: IDL.Nat,
  weekly_pot_amount: IDL.Nat,
  free_ticket_burn_total: IDL.Nat,
  ends_ns: IDL.Opt(IDL.Nat64),
});

const dailyIdl = ({ IDL: l }) =>
  l.Service({
    list_lite: l.Func(
      [l.Opt(l.Nat64), l.Nat16, l.Opt(LotteryKind), l.Opt(LotteryStatus)],
      [l.Record({ items: l.Vec(LotteryLite), next_after_id: l.Opt(l.Nat64) })],
      ["query"],
    ),
  });

let agentPromise;

async function agent() {
  if (!agentPromise) {
    agentPromise = HttpAgent.create({ host: HOST });
  }
  return agentPromise;
}

async function actor(factory, canisterId) {
  return Actor.createActor(factory, { agent: await agent(), canisterId });
}

function variantName(value) {
  if (!value || typeof value !== "object") return "";
  return Object.keys(value)[0] || "";
}

function e8sToIcp(value) {
  const raw = BigInt(value);
  const whole = raw / 100_000_000n;
  const frac = (raw % 100_000_000n).toString().padStart(8, "0").replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : whole.toString();
}

export async function fetchDvinitySnapshot() {
  const [slots, scratch, yearly, daily] = await Promise.all([
    actor(slotsIdl, DVINITY.slots),
    actor(scratchIdl, DVINITY.scratch),
    actor(yearlyIdl, DVINITY.yearly),
    actor(dailyIdl, DVINITY.daily),
  ]);
  const [status, spinAvailable, ruggy, scratchStatus, yearlyStatus, lite] =
    await Promise.all([
      slots.status(),
      slots.spin_available(),
      slots.ruggy_riches_config(),
      scratch.status(),
      yearly.yearly_status(),
      daily.list_lite([], 6, [], [{ Active: null }]),
    ]);
  const lotteries = (lite.items ?? []).map((row) => ({
    id: row.id.toString(),
    name: row.name,
    kind: variantName(row.kind),
    priceIcp: e8sToIcp(row.ticket_price),
  }));
  const pausedSlots = (status.slot_pauses ?? []).map(variantName).filter(Boolean);
  const summary = [
    status.paused ? "Slots paused" : "Slots open",
    spinAvailable ? "spin available" : "spin closed",
    pausedSlots.length ? `paused: ${pausedSlots.join(", ")}` : null,
    `Ruggy ${ruggy.min_bet_credits}-${ruggy.max_bet_credits} credits`,
    scratchStatus.paused
      ? "scratch paused"
      : `scratch ${scratchStatus.plays} plays`,
    `yearly pot ${e8sToIcp(yearlyStatus.pot_e8s)} ICP`,
    lotteries.length
      ? `active: ${lotteries.map((row) => `${row.name} ${row.priceIcp} ICP`).join("; ")}`
      : "no active lottery in the first page",
  ]
    .filter(Boolean)
    .join(". ");
  return {
    canisters: DVINITY,
    slotsPaused: Boolean(status.paused),
    maintenance: Boolean(status.maintenance_mode),
    spinAvailable: Boolean(spinAvailable),
    pausedSlots,
    ruggy: {
      name: ruggy.name,
      minBetCredits: ruggy.min_bet_credits.toString(),
      maxBetCredits: ruggy.max_bet_credits.toString(),
    },
    scratch: {
      paused: Boolean(scratchStatus.paused),
      plays: scratchStatus.plays.toString(),
      wins: scratchStatus.wins.toString(),
    },
    yearly: {
      drawn: Boolean(yearlyStatus.drawn),
      potIcp: e8sToIcp(yearlyStatus.pot_e8s),
      tickets: yearlyStatus.total_tickets.toString(),
    },
    lotteries,
    summary,
    spends: false,
  };
}
