import { Seo } from "@/components/Seo";
import { usePageTitle } from "@/hooks/usePageTitle";
import {
  DMCA_AGENT_EMAIL,
  LEGAL_POSTAL_ONE_LINE,
} from "@/lib/legal-contact";
import "./legal-pages.css";

export default function PrivacyPage() {
  usePageTitle("Privacy Policy");
  return (
    <article className="legal-doc" data-ocid="privacy-policy">
      <Seo
        title="Privacy Policy"
        path="/privacy"
        description="How IC SPICY handles sign-in, wallets, newsletter email, orders, and analytics."
      />
      <h1>Privacy Policy</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Last updated: October 16, 2026
      </p>

      <p>
        IC SPICY (“we,” “us”) operates icspicy.app and related services. This
        policy describes how we handle information when you use our website,
        Internet Computer canisters, newsletter, and community features.
      </p>

      <h2>Who we are</h2>
      <p>{LEGAL_POSTAL_ONE_LINE}</p>

      <h2>Information we collect</h2>
      <ul>
        <li>
          <strong>Internet Identity / wallet:</strong> When you sign in or connect
          OISY or HashPack, we receive your public principal or account identifiers
          to authenticate you and deliver on-chain features.
        </li>
        <li>
          <strong>Profile &amp; community content:</strong> Usernames, posts,
          comments, and uploads you choose to publish.
        </li>
        <li>
          <strong>Newsletter:</strong> Email address if you subscribe (with
          confirmation). You must be 13 or older to subscribe.
        </li>
        <li>
          <strong>Orders:</strong> Shipping details and payment references needed
          to fulfill purchases (PayPal, ICPay, or token payments).
        </li>
        <li>
          <strong>Usage analytics:</strong> Coarse, first-party events (e.g.
          page views) via our backend — not session replay, heatmaps, or
          keystroke logging. We do not use PostHog, Hotjar, Microsoft Clarity, or
          similar replay SDKs.
        </li>
        <li>
          <strong>Age attestation:</strong> If you confirm you are 13+, we store a
          timestamp and method flag in your browser and, when signed in, on our
          backend canister. We do not collect date of birth.
        </li>
      </ul>

      <h2>Cookies &amp; local storage</h2>
      <p>
        We use browser storage for authentication state, cart, age attestation,
        and cookie-notice preferences. PayPal and Internet Identity may set
        cookies when you use those flows. Embedded YouTube players may set
        third-party cookies if you play a video.
      </p>

      <h2>How we use information</h2>
      <p>
        To operate the marketplace, NFT provenance tools, community, games,
        weather desk, newsletter, and customer support; to comply with law; and
        to protect our users and platform.
      </p>

      <h2>Children</h2>
      <p>
        IC SPICY is not directed at children under 13. We do not knowingly allow
        under-13 users to create accounts, connect wallets, subscribe to email,
        or use SpicyAI.
      </p>

      <h2>Your choices</h2>
      <p>
        You may unsubscribe from email via the link in each message. You can
        disconnect wallets and request help removing public profile content by
        contacting us at the postal address above.
      </p>

      <h2>Contact</h2>
      <p>
        Privacy questions: {LEGAL_POSTAL_ONE_LINE}. Copyright notices:{" "}
        <a href={`mailto:${DMCA_AGENT_EMAIL}`}>{DMCA_AGENT_EMAIL}</a>.
      </p>
    </article>
  );
}
