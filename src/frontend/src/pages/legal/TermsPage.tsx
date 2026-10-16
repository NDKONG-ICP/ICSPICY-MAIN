import { Seo } from "@/components/Seo";
import { usePageTitle } from "@/hooks/usePageTitle";
import { LEGAL_POSTAL_ONE_LINE } from "@/lib/legal-contact";
import { Link } from "@tanstack/react-router";
import "./legal-pages.css";

export default function TermsPage() {
  usePageTitle("Terms of Use");
  return (
    <article className="legal-doc" data-ocid="terms-of-use">
      <Seo
        title="Terms of Use"
        path="/terms"
        description="Terms for icspicy.app marketplace, NFT tools, and community features."
      />
      <h1>Terms of Use</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Last updated: October 16, 2026
      </p>

      <p>
        By using IC SPICY (icspicy.app), you agree to these terms. If you do not
        agree, do not use the service.
      </p>

      <h2>Eligibility</h2>
      <p>
        You must be at least 13 years old. By using wallet connect, sign-in,
        newsletter signup, or SpicyAI, you represent that you meet this
        requirement.
      </p>

      <h2>Accounts &amp; wallets</h2>
      <p>
        You are responsible for securing your Internet Identity, OISY, and
        HashPack credentials. On-chain actions signed with your keys are your
        responsibility.
      </p>

      <h2>Marketplace &amp; payments</h2>
      <p>
        Product prices are shown at checkout. Unless explicitly stated otherwise,
        charges are one-time purchases — not subscriptions — and do not
        auto-renew. Live plants and perishable goods are subject to availability
        and our pickup/shipping policies shown at checkout.
      </p>

      <h2>User content</h2>
      <p>
        You retain ownership of content you post. You grant IC SPICY a license
        to host and display it on the platform. Do not post unlawful, infringing,
        or harmful material. See our{" "}
        <Link to="/dmca">DMCA policy</Link> for copyright complaints.
      </p>

      <h2>NFTs &amp; digital items</h2>
      <p>
        NFTs and digital collectibles are subject to the terms shown at mint or
        purchase. They are not financial instruments; no investment return is
        promised.
      </p>

      <h2>Disclaimer</h2>
      <p>
        Services are provided “as is” to the extent permitted by law. Growing
        advice, weather data, and AI responses are informational — not
        professional agricultural or financial advice.
      </p>

      <h2>Contact</h2>
      <p>{LEGAL_POSTAL_ONE_LINE}</p>
    </article>
  );
}
