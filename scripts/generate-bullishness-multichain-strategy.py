from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import re
import textwrap


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "brand-pack"
SLUG = "IC_SPICY_Bullishness_Multichain_Strategy"

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


TITLE = "IC SPICY Bullishness and Multichain Strategy"
KICKER = "A mobile-first investor and operator memo for the RWA, social, and chain strategy."
AUDIENCE = "Prepared for IC SPICY founder strategy, partner conversations, and campaign planning."


BLOCKS = [
    Block(
        "Executive Verdict",
        [
            "IC SPICY is bullish, but the reason is not the usual crypto reason. The project is strongest as a real premium agriculture and food brand with an ICP-native trust layer. The peppers, nursery operations, NIMS inventory system, QR/NFC plant claims, weather provenance, and chef-built flavor narrative make the token and NFT layer feel earned instead of bolted on.",
            "Overall bullishness: 8.2 / 10 if execution stays food-first and proof-driven. The score drops if the brand leads with token speculation before physical product velocity, retail proof, audit readiness, and legal-reviewed claims are in place.",
            "The core thesis: IC SPICY can become a reference-class consumer RWA because normal buyers understand it in one scan. A plant, a pepper, a jar, a QR code, a lifecycle record, and a community. That is far more legible than tokenized private credit or a PDF-backed asset for mainstream audiences.",
            "The strategic warning: do not let multichain become identity confusion. ICP should remain the canonical operating system. Hedera, Bitcoin Ordinals, and Solana should extend credibility, prestige, and distribution only after the ICP core is clean.",
        ],
    ),
    Block(
        "Bullishness Scorecard",
        [
            "Product depth: 9 / 10. The app is already much more than a landing page: marketplace, NIMS, plant claims, NFC assignment, Weather Desk, SpicyAI, community, games, CookBook, Masterclass, admin ops, and multi-rail payment work.",
            "Narrative fit: 9 / 10. RWA, phygital, provenance, AI, weather, specialty agriculture, and premium food all converge in one understandable story.",
            "ICP technical fit: 8.5 / 10. ICP is unusually suited to this stack: certified assets, ICRC ledgers, Internet Identity, canister logic, HTTPS outcalls, ckBTC, reverse gas, and Chain Fusion paths.",
            "Market timing: 8 / 10. RWA is structurally hot, but most RWA projects are financial abstractions. IC SPICY has a tangible consumer product that can create content and repeat purchase outside crypto.",
            "Distribution readiness: 6.5 / 10. The brand pack is mature, but public social proof, retail sell-through, media assets, reviews, chef collaborations, and SKU proof still need to be built.",
            "Tokenomics readiness: 6 / 10. SPICY economics are thoughtful, but many pieces are still future-phase. Claims need legal review and public wording discipline.",
            "Social footprint: 5.5 / 10 from available public data. Official handles exist, but platforms blocked direct crawling. The strategy should assume the opportunity is underdeveloped, not saturated.",
            "Execution risk: 7 / 10 risk level. The main risks are scope breadth, solo-founder bandwidth, payment complexity, pre-LGE claims, certification wording, and the temptation to chase every chain at once.",
        ],
    ),
    Block(
        "What Makes The App Different",
        [
            "Most crypto RWA projects start with a token and then search for a believable asset. IC SPICY starts with soil, genetics, weather, plant inventory, and a founder story. That is the moat.",
            "NIMS is the hidden engine. It turns real nursery operations into structured lifecycle data: trays, cells, photos, plant stages, weather snapshots, claims, and ownership. This is more defensible than a static NFT drop.",
            "The NFC and QR flow is powerful because it makes crypto disappear. A customer scans a plant tag, lands on a plant page, sees provenance, and can claim membership or ownership. That is the right abstraction.",
            "Weather Desk and weather provenance create an unusually specific data story: Zone 10a Florida is not just branding, it becomes observable growing context.",
            "SpicyAI matters because it can be more than a chatbot. If grounded in the CookBook, Masterclass, NIMS records, weather brief, and cultivar data, it becomes a grower concierge and education layer.",
            "The product is media-rich by nature: peppers, heat reactions, farms, storms, chef demos, plant tags, QR scans, tropical weather, and rare cultivars. That gives the brand organic content fuel.",
        ],
    ),
    Block(
        "The Real Bull Case",
        [
            "The big upside is not simply selling NFTs. The big upside is building a premium heat brand that uses Web3 to prove origin, build membership, and create a community around rare peppers.",
            "A mainstream customer can buy a plant or seasoning because it tastes good and looks premium. A crypto-native customer can go deeper: NFT ownership, PepperHead membership, provenance, SPICY utility, and community governance.",
            "This dual-audience structure is rare. Most crypto products are too abstract for normal buyers. Most food brands have no on-chain proof layer. IC SPICY can speak both languages if the ordering is disciplined: flavor first, proof second, token third.",
            "The strongest investor framing is: a vertical RWA platform for living agricultural goods, beginning with rare peppers and expanding into plants, seasonings, education, memberships, and provenance infrastructure.",
            "The strongest consumer framing is: rare Florida peppers, chef-built flavor, and a scannable story behind the plant or jar.",
        ],
    ),
    Block(
        "The Bear Case To Respect",
        [
            "The product surface is broad. Marketplace, NIMS, AI, weather, NFTs, games, community, payments, tokenomics, and multichain can overwhelm the core job: sell great plants and seasonings with proof.",
            "The RWA narrative can become legally sensitive if public copy implies investment upside, guaranteed liquidity, asset-backed redemption, or certified claims that are not technically certified.",
            "Social proof is not yet the same as product proof. The brand needs visible customer reactions, grower credibility, chef validation, repeat purchase, local sales, demo conversion, reviews, and retail reorder data.",
            "Multichain can dilute the clean ICP security story. The existing docs correctly sell no bridges and single-chain authority as a strength. Any cross-chain expansion must not contradict that without a clear architecture.",
            "SPICY cannot carry the story before it is live and legally reviewed. Until then, the brand should lean on plants, PepperHeads, provenance, QR/NFC, Weather Desk, CookBook, and community.",
        ],
    ),
    Block(
        "Social Audit",
        [
            "Official social links found in the app: X @icspicyrwa, Instagram @icspicyrwa, TikTok @icspicyrwa, Facebook share link, and YouTube @ic-spicy from docs. Direct crawl limitations: X and TikTok returned 403, Instagram returned a login shell, and YouTube exposed only sparse public page text.",
            "Because the platforms were partially gated, the practical audit is based on official handles, indexed web results, the live site, public OISY dApp submission text, T3kNo-Logic merch copy, and the repo's brand pack.",
            "The positioning is strong but needs consistent public repetition: IC SPICY is a premium food/nursery brand with Web3 trust, not a crypto novelty. The phrase to keep repeating is farm-grown heat, chef-built flavor, blockchain-backed provenance.",
            "X should be the build-in-public and ICP credibility channel: architecture screenshots, deployment receipts, provenance demos, founder conviction, OISY/ICP ecosystem tags, and short threads on RWA that normal people can understand.",
            "Instagram should sell the product visually: pepper macros, plant tags, farm shots, chef plating, jar mockups, Reels showing scan-to-provenance, and founder face-to-camera.",
            "TikTok should be fast, messy, and repeatable: pepper reactions, transplant updates, tag programming, weather chaos, seedling time lapses, spice demo bites, and 'what this QR code proves' clips.",
            "Facebook should own local trust: Florida growers, farmers markets, plant availability, community groups, local press, FDACS nursery credibility, and event reminders.",
            "YouTube Shorts should become the archive of proof: 30-90 second chapters on each cultivar, each SKU, each NIMS feature, and each provenance moment.",
        ],
    ),
    Block(
        "Marketing Strategy",
        [
            "Positioning rule: food first, proof second, crypto third. For customers: 'rare Florida peppers and chef-built flavor.' For retail: 'premium heat with origin and QR storytelling.' For crypto: 'one of the clearest consumer RWA stories on ICP.'",
            "Content pillars: from tray to token, chef-built flavor, Zone 10a terroir, founder build-in-public, QR/NFC proof, PepperHead membership, weather and growing conditions, retail conquest, and multichain proof without bridge risk.",
            "Weekly cadence: three short videos, two X threads, one email, one proof post, and one direct sales or partnership touch. The brand pack already supports this cadence; the missing piece is consistent capture.",
            "Best recurring series: 'Plant of the Week,' 'Scan This Pot,' 'Heat Is Easy, Flavor Is Hard,' 'Zone 10a Weather Check,' 'Building IC SPICY Live,' 'PepperHead Briefing,' and 'From Tray To Table.'",
            "Conversion funnel: social clip -> mobile landing page -> email/drop signup -> plant or seasoning purchase -> NFC/QR scan -> claim/profile -> PepperHead or community membership -> repeat purchase.",
            "Retail funnel: local demos -> customer reactions -> sell-through sheet -> specialty account pitch -> reorder proof -> regional buyer outreach. Do not pitch national grocery before velocity proof.",
            "Partnership targets: OISY, DFINITY, ICPSwap, OHSHII, local chefs, Florida food creators, BBQ/grilling influencers, rare pepper reviewers, regenerative agriculture creators, and specialty grocers.",
        ],
    ),
    Block(
        "30 Day Plan",
        [
            "Week 1: publish the origin story. Pin one X post and one Instagram/TikTok intro explaining the brand in plain English. Capture founder face, farm, peppers, NIMS, and QR scan in the same week.",
            "Week 2: publish proof demos. Show a plant tag opening a live plant page. Show the iPhone NFC Tools workflow. Show a plant lifecycle record. Show weather context and why Florida climate matters.",
            "Week 3: publish flavor content. Demonstrate the first hero SKU concepts, tasting notes, chef-built logic, and food use cases. Avoid making heat a pain challenge.",
            "Week 4: publish community and partner asks. Run an X Space, invite ICP ecosystem partners, ask chefs/growers to test, and open a waitlist or limited plant drop.",
        ],
    ),
    Block(
        "60 Day Plan",
        [
            "Turn proof into routines: weekly plant scans, weekly cultivar education, weekly chef/flavor clip, weekly ICP build thread, and weekly email.",
            "Build the media kit: founder headshot, farm photos, pepper macros, product mockups, QR demo video, NIMS screenshot, Weather Desk screenshot, and a 60-second brand trailer.",
            "Create buyer proof assets: demo feedback sheet, product one-pager, first SKU line sheet, rough margin model, claims checklist, and retail-readiness gap list.",
            "Run partner outreach: OISY listing follow-up, ICP Spaces, local chefs, pepper reviewers, Florida food pages, farmers market organizers, and specialty shops.",
        ],
    ),
    Block(
        "90 Day Plan",
        [
            "Launch a proof-driven campaign: 'Every plant has a story.' Make the campaign about scanning tags and watching provenance grow over time.",
            "Run a limited drop tied to real inventory: a named plant lot, QR/NFC tags, weather snapshots, and buyer claim flow. Use scarcity from actual production limits, not fake hype.",
            "Package the first retail pilot: 3-4 SKU concepts, demo script, sell sheet, founder story, sample box, QR proof demo, and follow-up reorder tracking.",
            "Prepare multichain pilots only after the campaign has visible proof. The first cross-chain move should amplify a successful physical drop, not compensate for missing traction.",
        ],
    ),
    Block(
        "Truly Multichain Recommendation",
        [
            "Make ICP the canonical chain of record. It should remain the source for plant lifecycle, ownership mapping, admin actions, provenance composition, storefront logic, payments where possible, and SPICY tokenomics.",
            "Do not duplicate the entire ownership ledger across chains early. That creates reconciliation, customer support, legal, and security problems. Instead, export proofs and create chain-specific membership artifacts.",
            "Use a hub-and-spoke model: ICP core in the center; Hedera for supply-chain notarization; Bitcoin Ordinals for permanent prestige artifacts; Solana for liquidity, consumer wallet distribution, USDC/Solana Pay, and high-energy collector/community campaigns.",
            "A 'truly multichain' IC SPICY does not mean every plant NFT lives everywhere. It means every chain has a native reason to care while ICP preserves the authoritative plant story.",
        ],
    ),
    Block(
        "Hedera Strategy",
        [
            "Hedera is best for provenance credibility, not hype. Its supply-chain story fits IC SPICY because Hedera is known for low-cost, high-throughput, enterprise-friendly event notarization and traceability.",
            "Recommended use: mirror important lifecycle milestones as Hedera Consensus Service messages or HTS proof receipts: germinated, transplanted, tagged, sold, claimed, harvested, batch-created, shipped.",
            "Do not make Hedera the owner ledger at first. Use it as a public event receipt layer that points back to the canonical ICP plant record.",
            "Marketing angle: 'ICP runs the app and plant record; Hedera notarizes supply-chain milestones for external provenance audiences.'",
            "Risk: earlier repo decisions explicitly rejected Hedera bridges. This needs a formal architecture reversal if implemented. Keep language as planned or exploratory until live.",
        ],
    ),
    Block(
        "Bitcoin Ordinals Strategy",
        [
            "Bitcoin Ordinals should be used for prestige, permanence, and Bitcoin-native collector credibility. They should not be the operational plant ledger.",
            "Recommended use: limited inscriptions for genesis lots, founder PepperHeads, world-record cultivar attempts, master provenance manifests, or annual harvest archives.",
            "The artifact should be beautiful and permanent: image, lot manifest hash, ICP plant record URL, creator statement, and maybe a signed provenance claim. Keep data small and meaningful.",
            "For Bitcoin maxis, the pitch is not 'bridge into our app.' The pitch is 'the most important IC SPICY artifacts are permanently inscribed on Bitcoin, while the live plant system runs on ICP.'",
            "Risk: Ordinals are not ckBTC. ckBTC gives Bitcoin payment exposure on ICP; Ordinals give Bitcoin cultural legitimacy and permanence. Do not conflate them.",
        ],
    ),
    Block(
        "Solana Strategy",
        [
            "Solana is the liquidity and consumer distribution layer. It has strong RWA momentum, stablecoin/payment rails, Phantom distribution, Jupiter/Orca/Raydium liquidity culture, and high social velocity.",
            "Recommended use: Solana Pay or USDC checkout, Phantom wallet connection, SPL membership passes, campaign badges, and optional SOL-side community drops tied to IC SPICY physical releases.",
            "Do not move SPICY tokenomics to Solana unless there is a separate legal and liquidity plan. SPICY is designed as an ICRC-1/OHSHII/ICPSwap token in the current architecture.",
            "Best first Solana pilot: a limited 'Solana Supporter Pass' that gives community status and links to an ICP account, not a duplicate plant ownership NFT.",
            "Risk: Solana liquidity can create pressure to chase token price narratives. Keep Solana as distribution and checkout first, liquidity second.",
        ],
    ),
    Block(
        "ICP Chain Fusion Path",
        [
            "ICP Chain Fusion is the cleanest way to become multichain without bridge theater. Current IC docs describe canisters reading state, holding assets, and signing/submitting transactions on Bitcoin, Ethereum/EVM, Solana, and other chains through threshold signatures and RPC integrations.",
            "Threshold ECDSA fits Bitcoin and EVM chains. Threshold Schnorr fits Bitcoin Taproot and Ordinals. Threshold Ed25519 fits Solana and other Ed25519 chains. This gives IC SPICY a principled path to multichain actions from canisters.",
            "Use Chain Fusion for verification and automation over time: monitor external proof receipts, sign external transactions, query EVM/Solana state, and expose a unified multichain dashboard inside IC SPICY.",
            "Practical first step: design a chain_receipts side map in the future architecture that stores external chain, network, tx id, proof type, linked plant id, linked NFT id, timestamp, and verification status.",
        ],
    ),
    Block(
        "Multichain Roadmap",
        [
            "Phase 1 - Canonical ICP core: finish clean plant/NFT/claim/payment/provenance flows, clarify certified versus authoritative provenance, and publish a public verifier page.",
            "Phase 2 - Payment expansion: strengthen OISY/Plug and ck-token payments, then add Solana Pay as a front-end checkout rail if operationally justified.",
            "Phase 3 - Proof receipts: add external proof registry architecture. Start with non-custodial, non-ownership proof records before touching discounts or membership eligibility.",
            "Phase 4 - Hedera mirror: mirror selected lifecycle and batch events as notarized receipts that point back to ICP canonical records.",
            "Phase 5 - Ordinals prestige drop: inscribe a limited genesis or founder artifact set with hashes and URLs pointing to ICP records.",
            "Phase 6 - Solana community pass: launch a limited SPL or compressed NFT membership pass for Solana audiences, linked back to IC SPICY identity.",
            "Phase 7 - Unified dashboard: show a user their ICP NFTs, Hedera receipts, Ordinals artifacts, Solana passes, payment history, and plant claims in one account view.",
        ],
    ),
    Block(
        "Messaging Guardrails",
        [
            "Say: 'ICP is the canonical provenance and commerce layer.' Do not say every chain owns the same plant.",
            "Say: 'Hedera receipts can mirror supply-chain milestones.' Do not say Hedera provenance is live until deployed.",
            "Say: 'Bitcoin Ordinals can preserve important IC SPICY artifacts permanently.' Do not say ckBTC equals Ordinals.",
            "Say: 'Solana can extend checkout, community, and liquidity reach.' Do not say SPICY is a Solana token unless architecture and legal review change.",
            "Say: 'weather and lifecycle data are on-chain and queryable.' Be careful with 'certified' unless referring specifically to certified ownership/static metadata.",
            "Avoid guaranteed upside, passive income, investment returns, fake scarcity, medical claims, and claims that imply regulatory approval.",
        ],
    ),
    Block(
        "Source Notes",
        [
            "Repo sources reviewed: PROJECT_CONTEXT.md, AGENTS.md, docs/WHITEPAPER.md, docs/PITCH_DECK.md, docs/brand-pack, docs/SOCIAL_POSTS.md, DESIGN.md, frontend/backend modules for payments, NIMS, plant claims, NFTs, wallet, weather, and social links.",
            "Public sources reviewed: https://www.icspicy.app, OISY dApp submission issue, T3kNo-Logic IC SPICY collection, IC Chain Fusion docs, IC skills for EVM RPC, ckBTC, ICRC ledger, wallet integration, and multi-canister design.",
            "Market sources reviewed through web search/fetch: Hedera supply-chain tokenization docs, Solana ecosystem RWA update, Bitcoin Ordinals provenance references, and 2026 RWA market commentary.",
            "Social crawl limitation: direct platform crawling was incomplete because X/TikTok blocked fetches, Instagram returned a login page, and YouTube exposed only sparse public text. Recommendations therefore focus on strategy, positioning, and observable indexed/public data.",
            "This document is strategic marketing material, not legal, tax, investment, or securities advice. Token, RWA, food-safety, and retail claims should be reviewed by qualified counsel before publication.",
        ],
    ),
]


def strip_md(text: str) -> str:
    text = re.sub(r"\*\*(.*?)\*\*", r"\1", text)
    text = re.sub(r"\*(.*?)\*", r"\1", text)
    text = text.replace("->", "->")
    return text


def esc_pdf(text: str) -> str:
    return text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def wrap(text: str, width: int) -> list[str]:
    return textwrap.wrap(strip_md(text), width=width, break_long_words=False, replace_whitespace=True)


class MobilePdf:
    def __init__(self, title: str):
        # Tall/narrow geometry reads well on phones while remaining valid PDF points.
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
        safe = esc_pdf(strip_md(text))
        self.cmd(f"BT /{font} {size:.1f} Tf {x:.1f} {y:.1f} Td ({safe}) Tj ET")

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
        self.text("IC SPICY - farm-grown heat, chef-built flavor, provenance.", 22, 22, 7, "F1", BRAND["muted"])
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
            self.text(line, 42, 548 - i * 25, 20, "F2", BRAND["gold"])
        base = 456
        for i, line in enumerate(wrap(KICKER, 42)):
            self.text(line, 42, base - i * 16, 10.5, "F1", BRAND["cream"])
        for i, line in enumerate(wrap(AUDIENCE, 48)):
            self.text(line, 42, 374 - i * 13, 8.5, "F1", BRAND["muted"])
        self.text(BRAND["subtitle"], 42, 252, 8.8, "F1", BRAND["orange"])
        self.text("Prepared August 2026", 42, 226, 8, "F1", BRAND["muted"])
        self.text("Draft strategy material; legal review required before public token claims.", 42, 211, 7.2, "F1", BRAND["muted"])
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
    lines = [
        f"# {TITLE}",
        "",
        f"**{KICKER}**",
        "",
        f"*{AUDIENCE}*",
        "",
        "> IC SPICY branding: dark luxury agriculture, fire-red accents, gold highlights, and the tagline \"Rare. Hot. Alive.\"",
        "",
        "> Draft strategy material. Legal review required before public token, investment, food-safety, or RWA claims.",
        "",
        "---",
        "",
    ]
    for block in BLOCKS:
        lines.append(f"## {block.title}")
        lines.append("")
        for para in block.body:
            if para.startswith(("Week ", "Phase ", "Recommended use:", "Best first", "Risk:", "Say:", "Avoid ")):
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
            if para.startswith(("Week ", "Phase ", "Recommended use:", "Best first", "Risk:", "Say:", "Avoid ")):
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
