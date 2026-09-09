#!/usr/bin/env python3
"""Generate IC SPICY Agent Swarm Worker setup tutorial (mobile-friendly PDF)."""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import re
import textwrap

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "brand-pack"
SLUG = "IC_SPICY_Agent_Swarm_Worker_Tutorial"

BRAND = {
    "name": "IC SPICY",
    "tagline": "Rare. Hot. Alive.",
    "subtitle": "Farm-grown heat. Chef-built flavor. Blockchain-backed provenance.",
    "dark": (12 / 255, 8 / 255, 6 / 255),
    "charcoal": (28 / 255, 22 / 255, 18 / 255),
    "card": (42 / 255, 32 / 255, 26 / 255),
    "fire": (238 / 255, 80 / 255, 43 / 255),
    "orange": (255 / 255, 128 / 255, 85 / 255),
    "gold": (230 / 255, 178 / 255, 88 / 255),
    "cream": (248 / 255, 240 / 255, 232 / 255),
    "muted": (196 / 255, 168 / 255, 148 / 255),
}


@dataclass(frozen=True)
class Block:
    title: str
    body: list[str]


TITLE = "IC SPICY Agent Swarm Worker Setup"
KICKER = "Step-by-step guide to run the off-chain agent worker on Mac or Chromebook."
AUDIENCE = "For IC SPICY admins setting up newsletter, social drafts, and ops agents."


BLOCKS = [
    Block(
        "What You Are Building",
        [
            "The Agent Swarm has two parts: agent_hub (on-chain brain on ICP) and a Node.js worker (off-chain hands). You control both. The worker uses a BIP39 seed phrase to derive a principal — register that principal in Admin → Agent Swarm → Worker principals.",
            "The hub stores jobs, drafts, approvals, subscribers, secrets, and audit logs. The worker polls for jobs, reads backend data (recipes, orders, weather), calls your LLM API, and submits drafts for your approval before anything is sent.",
            "Never store API keys in git. Only the seed phrase lives on the worker machine (in .env or a file with chmod 600). Resend and LLM keys are set in Admin → Agent Swarm → Secrets.",
        ],
    ),
    Block(
        "Prerequisites",
        [
            "Node.js 20+ (nvm recommended on Mac; Crostini Linux on Chromebook).",
            "dfx 0.29+ and mops for canister deploys (already in this repo).",
            "Resend account (resend.com) with a verified sending domain DNS records.",
            "LLM API key: OpenAI or Anthropic (SpicyAI on-chain fallback is rate-limited).",
            "Admin access to icspicy.app Admin → Agent Swarm tab.",
            "~3T cycles for agent_hub canister on mainnet (one-time create).",
        ],
    ),
    Block(
        "Live Mainnet Canister IDs",
        [
            "All canisters are deployed. Paste these into worker/.env:",
            "AGENT_HUB_CANISTER_ID=swzzi-lyaaa-aaaao-bbfha-cai",
            "BACKEND_CANISTER_ID=ghxmp-xiaaa-aaaao-ba4sq-cai",
            "PUBLIC_SITE_URL=https://7rukv-hqaaa-aaaao-ba6ma-cai.icp0.io",
            "Related fleet: newsletter qzcaz-uaaaa-aaaao-bbflq-cai, weather concierge qqblf-ciaaa-aaaao-bbfka-cai, weather sentinel qxanr-pqaaa-aaaao-bbfkq-cai, fleet cycles ops q6dgn-zyaaa-aaaao-bbfla-cai.",
        ],
    ),
    Block(
        "Step 1 — Generate Worker Identity",
        [
            "cd worker && cp .env.example .env",
            "Generate a new 12-word BIP39 mnemonic (write it on paper; never commit it): node -e \"console.log(require('bip39').generateMnemonic())\"",
            "Set WORKER_MNEMONIC=\"word1 word2 ...\" in .env OR save words to ~/.ic-spicy/worker-mnemonic.txt and set WORKER_MNEMONIC_FILE.",
            "npm install && npm run show-principal — copy the printed principal.",
            "In Admin → Agent Swarm → Worker principals → Register that principal. Also register it on backend via backend addAgentPrincipal (same Admin flow uses hub; backend agent role enables fleet/orders reads).",
        ],
    ),
    Block(
        "Step 2 — Configure Secrets (Admin UI)",
        [
            "Admin → Agent Swarm → Secrets. Set: resend_api_key, resend_from_email (e.g. newsletter@yourdomain.com), llm_api_key, llm_provider (openai or anthropic), llm_model (e.g. gpt-4o-mini), admin_alert_email (optional), newsletter_reply_to (optional).",
            "Set AGENT_HUB_CANISTER_ID and BACKEND_CANISTER_ID in worker/.env after deploy (see canister_ids.json).",
            "Set PUBLIC_SITE_URL to your frontend URL for newsletter confirm links (mainnet: https://7rukv-hqaaa-aaaao-ba6ma-cai.icp0.io).",
        ],
    ),
    Block(
        "Step 3 — M1 MacBook Air Setup",
        [
            "Install nvm: curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash",
            "nvm install 20 && nvm use 20",
            "Clone or open this repo. cd worker && npm install",
            "Test one poll cycle: npm run once (requires local or mainnet canisters deployed and worker principal registered).",
            "Always-on: edit worker/deploy/com.icspicy.agent-worker.plist — replace CHANGE_ME paths with your repo path. mkdir worker/logs",
            "launchctl load ~/Library/LaunchAgents/com.icspicy.agent-worker.plist (copy plist there first).",
            "Monitor: tail -f worker/logs/stdout.log",
        ],
    ),
    Block(
        "Step 4 — Chromebook (Crostini Linux)",
        [
            "Settings → Developers → Linux → Turn on. Open Terminal.",
            "sudo apt update && sudo apt install -y curl git build-essential",
            "Install nvm and Node 20 (same commands as Mac).",
            "Clone repo into Linux files (~/IC-SPICY-MAIN). cd worker && npm install",
            "Prevent sleep: Settings → Device → Power → Sleep when inactive → Never (while plugged in).",
            "Copy worker/deploy/ic-spicy-agent-worker.service — replace CHANGE_ME paths and User.",
            "sudo cp ic-spicy-agent-worker.service /etc/systemd/system/ && sudo systemctl daemon-reload",
            "sudo systemctl enable --now ic-spicy-agent-worker.service",
            "Check status: sudo systemctl status ic-spicy-agent-worker",
        ],
    ),
    Block(
        "Step 5 — Resend DNS Verification",
        [
            "In Resend dashboard → Domains → Add domain (your sending domain).",
            "Add the SPF, DKIM, and optional DMARC DNS records Resend provides.",
            "Wait for verification (usually minutes to hours).",
            "Use the verified address as resend_from_email in Admin secrets.",
            "Test: subscribe your email via site footer → confirm link → approve newsletter draft in Admin → worker sends on next poll.",
        ],
    ),
    Block(
        "Step 6 — Daily Workflow",
        [
            "Orchestrator enqueues jobs on a timer inside agent_hub. Worker claims jobs every POLL_INTERVAL_SEC (default 60s).",
            "Social agents submit drafts only — review in Admin → Agent Swarm → Approval Queue. Approve, edit, or reject.",
            "Newsletter agent creates HTML draft weekly. After approval, worker sends via Resend with idempotency keys (no double-send on retry).",
            "Ops agents (fleet/cycles, weather, orders/claims, analytics) post internal digests to the same queue.",
            "Compliance reviewer runs rule checks + optional LLM review before drafts enter the queue.",
        ],
    ),
    Block(
        "Step 7 — Deploy Canisters",
        [
            "Local first: dfx start --background --clean && dfx deploy --network local backend agent_hub",
            "dfx generate backend && pnpm bindgen from repo root.",
            "Frontend: cd src/frontend && pnpm build. Set CANISTER_ID_AGENT_HUB in env for Vite.",
            "Mainnet (requires explicit confirmation): dfx deploy --network ic agent_hub (~3T cycles), then dfx deploy --network ic backend, then node scripts/upload-frontend.mjs --network ic --canister 7rukv-hqaaa-aaaao-ba6ma-cai",
            "Post-deploy: register worker principal, set secrets, subscribe test email, run npm run once on worker.",
        ],
    ),
    Block(
        "Troubleshooting",
        [
            "agent only / admin or agent only: worker principal not registered in hub or backend.",
            "Newsletter service not configured: CANISTER_ID_AGENT_HUB missing in frontend build env.",
            "Resend 403: domain not verified or wrong from address.",
            "LLM errors: check llm_api_key and provider/model in Admin secrets.",
            "Revoke compromised worker: Admin → remove worker principal immediately; rotate mnemonic and re-register.",
        ],
    ),
    Block(
        "Security Checklist",
        [
            "Seed phrase: paper backup only; chmod 600 on .env and mnemonic file.",
            "Worker is agent role, never full admin.",
            "All public sends require human approval in Admin queue (start here; auto-post later per platform).",
            "Audit log in Admin → Agent Swarm → Audit for every draft and secret change.",
            "Do not log customer email content in worker stdout in production.",
        ],
    ),
]


def strip_md(text: str) -> str:
    text = re.sub(r"\*\*(.*?)\*\*", r"\1", text)
    # Helvetica Type1 + latin-1 can't encode these; swap for ASCII.
    for src, dst in (("\u2192", "->"), ("\u2014", "-"), ("\u2013", "-"), ("\u2018", "'"), ("\u2019", "'"), ("\u201c", '"'), ("\u201d", '"'), ("\u2026", "...")):
        text = text.replace(src, dst)
    return text


def esc_pdf(text: str) -> str:
    return text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def wrap(text: str, width: int) -> list[str]:
    return textwrap.wrap(strip_md(text), width=width, break_long_words=False, replace_whitespace=True)


class MobilePdf:
    def __init__(self, title: str):
        self.w = 390
        self.h = 844
        self.title = title
        self.pages: list[list[str]] = []
        self.current: list[str] = []
        self.page_no = 0
        self.y = 0

    def cmd(self, command: str) -> None:
        self.current.append(command)

    def color(self, rgb: tuple[float, float, float], stroke: bool = False) -> None:
        self.cmd(f"{rgb[0]:.3f} {rgb[1]:.3f} {rgb[2]:.3f} {'RG' if stroke else 'rg'}")

    def rect(self, x: float, y: float, w: float, h: float, fill: bool = True) -> None:
        self.cmd(f"{x:.1f} {y:.1f} {w:.1f} {h:.1f} re {'f' if fill else 'S'}")

    def line(self, x1: float, y1: float, x2: float, y2: float) -> None:
        self.cmd(f"{x1:.1f} {y1:.1f} m {x2:.1f} {y2:.1f} l S")

    def text(self, text: str, x: float, y: float, size: float = 9.5, font: str = "F1", rgb=None) -> None:
        if rgb:
            self.color(rgb)
        self.cmd(f"BT /{font} {size:.1f} Tf {x:.1f} {y:.1f} Td ({esc_pdf(strip_md(text))}) Tj ET")

    def new_page(self, cover: bool = False) -> None:
        if self.current:
            self.add_footer()
            self.pages.append(self.current)
        self.current = []
        self.page_no += 1
        self.color(BRAND["dark"])
        self.rect(0, 0, self.w, self.h)
        self.color(BRAND["fire"])
        self.rect(0, self.h - 8, self.w, 8)
        self.color(BRAND["charcoal"])
        self.rect(0, self.h - 64, self.w, 56)
        self.text(BRAND["name"], 22, self.h - 33, 13, "F2", BRAND["cream"])
        self.text(BRAND["tagline"], 22, self.h - 50, 8, "F1", BRAND["gold"])
        if not cover:
            for i, line in enumerate(wrap(self.title, 31)[:2]):
                self.text(line, 182, self.h - 32 - i * 12, 7.6, "F1", BRAND["muted"])
        self.y = self.h - 92

    def add_footer(self) -> None:
        self.color(BRAND["gold"], stroke=True)
        self.line(22, 38, self.w - 22, 38)
        self.text("IC SPICY Agent Swarm Worker Tutorial", 22, 22, 7, "F1", BRAND["muted"])
        self.text(str(self.page_no), self.w - 38, 22, 7, "F1", BRAND["muted"])

    def ensure(self, needed: float) -> None:
        if self.y - needed < 58:
            self.new_page()

    def cover(self) -> None:
        self.new_page(cover=True)
        self.color(BRAND["card"])
        self.rect(22, 184, self.w - 44, 460)
        self.color(BRAND["fire"])
        self.rect(22, 184, 6, 460)
        self.text("IC SPICY", 42, 592, 23, "F2", BRAND["cream"])
        for i, line in enumerate(wrap(TITLE, 28)):
            self.text(line, 42, 548 - i * 25, 18, "F2", BRAND["gold"])
        for i, line in enumerate(wrap(KICKER, 42)):
            self.text(line, 42, 420 - i * 16, 10.5, "F1", BRAND["cream"])
        self.text("August 2026 · Mobile-friendly operator guide", 42, 226, 8, "F1", BRAND["muted"])
        self.new_page()

    def h1(self, text: str) -> None:
        self.ensure(42)
        self.color(BRAND["fire"])
        self.rect(22, self.y - 6, 4, 23)
        for i, line in enumerate(wrap(text, 31)):
            self.text(line, 34, self.y - i * 16, 14, "F2", BRAND["gold"])
        self.y -= 26 + max(0, len(wrap(text, 31)) - 1) * 16

    def paragraph(self, text: str) -> None:
        lines = wrap(text, 58)
        self.ensure(13.2 * len(lines) + 12)
        for line in lines:
            self.text(line, 34, self.y, 8.9, "F1", BRAND["cream"])
            self.y -= 12.4
        self.y -= 6

    def bullet(self, text: str) -> None:
        lines = wrap(text, 52)
        self.ensure(13.2 * len(lines) + 10)
        self.text("-", 38, self.y, 9, "F2", BRAND["fire"])
        self.text(lines[0], 52, self.y, 8.8, "F1", BRAND["cream"])
        self.y -= 12.4
        for line in lines[1:]:
            self.text(line, 52, self.y, 8.8, "F1", BRAND["cream"])
            self.y -= 12.4
        self.y -= 5

    def finalize(self) -> None:
        if self.current:
            self.add_footer()
            self.pages.append(self.current)
            self.current = []

    def save(self, path: Path) -> None:
        self.finalize()
        objects: list[str] = []
        objects.append("<< /Type /Catalog /Pages 2 0 R >>")
        kids = " ".join(f"{3 + i * 2} 0 R" for i in range(len(self.pages)))
        objects.append(f"<< /Type /Pages /Kids [{kids}] /Count {len(self.pages)} >>")
        for idx, commands in enumerate(self.pages):
            page_obj = 3 + idx * 2
            content_obj = page_obj + 1
            stream = "\n".join(commands)
            objects.append(
                f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 {self.w} {self.h}] "
                f"/Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> "
                f"/F2 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> >> >> "
                f"/Contents {content_obj} 0 R >>"
            )
            length = len(stream.encode("latin-1", errors="replace"))
            objects.append(f"<< /Length {length} >>\nstream\n{stream}\nendstream")
        out = ["%PDF-1.4\n%\xE2\xE3\xCF\xD3\n"]
        offsets = [0]
        pos = len(out[0].encode("latin-1"))
        for i, obj in enumerate(objects, start=1):
            offsets.append(pos)
            chunk = f"{i} 0 obj\n{obj}\nendobj\n"
            out.append(chunk)
            pos += len(chunk.encode("latin-1", errors="replace"))
        xref_pos = pos
        out.append(f"xref\n0 {len(objects) + 1}\n0000000000 65535 f \n")
        for off in offsets[1:]:
            out.append(f"{off:010d} 00000 n \n")
        out.append(f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref_pos}\n%%EOF\n")
        path.write_bytes("".join(out).encode("latin-1", errors="replace"))


def markdown() -> str:
    lines = [f"# {TITLE}", "", f"**{KICKER}**", "", f"*{AUDIENCE}*", "", "---", ""]
    for block in BLOCKS:
        lines.append(f"## {block.title}")
        lines.append("")
        for para in block.body:
            if para.startswith(("cd ", "npm ", "node ", "dfx ", "sudo ", "launchctl ", "nvm ", "Install ", "Generate ", "Set ", "In ", "Test ", "Always-on", "Monitor:", "Check ", "Wait ", "Use ", "Orchestrator", "Local ", "Mainnet", "agent ", "Newsletter", "Resend", "LLM", "Revoke", "Seed ")):
                lines.append(f"- {para}")
            else:
                lines.append(para)
            lines.append("")
    return "\n".join(lines).rstrip() + "\n"


def render_pdf(path: Path) -> None:
    pdf = MobilePdf(TITLE)
    pdf.cover()
    for block in BLOCKS:
        pdf.h1(block.title)
        for para in block.body:
            if para.startswith(("cd ", "npm ", "node ", "dfx ", "sudo ", "launchctl ", "nvm ")):
                pdf.bullet(para)
            else:
                pdf.paragraph(para)
    pdf.save(path)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / f"{SLUG}.md").write_text(markdown(), encoding="utf-8")
    render_pdf(OUT / f"{SLUG}.pdf")
    print(OUT / f"{SLUG}.md")
    print(OUT / f"{SLUG}.pdf")


if __name__ == "__main__":
    main()
