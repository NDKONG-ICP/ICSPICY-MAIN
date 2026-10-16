/**
 * Public Capsaicin proof share — MiniRouter (Solana credit rail) ↔ ICP assets.
 * Route: /p/captain/$id
 */
import { Seo } from "@/components/Seo";
import {
  CAPTAIN_PRINCIPAL,
} from "@/lib/capsaicin-portfolio";
import {
  fetchCaptainProof,
  type CaptainProof,
} from "@/lib/captain-proof";
import { Link, useParams } from "@tanstack/react-router";
import { Copy, ExternalLink, Share2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import "./captain-proof.css";

function copyText(text: string, label: string) {
  void navigator.clipboard.writeText(text);
  toast.success(`${label} copied`);
}

async function sharePage(url: string, title: string) {
  if (navigator.share) {
    try {
      await navigator.share({ title, url, text: title });
      return;
    } catch {
      /* fall through */
    }
  }
  copyText(url, "Share link");
}

function ProofBody({ proof }: { proof: CaptainProof }) {
  const shareUrl =
    proof.shareUrl ||
    `${typeof window !== "undefined" ? window.location.origin : ""}${proof.sharePath}`;
  const when = proof.at ? new Date(proof.at) : null;

  return (
    <div className="cap-proof">
      <div className="cap-proof__hero">
        <img
          src={proof.icp.imageUrl}
          alt="Captain Capsaicin — MiniRouter generated, hosted on ICP"
          className="cap-proof__hero-img"
          decoding="async"
          fetchPriority="high"
        />
        <div className="cap-proof__hero-scrim" aria-hidden />
        <div className="cap-proof__hero-copy">
          <p className="cap-proof__brand">IC SPICY</p>
          <h1 className="cap-proof__title">Captain Capsaicin</h1>
          <p className="cap-proof__lede">
            Dual-rail proof: MiniRouter image credit → ICP asset canister
          </p>
        </div>
      </div>

      <div className="cap-proof__panel">
        <div className="cap-proof__actions">
          <button
            type="button"
            className="cap-proof__btn"
            onClick={() =>
              void sharePage(
                shareUrl,
                "IC SPICY × MiniRouter — Captain Capsaicin proof",
              )
            }
          >
            <Share2 className="h-4 w-4" /> Share
          </button>
          <button
            type="button"
            className="cap-proof__btn cap-proof__btn--ghost"
            onClick={() => copyText(shareUrl, "Share link")}
          >
            <Copy className="h-4 w-4" /> Copy link
          </button>
        </div>

        {when && !Number.isNaN(when.getTime()) && (
          <p className="cap-proof__meta">{when.toUTCString()}</p>
        )}

        <section className="cap-proof__rail">
          <h2>MiniRouter</h2>
          <p className="cap-proof__rail-sub">Solana credit rail · OWNER-PAID</p>
          <div className="cap-proof__row">
            <span>Request</span>
            <code>{proof.minirouter.requestId || "—"}</code>
            {proof.minirouter.requestId && (
              <button
                type="button"
                className="cap-proof__icon"
                aria-label="Copy MiniRouter request id"
                onClick={() =>
                  copyText(proof.minirouter.requestId!, "MiniRouter request id")
                }
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {proof.minirouter.model && (
            <div className="cap-proof__row">
              <span>Model</span>
              <code className="cap-proof__truncate">{proof.minirouter.model}</code>
            </div>
          )}
          <a
            className="cap-proof__link"
            href={proof.minirouter.activityUrl || "https://minirouter.sh"}
            target="_blank"
            rel="noreferrer"
          >
            Open MiniRouter Activity <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </section>

        <section className="cap-proof__rail">
          <h2>Internet Computer</h2>
          <p className="cap-proof__rail-sub">IC SPICY frontend asset canister</p>
          <div className="cap-proof__row">
            <span>Canister</span>
            <code className="cap-proof__truncate">{proof.icp.canisterId}</code>
          </div>
          <div className="cap-proof__row">
            <span>Asset</span>
            <code className="cap-proof__truncate">{proof.icp.imageKey}</code>
          </div>
          <a
            className="cap-proof__link"
            href={proof.icp.imageUrl}
            target="_blank"
            rel="noreferrer"
          >
            Open ICP image <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </section>

        <section className="cap-proof__rail">
          <h2>Agent</h2>
          <div className="cap-proof__row">
            <span>Principal</span>
            <code className="cap-proof__truncate">
              {proof.agentPrincipal || CAPTAIN_PRINCIPAL}
            </code>
          </div>
          {(proof.posts.crumbeatr || proof.posts.swop) && (
            <div className="cap-proof__posts">
              {proof.posts.crumbeatr && (
                <span>Crumbeatr #{proof.posts.crumbeatr}</span>
              )}
              {proof.posts.swop && (
                <a
                  className="cap-proof__link"
                  href={`https://theswop.app/@CaptainCapsaicin`}
                  target="_blank"
                  rel="noreferrer"
                >
                  SWOP {proof.posts.swop}
                </a>
              )}
            </div>
          )}
        </section>

        <p className="cap-proof__footnote">
          Operational dual-rail receipt (MiniRouter request id ↔ ICP-hosted
          JPEG ↔ Capsaicin post). Not a cryptographic Solana↔ICP bridge
          attestation.
        </p>

        <p className="cap-proof__footer-nav">
          <Link to="/p/captain">All proofs</Link>
          {" · "}
          <Link to="/">IC SPICY</Link>
        </p>
      </div>
    </div>
  );
}

export default function CaptainProofPage() {
  const { id } = useParams({ strict: false }) as { id?: string };
  const [proof, setProof] = useState<CaptainProof | null | undefined>(
    undefined,
  );

  useEffect(() => {
    if (!id) {
      setProof(null);
      return;
    }
    let cancelled = false;
    void fetchCaptainProof(id).then((p) => {
      if (!cancelled) setProof(p);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (proof === undefined) {
    return (
      <div className="cap-proof cap-proof--loading">
        <Seo
          title="Captain Capsaicin proof — IC SPICY"
          description="Loading Capsaicin MiniRouter ↔ ICP proof."
          path={`/p/captain/${id ?? ""}`}
        />
        <p>Loading proof…</p>
      </div>
    );
  }

  if (!proof) {
    return (
      <div className="cap-proof cap-proof--missing">
        <Seo
          title="Proof not found — IC SPICY"
          description="No Capsaicin proof found for this id."
          path={`/p/captain/${id ?? ""}`}
        />
        <h1>Proof not found</h1>
        <p>
          No public proof for <code>{id}</code>.{" "}
          <Link to="/p/captain">Browse recent proofs</Link>
        </p>
      </div>
    );
  }

  return (
    <>
      <Seo
        title={`Captain Capsaicin proof ${proof.id} — IC SPICY × MiniRouter`}
        description="Dual-rail proof: MiniRouter image generation settled to an ICP-hosted Captain Capsaicin asset."
        path={proof.sharePath || `/p/captain/${proof.id}`}
        ogImage={proof.icp.imageUrl}
      />
      <ProofBody proof={proof} />
    </>
  );
}
