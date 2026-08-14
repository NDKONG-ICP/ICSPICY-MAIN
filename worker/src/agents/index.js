import { kindKey } from "../idl/agent-hub.js";
import { runNewsletterAgent, sendApprovedNewsletters } from "./newsletter.js";
import { runEmailCorrespondenceAgent, runSocialAgent } from "./social.js";
import {
  runAnalyticsDigest,
  runCommunityModerator,
  runComplianceReviewer,
  runFleetCyclesOps,
  runNimsOps,
  runOrdersClaimsOps,
  runWeatherConcierge,
  runWeatherSentinel,
} from "./ops.js";

export async function dispatchJob(ctx, job) {
  const key = kindKey(job.kind);

  switch (key) {
    case "newsletter":
      return runNewsletterAgent(ctx);
    case "email_correspondence":
      return runEmailCorrespondenceAgent(ctx);
    case "social_x":
    case "social_instagram":
    case "social_tiktok":
    case "social_facebook":
    case "social_youtube":
      return runSocialAgent(ctx, key);
    case "fleet_cycles_ops":
      return runFleetCyclesOps(ctx);
    case "weather_sentinel":
      return runWeatherSentinel(ctx);
    case "weather_concierge":
      return runWeatherConcierge(ctx);
    case "nims_ops":
      return runNimsOps(ctx);
    case "orders_claims_ops":
      return runOrdersClaimsOps(ctx);
    case "community_moderator":
      return runCommunityModerator(ctx);
    case "analytics_digest":
      return runAnalyticsDigest(ctx);
    case "compliance_reviewer":
      return runComplianceReviewer(ctx);
    case "orchestrator":
      return null;
    default:
      throw new Error(`Unknown agent kind: ${key}`);
  }
}

export { sendApprovedNewsletters };
