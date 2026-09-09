#!/usr/bin/env python3
"""Generate IC SPICY plant NFC tag system tutorial (mobile-friendly PDF)."""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import re
import textwrap

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "brand-pack"
SLUG = "IC_SPICY_NFC_Tag_System_Tutorial"

BRAND = {
    "name": "IC SPICY",
    "tagline": "Rare. Hot. Alive.",
    "dark": (12 / 255, 8 / 255, 6 / 255),
    "charcoal": (28 / 255, 22 / 255, 18 / 255),
    "card": (42 / 255, 32 / 255, 26 / 255),
    "fire": (238 / 255, 80 / 255, 43 / 255),
    "gold": (230 / 255, 178 / 255, 88 / 255),
    "cream": (248 / 255, 240 / 255, 232 / 255),
    "muted": (196 / 255, 168 / 255, 148 / 255),
}


@dataclass(frozen=True)
class Block:
    title: str
    body: list[str]


TITLE = "IC SPICY Plant NFC Tag System"
KICKER = "Program NTAG215 stickers, tag pots, and hand off on-chain provenance at checkout."
AUDIENCE = "For nursery staff tagging plants and confirming customer claims."
FOOTER = "IC SPICY NFC Tag System Tutorial"


BLOCKS = [
    Block(
        "What You Are Building",
        [
            "Every sale-ready plant gets an NFC sticker on its pot. A tap opens that plant's live page — photos, lifecycle, feedings, weather history, and its on-chain NFT.",
            "At checkout, the buyer taps the tag, signs in with Internet Identity, and requests the plant's provenance NFT. You approve the request from the Admin claim queue and the NFT transfers to them on-chain. Nothing moves without your approval.",
            "The tag holds only a public URL: https://www.icspicy.app/plant/PLANT_ID?src=nfc — the plant ID is not a secret. Your admin approval at the register is the security gate.",
        ],
    ),
    Block(
        "Shopping List",
        [
            "NTAG215 NFC stickers (25 mm round works well on pots; buy blanks, not pre-encoded).",
            "Your iPhone with the free NFC Tools app installed (App Store, by wakdev).",
            "Admin sign-in on icspicy.app (Internet Identity).",
            "Optional: an Android phone with Chrome writes tags directly from the site — no extra app.",
            "Plants must have an NFT to be claimable. The assign wizard mints one automatically when you (admin) create the plant.",
        ],
    ),
    Block(
        "Step 1 — Open the Assign Wizard",
        [
            "On your iPhone or MacBook, go to icspicy.app/admin/nfc-assign (sign in as admin).",
            "Also reachable from Admin -> NIMS -> Assign NFC.",
            "First visit on iPhone shows a built-in tutorial dialog. Reopen it anytime with icspicy.app/admin/nfc-assign?tutorial=1",
        ],
    ),
    Block(
        "Step 2 — Create the Plant Record",
        [
            "Photo: snap the plant with the rear camera (optional — you can skip and add later).",
            "Plant: pick the variety, stage (Seedling or Mature), and container. Optionally list it for sale with a price.",
            "Saving creates the plant, uploads the photo, snapshots today's nursery weather, and mints its NFT. The toast shows Plant #ID and NFT #ID — the wizard then shows the tag URL and a QR code.",
        ],
    ),
    Block(
        "Step 3 — Program the Tag (iPhone)",
        [
            "Safari cannot write NFC stickers, so use the NFC Tools app:",
            "1. Tap Copy URL on the wizard screen.",
            "2. Open NFC Tools -> Write -> Add a record -> URL.",
            "3. Paste the plant link and tap OK, then tap Write.",
            "4. Hold the iPhone's top edge on the blank NTAG215 sticker (~3 seconds) until it confirms.",
            "5. Peel and stick the tag on the pot. Tap it once with your own phone to test — Safari should open the plant page.",
        ],
    ),
    Block(
        "Step 3B — Android or Bulk",
        [
            "Android Chrome: the wizard shows a Write to NFC tag button — tap it, hold the phone to the sticker, done. No extra app.",
            "Bulk prep: Admin -> NIMS -> Generate tag links (CSV) exports every plant's URL so you can program batches of tags at the potting bench.",
            "You can also re-open any plant's page later: owners/admins get an NFC tag quick action with the same write/copy/QR options.",
        ],
    ),
    Block(
        "Step 4 — Customer Tap & Claim",
        [
            "Customer taps the pot with any modern phone — the plant page opens with a Claim banner (shown while the plant has an NFT and is unsold).",
            "They tap Request claim, sign in with Internet Identity (one tap with passkey), optionally add a note (e.g. receipt number), and submit.",
            "Their screen shows: Claim requested — awaiting nursery confirmation. They can cancel it themselves before you approve.",
        ],
    ),
    Block(
        "Step 5 — Approve at Checkout",
        [
            "Admin -> NIMS -> Pending provenance claims.",
            "Each request shows the variety, NFT ID, time, requester principal, and their note. Match it to the customer in front of you.",
            "Tap Approve: the NFT transfers to the buyer, the plant is marked sold to them, and any other pending requests for that plant are auto-rejected.",
            "Tap Reject for anything that doesn't match a real purchase.",
            "The buyer's plant page now shows Provenance verified on-chain.",
        ],
    ),
    Block(
        "Nursery Day Checklist",
        [
            "1. Stickers + iPhone with NFC Tools charged.",
            "2. Sign in as admin, open /admin/nfc-assign.",
            "3. Per plant: photo -> details -> save -> copy URL -> write tag -> stick on pot -> test tap.",
            "4. At the register: buyer taps + requests, you approve in the claim queue.",
            "5. End of day: glance at the claim queue for stragglers; reject anything unmatched.",
        ],
    ),
    Block(
        "Troubleshooting",
        [
            "Tag won't write: confirm it is NTAG215 (not NTAG213 pre-locked or Mifare Classic), hold still 3+ seconds, and keep it off metal shelving while writing.",
            "Tap opens nothing: re-write the tag; moisture or metal pots weaken the read. Test with the pot in hand, not on a metal rack.",
            "No claim banner on the page: the plant has no NFT (created by a non-admin), or it is already sold or marked dead.",
            "Claim button says sign in: the customer must authenticate with Internet Identity first — anonymous browsing can view but not claim.",
            "Duplicate requests: each person can only have one pending request per plant; approving one automatically rejects the rest.",
            "Wrote the wrong URL: NTAG215 tags are re-writable — just write again unless you locked the tag (don't lock).",
        ],
    ),
    Block(
        "Security Notes",
        [
            "The tag URL is public — anyone can view the plant page. That's by design (marketing + provenance).",
            "Any signed-in visitor can request a claim; the NFT only moves when an admin approves. Approve only for customers physically at checkout.",
            "Approvals and rejections are audit-logged on-chain.",
            "The NFT must be held by the nursery to transfer — already-transferred plants cannot be re-claimed.",
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
        self.text(FOOTER, 22, 22, 7, "F1", BRAND["muted"])
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
        self.text("August 2026 · Mobile-friendly nursery guide", 42, 226, 8, "F1", BRAND["muted"])
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


BULLET_PREFIXES = ("1.", "2.", "3.", "4.", "5.", "6.", "Tag ", "Tap ", "No ", "Claim ", "Duplicate", "Wrote ", "Android", "Bulk", "You can", "NTAG", "Your ", "Admin ", "Optional", "Plants ", "Photo:", "Plant:", "Saving ", "Each ", "The ", "Approvals", "Any ", "On ", "Also ", "First ", "Customer ", "They ", "Their ")


def markdown() -> str:
    lines = [f"# {TITLE}", "", f"**{KICKER}**", "", f"*{AUDIENCE}*", "", "---", ""]
    for block in BLOCKS:
        lines.append(f"## {block.title}")
        lines.append("")
        for para in block.body:
            lines.append(f"- {para}" if para.startswith(BULLET_PREFIXES) else para)
            lines.append("")
    return "\n".join(lines).rstrip() + "\n"


def render_pdf(path: Path) -> None:
    pdf = MobilePdf(TITLE)
    pdf.cover()
    for block in BLOCKS:
        pdf.h1(block.title)
        for para in block.body:
            if para.startswith(BULLET_PREFIXES):
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
