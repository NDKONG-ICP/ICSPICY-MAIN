/**
 * Public Capsaicin proof gallery — /p/captain
 */
import { Seo } from "@/components/Seo";
import {
  fetchCaptainProofIndex,
  type CaptainProofIndex,
} from "@/lib/captain-proof";
import { HederaTwinClaimCard } from "@/components/HederaTwinClaimCard";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import "./captain-proof.css";

export default function CaptainProofIndexPage() {
  const [index, setIndex] = useState<CaptainProofIndex | null>(null);

  useEffect(() => {
    void fetchCaptainProofIndex().then(setIndex);
  }, []);

  return (
    <div className="cap-proof cap-proof--index">
      <Seo
        title="Captain Capsaicin proofs — IC SPICY × MiniRouter"
        description="Public dual-rail proofs: MiniRouter image credits hosted as ICP assets by Captain Capsaicin."
        path="/p/captain"
      />
      <section className="cap-proof__twin-claim mx-auto max-w-lg px-4 mb-8">
        <HederaTwinClaimCard />
      </section>

      <header className="cap-proof__index-head">
        <p className="cap-proof__brand">IC SPICY</p>
        <h1 className="cap-proof__title">Captain Capsaicin proofs</h1>
        <p className="cap-proof__lede">
          MiniRouter (Solana credit rail) → ICP asset canister
        </p>
      </header>

      {!index ? (
        <p className="cap-proof__meta">Loading…</p>
      ) : index.proofs.length === 0 ? (
        <p className="cap-proof__meta">
          No public proofs yet. They appear after the next live Capsaicin image
          post.
        </p>
      ) : (
        <ul className="cap-proof__grid">
          {index.proofs.map((p) => (
            <li key={p.id}>
              <Link to="/p/captain/$id" params={{ id: p.id }} className="cap-proof__card">
                <img src={p.imageUrl} alt="" loading="lazy" />
                <div>
                  <strong>{p.id}</strong>
                  <span>
                    {p.at ? new Date(p.at).toLocaleString() : ""}
                    {p.requestId ? ` · ${p.requestId.slice(0, 18)}…` : ""}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="cap-proof__footer-nav">
        <Link to="/">IC SPICY home</Link>
      </p>
    </div>
  );
}
