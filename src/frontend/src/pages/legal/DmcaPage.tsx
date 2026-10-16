import { Seo } from "@/components/Seo";
import { usePageTitle } from "@/hooks/usePageTitle";
import {
  DMCA_AGENT_EMAIL,
  LEGAL_POSTAL_ONE_LINE,
} from "@/lib/legal-contact";
import "./legal-pages.css";

export default function DmcaPage() {
  usePageTitle("DMCA");
  return (
    <article className="legal-doc" data-ocid="dmca-policy">
      <Seo
        title="DMCA & Copyright"
        path="/dmca"
        description="Copyright complaints and counter-notifications for IC SPICY."
      />
      <h1>DMCA &amp; copyright</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Last updated: October 16, 2026
      </p>

      <p className="text-amber-200/90 border border-amber-500/30 bg-amber-500/10 rounded-md px-3 py-2 text-sm">
        IC SPICY has not yet completed U.S. Copyright Office registration of a
        designated DMCA agent. Until registration is active, we do not claim
        §512 safe harbor for user-generated content.
      </p>

      <h2>Reporting infringement</h2>
      <p>
        If you believe content on IC SPICY infringes your copyright, send a notice
        with the information required by 17 U.S.C. §512(c)(3) to:
      </p>
      <ul>
        <li>
          Email:{" "}
          <a href={`mailto:${DMCA_AGENT_EMAIL}`}>{DMCA_AGENT_EMAIL}</a> (must
          be monitored before we file with copyright.gov)
        </li>
        <li>Postal: {LEGAL_POSTAL_ONE_LINE}</li>
      </ul>
      <p>
        Include identification of the work, the URL or description of the
        material, your contact information, a good-faith statement, and your
        signature (physical or electronic).
      </p>

      <h2>Counter-notification</h2>
      <p>
        If your content was removed in error, you may submit a counter-notification
        under §512(g) to the same contact points with the required elements.
      </p>

      <h2>Repeat infringers</h2>
      <p>
        We may terminate access for users who repeatedly infringe copyrights when
        appropriate.
      </p>
    </article>
  );
}
