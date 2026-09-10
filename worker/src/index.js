import "dotenv/config";
import {
  loadCaptainIdentity,
  loadMnemonicFromEnv,
  loadWorkerIdentity,
} from "./identity.js";
import { createHubActor, loadSecrets } from "./clients/hub.js";
import { createBackendActor } from "./clients/hub.js";
import { createLlmRouter, taskFamilyOf, LLM_SECRET_NAMES } from "./clients/llm.js";
import {
  dispatchJob,
  publishApprovedAmbassadorDrafts,
  sendApprovedNewsletters,
  sendPendingConfirmations,
  sweepAmbassadorFunds,
} from "./agents/index.js";
import { buildWalletBook, formatWalletBook } from "./lib/wallets.js";

const POLL_SEC = Number(process.env.POLL_INTERVAL_SEC ?? 60);
const ONCE = process.argv.includes("--once");

async function tick(identity, captainIdentity) {
  const hub = await createHubActor(identity);
  const backend = await createBackendActor(identity);
  const secrets = await loadSecrets(hub, [
    "resend_api_key",
    "resend_from_email",
    "newsletter_reply_to",
    "admin_alert_email",
    "ambassador_sweep_principal",
    "crumbeatr_canister_id",
    "swop_backend_canister_id",
    "bonsai_registry_canister_id",
    "bonsai_orbit_canister_id",
    "bonsai_bazaar_canister_id",
    "canopy_wallet_principal",
    ...LLM_SECRET_NAMES,
  ]);
  const llmRouter = createLlmRouter(secrets);
  const agents = await hub.listAgents();
  const agentById = Object.fromEntries(agents.map((a) => [String(a.id), a]));
  const walletBook = buildWalletBook({
    captainPrincipal: captainIdentity.getPrincipal().toText(),
    secrets,
  });

  const jobs = await hub.claimJobs(5n);
  for (const job of jobs) {
    const agent = agentById[String(job.agentId)];
    const kindKey = Object.keys(job.kind)[0];
    const ctx = {
      hub,
      backend,
      llm: llmRouter.for(taskFamilyOf(kindKey)),
      llmCompliance: llmRouter.for("compliance"),
      secrets,
      job,
      agent,
      captainIdentity,
      walletBook,
    };
    try {
      console.log(`[worker] job ${job.id} kind=${kindKey} model=${ctx.llm?.model ?? "none"}`);
      await dispatchJob(ctx, job);
      await hub.reportJobComplete(job.id, true, []);
    } catch (err) {
      console.error(`[worker] job ${job.id} failed:`, err);
      await hub.reportJobComplete(job.id, false, [
        err instanceof Error ? err.message : String(err),
      ]);
    }
  }

  try {
    await sendApprovedNewsletters({ hub, secrets });
  } catch (err) {
    console.error("[worker] newsletter send error:", err.message ?? err);
  }
  try {
    await sendPendingConfirmations({ hub, secrets });
  } catch (err) {
    console.error("[worker] confirmation send error:", err.message ?? err);
  }
  try {
    await publishApprovedAmbassadorDrafts({ hub, secrets, captainIdentity });
  } catch (err) {
    console.error("[worker] ambassador publish error:", err.message ?? err);
  }
  try {
    await sweepAmbassadorFunds({ secrets, captainIdentity });
  } catch (err) {
    console.error("[worker] ambassador sweep error:", err.message ?? err);
  }
}

async function main() {
  const mnemonic = loadMnemonicFromEnv();
  const identity = await loadWorkerIdentity(mnemonic);
  const captainIdentity = await loadCaptainIdentity(mnemonic);
  console.log(`[worker] principal ${identity.getPrincipal().toText()}`);
  console.log(`[worker] captain ${captainIdentity.getPrincipal().toText()}`);
  console.log(`[worker] network ${process.env.DFX_NETWORK ?? "ic"}`);
  console.log(`[worker] hub ${process.env.AGENT_HUB_CANISTER_ID ?? "(unset)"}`);
  console.log(
    formatWalletBook(
      buildWalletBook({
        workerPrincipal: identity.getPrincipal().toText(),
        captainPrincipal: captainIdentity.getPrincipal().toText(),
        secrets: {
          canopy_wallet_principal: process.env.CANOPY_WALLET_PRINCIPAL,
          ambassador_sweep_principal: process.env.AMBASSADOR_SWEEP_PRINCIPAL,
        },
      }),
    ),
  );

  if (ONCE) {
    await tick(identity, captainIdentity);
    return;
  }

  for (;;) {
    try {
      await tick(identity, captainIdentity);
    } catch (err) {
      console.error("[worker] tick error:", err);
    }
    await new Promise((r) => setTimeout(r, POLL_SEC * 1000));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
