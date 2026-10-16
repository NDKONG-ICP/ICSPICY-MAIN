import { Seo } from "@/components/Seo";
import { useHederaWallet } from "@/providers/HederaWalletProvider";
import {
  checkDropStudioHealth,
  fetchAllowance,
  generateStudioImage,
  requestChallenge,
  type StudioAllowance,
  type StudioPromptMode,
} from "@/lib/drop-studio";
import { staticRouteSeo } from "../../lib/seo-routes.mjs";
import { useEffect, useState } from "react";
import "./drop-studio.css";

const STYLES = [
  { id: "photo", label: "Photo" },
  { id: "ink", label: "Ink" },
  { id: "night", label: "Night market" },
  { id: "still", label: "Still life" },
] as const;

export default function DropStudioPage() {
  const seo = staticRouteSeo("/drop");
  const { accountId, connecting, connect, signMessage, prepareHashPackSign } =
    useHederaWallet();
  const [style, setStyle] = useState<(typeof STYLES)[number]["id"]>("photo");
  const [promptMode, setPromptMode] = useState<StudioPromptMode>("describe");
  const [subject, setSubject] = useState("");
  const [allowance, setAllowance] = useState<StudioAllowance | null>(null);
  const [image, setImage] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [studioOnline, setStudioOnline] = useState<boolean | null>(null);

  useEffect(() => {
    let cancel = false;
    void checkDropStudioHealth().then((ok) => {
      if (!cancel) {
        setStudioOnline(ok);
        if (!ok) {
          setError(
            "Drop Studio is temporarily offline. Holders can try again in a few minutes.",
          );
        }
      }
    });
    return () => {
      cancel = true;
    };
  }, []);

  useEffect(() => {
    if (!accountId || studioOnline === false) {
      if (!accountId) setAllowance(null);
      return;
    }
    if (studioOnline !== true) return;
    let cancel = false;
    setError("");
    fetchAllowance(accountId)
      .then((row) => {
        if (!cancel) setAllowance(row);
      })
      .catch((err: unknown) => {
        if (!cancel) {
          setError(
            err instanceof Error ? err.message : "Could not read NFT allowance",
          );
        }
      });
    return () => {
      cancel = true;
    };
  }, [accountId, studioOnline]);

  async function onGenerate() {
    if (!accountId) return;
    if (studioOnline === false) {
      setError("Drop Studio is offline. Refresh once the operator has restarted the studio.");
      return;
    }
    prepareHashPackSign();
    setBusy(true);
    setError("");
    try {
      const challenge = await requestChallenge(accountId);
      const signature = await signMessage(challenge.message);
      const result = await generateStudioImage({
        accountId,
        challengeId: challenge.challengeId,
        signature,
        style,
        subject,
        promptMode,
      });
      setImage(`data:${result.mimeType};base64,${result.imageBase64}`);
      setAllowance(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setBusy(false);
    }
  }

  async function onShare() {
    if (!image) return;
    const blob = await (await fetch(image)).blob();
    const file = new File([blob], "ic-spicy-drop.png", { type: blob.type || "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: "IC SPICY",
        text: subject.trim() || "Made with an IC SPICY Hedera Drop NFT",
      });
      return;
    }
    const link = document.createElement("a");
    link.href = image;
    link.download = "ic-spicy-drop.png";
    link.click();
  }

  const remaining = allowance
    ? `${allowance.remaining} of ${allowance.allowance} left`
    : "10 images per NFT each day";

  const jsonMode = promptMode === "json";
  const subjectOk = subject.trim().length >= 3;
  const canGenerate = jsonMode ? subjectOk : subjectOk && subject.trim().length <= 280;

  return (
    <div className="drop-studio">
      <Seo title={seo.title} description={seo.description} path="/drop" />
      <div className="drop-studio__inner">
        <p className="drop-studio__kicker">Hedera drop utility</p>
        <h1>Make a picture.</h1>
        <p className="drop-studio__lead">
          Holders of IC SPICY Hedera Drop sign with HashPack and generate on MiniRouter.
          Ten images per NFT, every 24 hours. Share the result from this page.
        </p>

        <div className="drop-studio__panel">
          <div className="drop-studio__modes" role="group" aria-label="Prompt input mode">
            <button
              type="button"
              aria-pressed={!jsonMode}
              onClick={() => setPromptMode("describe")}
            >
              Describe
            </button>
            <button
              type="button"
              aria-pressed={jsonMode}
              onClick={() => setPromptMode("json")}
            >
              JSON prompt
            </button>
          </div>
          <textarea
            value={subject}
            maxLength={jsonMode ? 8000 : 280}
            className={jsonMode ? "drop-studio__textarea--json" : undefined}
            placeholder={
              jsonMode
                ? '{"scene":{"action":"…"},"composition":{…}} or paste full prompt text'
                : "A scarlet habanero on black stone, morning light"
            }
            onChange={(event) => setSubject(event.target.value)}
          />
          {!jsonMode ? (
            <div className="drop-studio__styles">
              {STYLES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={style === item.id}
                  onClick={() => setStyle(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          ) : (
            <p className="drop-studio__hint">
              JSON is sent as-is to MiniRouter (or uses a top-level <code>prompt</code> string if
              present). Style presets are skipped in this mode.
            </p>
          )}
          <div className="drop-studio__actions">
            {accountId ? (
              <button type="button" data-primary="true" disabled={busy || !canGenerate} onClick={() => void onGenerate()}>
                {busy ? "Approve in HashPack…" : "Generate"}
              </button>
            ) : (
              <button type="button" data-primary="true" disabled={connecting} onClick={() => void connect()}>
                {connecting ? "Opening HashPack…" : "Connect HashPack"}
              </button>
            )}
            {image ? (
              <button type="button" onClick={() => void onShare()}>
                Share
              </button>
            ) : null}
          </div>
          <div className="drop-studio__meta">
            <span>{accountId || "HashPack not connected"}</span>
            <span>{remaining}</span>
          </div>
          {allowance ? (
            <div className="drop-studio__meta">
              <span>{allowance.held} NFT{allowance.held === 1 ? "" : "s"} held</span>
              <span>{allowance.siteRemaining} studio images left today</span>
            </div>
          ) : null}
          {error ? (
            <p className="drop-studio__error">
              {error}
              {/minirouter|MiniRouter/i.test(error) ? (
                <>
                  {" "}
                  <a href="https://minirouter.sh/status" target="_blank" rel="noreferrer">
                    Live status
                  </a>
                </>
              ) : null}
            </p>
          ) : null}
          <div className="drop-studio__frame">
            {image ? <img src={image} alt={subject.trim() || "Generated artwork"} /> : <span>Your image lands here</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
