/**
 * ET window scheduler — fires Captain standalone bundle without waiting for hub jobs.
 */

import { kindKey } from "../idl/agent-hub.js";
import { taskFamilyOf } from "../clients/llm.js";
import { etScheduleTriggerDue } from "./captain-daily.js";
import { attemptCaptainStandaloneDailyPost } from "./captain-standalone-daily.js";

/**
 * @param {object} ctx — hub, llmRouter, secrets, captainIdentity, agents
 */
export async function runCaptainEtScheduler(ctx) {
  const label = etScheduleTriggerDue();
  if (!label) return { skipped: true, reason: "no_et_window" };

  const { agents, llmRouter, hub, secrets, captainIdentity } = ctx;
  const crumAgent = (agents ?? []).find(
    (a) => kindKey(a.kind) === "ambassador_crumbeatr",
  );
  if (!crumAgent) {
    console.warn("[captain-et] no ambassador_crumbeatr agent in hub");
    return { skipped: true, reason: "no_crumbeatr_agent" };
  }
  if (crumAgent.status && Object.keys(crumAgent.status)[0] === "paused") {
    return { skipped: true, reason: "crumbeatr_agent_paused" };
  }

  const llm = llmRouter?.for(taskFamilyOf("ambassador_crumbeatr"));
  const jobCtx = {
    hub,
    secrets,
    captainIdentity,
    llm,
    agentId: crumAgent.id,
    job: { agentId: crumAgent.id },
  };

  console.log(`[captain-et] firing standalone slot=${label}`);
  const result = await attemptCaptainStandaloneDailyPost(jobCtx, {
    slotLabel: label,
    etTriggerLabel: label,
    contextPrefix: `ET schedule trigger (${label}). `,
    reportKind: "ambassador_crumbeatr",
  });

  if (result.ok) {
    console.log(`[captain-et] success ${result.summary}`);
    return { ok: true, ...result };
  }
  console.warn(`[captain-et] ${result.reason ?? "failed"}`, result.error ?? "");
  return result;
}
