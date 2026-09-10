import "dotenv/config";
import { loadMnemonicFromEnv, loadWorkerIdentity } from "./identity.js";
import { createHubActor, loadSecrets } from "./clients/hub.js";
import { createBackendActor } from "./clients/hub.js";
import { createLlmRouter, taskFamilyOf, LLM_SECRET_NAMES } from "./clients/llm.js";
import {
  dispatchJob,
  sendApprovedNewsletters,
  sendPendingConfirmations,
} from "./agents/index.js";

const POLL_SEC = Number(process.env.POLL_INTERVAL_SEC ?? 60);
const ONCE = process.argv.includes("--once");

async function tick(identity) {
  const hub = await createHubActor(identity);
  const backend = await createBackendActor(identity);
  const secrets = await loadSecrets(hub, [
    "resend_api_key",
    "resend_from_email",
    "newsletter_reply_to",
    "admin_alert_email",
    ...LLM_SECRET_NAMES,
  ]);
  const llmRouter = createLlmRouter(secrets);
  const agents = await hub.listAgents();
  const agentById = Object.fromEntries(agents.map((a) => [String(a.id), a]));

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

  await sendApprovedNewsletters({ hub, secrets });
  await sendPendingConfirmations({ hub, secrets });
}

async function main() {
  const identity = await loadWorkerIdentity(loadMnemonicFromEnv());
  console.log(`[worker] principal ${identity.getPrincipal().toText()}`);
  console.log(`[worker] network ${process.env.DFX_NETWORK ?? "ic"}`);
  console.log(`[worker] hub ${process.env.AGENT_HUB_CANISTER_ID ?? "(unset)"}`);

  if (ONCE) {
    await tick(identity);
    return;
  }

  for (;;) {
    try {
      await tick(identity);
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
