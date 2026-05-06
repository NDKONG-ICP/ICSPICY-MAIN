from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import re
import textwrap


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "brand-pack"


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


@dataclass
class Doc:
    filename: str
    title: str
    kicker: str
    audience: str
    sections: list[tuple[str, list[str]]]


DOCS: list[Doc] = [
    Doc(
        filename="IC_SPICY_Branded_Whitepaper",
        title="IC SPICY Branded Whitepaper",
        kicker="Real chili peppers. Real provenance. On chain.",
        audience="For partners, strategic backers, premium food buyers, and ICP ecosystem audiences.",
        sections=[
            (
                "Executive Thesis",
                [
                    "IC SPICY is a real-world-asset commerce and provenance platform for a Florida rare-pepper nursery. The finished product combines a direct-to-consumer plant and spice business, an on-chain nursery inventory system, ICRC-7 NFTs, weather provenance, premium community, and future SPICY token utility on the Internet Computer.",
                    "The brand story should lead with agriculture and flavor: 30 years of Zone 10a Southwest Florida growing experience, rare chili genetics, regenerative KNF/JADAM practice, and artisan seasoning blends designed with luxury fine-dining discipline. ICP is the proof layer, not the first sentence for grocery customers.",
                    "The commercial ambition is simple: build the premium heat brand that belongs on specialty shelves first, regional grocery shelves next, and eventually national grocery shelves beside incumbents like McCormick and challengers like Kinder's.",
                ],
            ),
            (
                "Problem",
                [
                    "Commodity spice shelves are crowded with familiar but anonymous products. Most shoppers cannot identify where the peppers came from, when they were harvested, who grew them, or why one blend deserves a premium price.",
                    "At the same time, Web3 RWA products often lack a physical product people can taste, gift, reorder, and talk about at dinner. IC SPICY solves both sides: physical peppers and seasoning products with digital provenance, membership, and community layered in.",
                ],
            ),
            (
                "Solution",
                [
                    "IC SPICY creates a farm-to-flame product stack. The nursery grows rare peppers and plants. NIMS tracks trays, cells, transplants, photos, and weather records. The storefront sells plants, spices, and membership NFTs. ICRC-7 NFTs carry ownership and provenance. QR flows connect physical products to digital records.",
                    "For normal customers, this feels like a premium pepper nursery and artisan spice brand. For crypto-native users, it is an ICP-native RWA system with certified assets, Internet Identity login, wallet signer payments, ICRC standards, and canister-resident business logic.",
                ],
            ),
            (
                "Brand Positioning",
                [
                    "Position IC SPICY as luxury heat, not novelty heat. The line should promise balanced, chef-built flavor from real peppers rather than pain-for-clicks spice gimmicks.",
                    "Core language: farm-grown heat, chef-built flavor, traceable origin, rare Florida peppers, living provenance, luxury pantry fire.",
                    "Tagline: Rare. Hot. Alive.",
                ],
            ),
            (
                "Product Pillars",
                [
                    "Rare plants: seedlings, 1-gallon plants, 5-gallon mature plants, and garden inputs sourced from real nursery operations.",
                    "Artisan seasonings: chef-designed blends using IC SPICY-grown peppers, smoked salts, citrus, garlic, and global heat profiles.",
                    "PepperHead membership: 888 NFTs inside the 8888-token collection with discounts, whitelist access, and premium future utility.",
                    "NIMS provenance: plant lifecycle, photos, QR claims, weather snapshots, and owner-controlled privacy.",
                    "SpicyAI: a future zero-log assistant for KNF, JADAM, pepper cultivation, recipes, and Florida growing conditions.",
                ],
            ),
            (
                "Why ICP",
                [
                    "ICP allows the dapp to host a frontend, certified NFT assets, Motoko canister logic, HTTPS outcalls, Internet Identity, ICRC ledgers, and self-custody wallet integrations on one chain.",
                    "The strategic benefit is not speculative language; it is operational proof. Customers can scan, verify, claim, and interact with a real product story that lives beyond the label.",
                ],
            ),
            (
                "Go-To-Market Summary",
                [
                    "Phase one should prioritize DTC and local credibility: farmers markets, chef tastings, pepper community drops, short-form grow content, and early PepperHead collectors.",
                    "Phase two should build retail proof: top three to four seasoning SKUs, sell-through data, reorder rates, demo feedback, and regional specialty accounts.",
                    "Phase three should attack grocery distribution with velocity data, clean unit economics, trade-spend planning, broker relationships, and a disciplined SKU count.",
                ],
            ),
        ],
    ),
    Doc(
        filename="IC_SPICY_Roadmap",
        title="IC SPICY Roadmap",
        kicker="From rare pepper nursery to premium grocery-shelf heat brand.",
        audience="For internal execution, partners, advisors, and launch planning.",
        sections=[
            (
                "North Star",
                [
                    "IC SPICY ships as a real business first: rare plants, premium spices, verified provenance, and community. The Web3 layer strengthens trust, membership, and transparency without confusing mainstream customers.",
                    "The finished product is a premium food and agriculture brand with on-chain infrastructure: storefront, plant records, NFT membership, weather provenance, wallet payments, SPICY utility, and future AI assistance.",
                ],
            ),
            (
                "Technical Roadmap",
                [
                    "Phase 3: finish ICRC-7 core, initialize the 8888-token pool, implement transfers, approvals, certified metadata, and local smoke tests.",
                    "Phase 4: replace simulated wallet/payment flows with Stripe, ICPay, wallet signer, ICRC-2 settlement, PepperHead purchases, and server-side discount enforcement.",
                    "Phase 5: add ckBTC deposit, sweep, and withdrawal logic with proper subaccount handling.",
                    "Phase 5.5: add weather provenance through grouped Open-Meteo outcalls, backfills, claim-time privacy, and lifecycle snapshots.",
                    "Phase 6: extract marketplace, treasury, community, NIMS, and AI concerns into dedicated canisters while preserving the backend as the permanent NFT ledger.",
                    "Phase 6.5: launch SpicyAI with zero-log policy and tiered usage based on identity, NFT ownership, PepperHead status, and SPICY balance bonus.",
                    "Phase 7: audit, polish, legal review, privacy policy, terms, runbooks, monitoring, and production launch.",
                    "Phase 8: OHSHII LGE, SPICY ledger, treasury structure, buybacks, burns, and public transparency dashboard.",
                ],
            ),
            (
                "Brand Roadmap",
                [
                    "Stage 1: establish founder authority through grow videos, chef blend development, Florida nursery credibility, and early community content.",
                    "Stage 2: launch the first seasoning line with four hero SKUs and collect customer feedback, UGC, repeat purchase data, and food photos.",
                    "Stage 3: build retail assets: sell sheet, wholesale pricing, UPCs, case packs, labels, nutrition/ingredient panels, insurance, and production SOPs.",
                    "Stage 4: enter specialty stores and local/regional accounts before pursuing larger grocery chains.",
                    "Stage 5: use retail velocity, demo performance, reorder data, and community proof to approach larger distributors and chains.",
                ],
            ),
            (
                "First 12 Months",
                [
                    "Month 1-2: finish technical NFT and provenance foundation; finalize brand identity and packaging direction.",
                    "Month 3-4: pilot seasoning batches with chef tasting notes, content capture, and limited DTC release.",
                    "Month 5-6: launch PepperHead membership and provenance storytelling; begin farmers-market and chef-collab demos.",
                    "Month 7-9: formalize wholesale line, pitch local specialty grocers, and collect sell-through data.",
                    "Month 10-12: expand regional retail, publish transparency updates, and prepare national-buyer materials.",
                ],
            ),
        ],
    ),
    Doc(
        filename="IC_SPICY_Pitch_Deck",
        title="IC SPICY Pitch Deck",
        kicker="A 12-slide narrative for partners, buyers, and strategic backers.",
        audience="Use this as speaker-ready deck copy for Keynote, Pitch, Canva, or investor calls.",
        sections=[
            ("Slide 1 - Title", ["IC SPICY. Rare. Hot. Alive. Farm-grown heat, chef-built flavor, blockchain-backed provenance."]),
            ("Slide 2 - The Problem", ["Seasoning shelves are full of anonymous commodity blends. Premium buyers want origin, craft, bold flavor, and trust. Web3 RWAs need real products people can taste and reorder."]),
            ("Slide 3 - The Insight", ["A living plant can have a digital history as rich as a collectible. A spice jar can carry a story deeper than a label."]),
            ("Slide 4 - The Product", ["Rare pepper plants, artisan spice blends, NIMS plant tracking, QR claims, ICRC-7 NFTs, PepperHead membership, community, recipes, and future SpicyAI."]),
            ("Slide 5 - Why Now", ["Premium seasonings, bold heat, global flavors, clean-label products, and chef-inspired pantry upgrades are all growing. Kinder's proved challengers can take shelf share. McCormick's own flavor forecast validates chili-forward global flavor trends."]),
            ("Slide 6 - Why IC SPICY Wins", ["Real Florida nursery operations. 30 years of Zone 10a growing experience. Chef-designed flavor. Digital provenance. ICP-native infrastructure. Community-owned energy without hiding behind crypto jargon."]),
            ("Slide 7 - First SKU Line", ["Zone 10a Fire Salt, Reaper Reserve, Smoked Datil Citrus, and Chef's Charred Garlic Pepper. Four SKUs: one everyday, one extreme, one Florida-signature, one mass-market grill competitor."]),
            ("Slide 8 - NFT and Membership Layer", ["8888 NFTs, 888 PepperHeads, discount tiers, whitelist access, premium AI tier, and future provenance-linked product experiences."]),
            ("Slide 9 - Business Model", ["DTC plant sales, artisan spice sales, membership NFTs, marketplace fees, premium drops, future SPICY utility, chef collaborations, and retail distribution."]),
            ("Slide 10 - Go-To-Market", ["Start with DTC and local proof. Build content and community. Prove sell-through in specialty retail. Approach regional grocery with velocity data. Scale only the strongest SKUs."]),
            ("Slide 11 - Founder Advantage", ["Owner-operator credibility: luxury fine dining perspective, ACF award-winning chef input, 30 years growing experience, rare pepper genetics, and hands-on solo-builder execution."]),
            ("Slide 12 - The Ask", ["Follow, taste, partner, stock, collect, and help turn a Florida pepper nursery into the next great premium heat brand."]),
        ],
    ),
    Doc(
        filename="IC_SPICY_Marketing_Strategy",
        title="IC SPICY Marketing Strategy",
        kicker="Professional enough for buyers. Casual enough for X.",
        audience="For solo-founder execution across social, DTC, retail, and community channels.",
        sections=[
            (
                "Positioning",
                [
                    "IC SPICY should be marketed as a premium food brand with a Web3 trust layer. The mainstream headline is not NFTs. The mainstream headline is rare Florida peppers turned into chef-built seasonings with traceable origin.",
                    "Primary phrase: farm-grown heat, chef-built flavor. Secondary phrase: blockchain-backed provenance. Use the second phrase only after the audience understands the physical product.",
                ],
            ),
            (
                "Audience Segments",
                [
                    "Pepper heads: care about rare cultivars, heat levels, grow methods, and authenticity.",
                    "Home cooks and grillers: want easy flavor upgrades that beat boring grocery blends.",
                    "Foodies and chefs: want origin, ingredient quality, balance, and culinary storytelling.",
                    "ICP/Web3 users: want a real RWA case study with NFTs, provenance, and token utility.",
                    "Retail buyers: want clean unit economics, tight SKU count, velocity proof, and margin.",
                ],
            ),
            (
                "Core Channels",
                [
                    "X: build-in-public, ICP threads, market takes, founder story, launch updates.",
                    "Instagram: product photography, grow shots, recipe reels, chef plating, farm visuals.",
                    "TikTok: short grow updates, pepper reactions, seasoning demos, behind-the-scenes blending.",
                    "Facebook: local Florida buyers, pepper groups, farmers-market updates, community trust.",
                    "Email: drop calendar, limited batches, recipes, PepperHead updates, retail milestones.",
                    "In-person: farmers markets, chef pop-ups, tastings, grocery demos, local press.",
                ],
            ),
            (
                "Content Pillars",
                [
                    "From tray to token: lifecycle and provenance storytelling.",
                    "Chef-built blends: tasting notes, pairings, technique, plating, and recipe applications.",
                    "Florida terroir: Zone 10a heat, sun, rain, humidity, and rare pepper adaptation.",
                    "Founder journey: solo developer, grower, chef network, and real build progress.",
                    "Retail conquest: transparent journey from DTC to specialty shelves to grocery chains.",
                ],
            ),
            (
                "Weekly Solo-Founder Cadence",
                [
                    "Three short videos per week: grow update, cooking demo, packaging/product update.",
                    "Two X threads per week: one ICP/build thread, one food/market/brand thread.",
                    "One email per week: drop, story, recipe, or behind-the-scenes note.",
                    "One live touchpoint per month: X Space, tasting, farmers market, or AMA.",
                    "One retail progress update per month: new account, sell-through, demo, or buyer conversation.",
                ],
            ),
            (
                "Retail Strategy",
                [
                    "Do not approach national grocery first. Build DTC demand, local proof, specialty retail sell-through, and reorder data.",
                    "Launch with three to four hero SKUs. Buyers dislike unfocused founders with twelve unproven blends.",
                    "Track units per store per week, repeat purchase, demo conversion, customer reviews, gross margin, case pack economics, and production capacity.",
                    "Use a premium sell sheet that explains the founder, the chef angle, the farm source, and the reason the product deserves shelf space.",
                ],
            ),
        ],
    ),
    Doc(
        filename="IC_SPICY_Market_Analysis",
        title="IC SPICY Market Analysis",
        kicker="Why premium heat has room for a Florida-grown challenger.",
        audience="For strategic planning, retail pitches, and investor conversations.",
        sections=[
            (
                "Category Size",
                [
                    "Public market estimates vary, but the global spices and seasonings market is commonly estimated around the high-twenties to low-thirties billions of dollars in 2025, with mid-single-digit growth projected through the next decade.",
                    "The U.S. market is mature but still attractive because premiumization, clean-label demand, global flavors, grilling culture, and hot/spicy products create room for challengers with stronger stories than commodity jars.",
                ],
            ),
            (
                "Trend Support",
                [
                    "McCormick's 2025 Flavor Forecast naming Aji Amarillo as flavor of the year validates chili-forward, fruit-forward, global heat profiles.",
                    "Specialty Food Association trend language supports flavor boosters, chef-inspired pantry upgrades, global convenience, sauces, seasonings, marinades, and bold flavors.",
                    "Spiceology's 2025 trend framing around swicy, big and bold, smoke, char, and modern nostalgia aligns with IC SPICY's potential product line.",
                    "Premium spice brands such as Burlap & Barrel and La Boite prove that origin, chef credibility, direct sourcing, and elevated storytelling can command attention beyond commodity spice pricing.",
                ],
            ),
            (
                "Competitive Set",
                [
                    "McCormick: massive trust, distribution, brand recall, category management, and retail leverage. Weakness: mainstream, corporate, less founder-led, less rare-pepper romance.",
                    "Kinder's: modern, approachable, grill-friendly, fast-growing, strong retail presence. Weakness: not farm-origin, not rare-pepper-native, not provenance-led.",
                    "Burlap & Barrel: premium origin and direct trade. Weakness: less focused on hot-pepper culture and grocery-grill crossover.",
                    "Spiceology: chef-forward innovation. Weakness: less tied to a single grower/farm mythology.",
                    "IC SPICY: can own the intersection of rare peppers, Florida terroir, chef-built heat, and digital provenance.",
                ],
            ),
            (
                "Opportunity",
                [
                    "The opening is not to copy McCormick's shelf. The opening is to make a high-conviction premium heat brand that customers remember, gift, post, scan, and reorder.",
                    "DTC and specialty retail are the proof grounds. Regional grocery is the scaling bridge. National grocery comes after velocity, supply reliability, margins, compliance, packaging, and buyer relationships are proven.",
                ],
            ),
            (
                "Risks",
                [
                    "Retail slotting and trade spend can drain cash if pursued too early.",
                    "Too many SKUs can dilute focus and complicate production.",
                    "Overleading with crypto can confuse mainstream food buyers.",
                    "Heat without culinary balance becomes novelty, not repeat purchase.",
                    "Founder capacity is a real constraint, so the strategy must favor repeatable content and disciplined SKU focus.",
                ],
            ),
            (
                "Sources Consulted",
                [
                    "McCormick 2025 Flavor Forecast; Specialty Food Association 2025 trends; Spiceology 2025 trend report; Burlap & Barrel brand positioning; public search summaries for McCormick annual reporting, Kinder's retail growth, and seasoning market-size reports from Grand View, Mordor, Expert Market Research, Fact.MR, and related publishers.",
                    "Market figures from public snippets should be treated as directional until replaced with paid syndicated data such as NIQ, SPINS, Circana, or retailer scan data.",
                ],
            ),
        ],
    ),
    Doc(
        filename="IC_SPICY_Marketing_Scripts",
        title="IC SPICY Marketing Scripts",
        kicker="Shill hard. Sound real. Stay professional.",
        audience="For videos, demos, buyer calls, and casual community promotion.",
        sections=[
            (
                "90-Second Hero Script",
                [
                    "Most seasoning brands start in a boardroom. IC SPICY starts in the soil.",
                    "In Zone 10a Southwest Florida, we grow rare chili peppers under real sun, real weather, and real pressure. These are not anonymous commodity peppers blended into another generic shaker. These are living plants with a story.",
                    "Every seedling, every transplant, every harvest, and every batch begins with grower discipline built over 30 years.",
                    "Then the flavor goes into the hands of culinary craft: artisan spice blends designed with the mindset of luxury fine dining and an ACF award-winning chef. The goal is not just heat. Heat is easy. The goal is balance, depth, smoke, fruit, salt, acid, aroma, and finish.",
                    "This is where rare peppers become pantry weapons.",
                    "IC SPICY is building the next generation of seasonings: farm-grown, chef-built, digitally transparent. From plants to peppers, from peppers to blends, from blends to your table.",
                    "McCormick made spices mainstream. Kinder's made seasoning fun. IC SPICY is here to make heat collectible, traceable, and unforgettable.",
                    "Rare. Hot. Alive. Welcome to IC SPICY.",
                ],
            ),
            (
                "30-Second Casual Script",
                [
                    "IC SPICY is a rare pepper nursery in Southwest Florida turning real peppers into chef-designed artisan seasonings and on-chain provenance products. Think farm-grown heat, luxury flavor, and QR-backed origin instead of another anonymous grocery-store spice jar. We are building for pepper heads, cooks, chefs, and anyone who wants a seasoning brand with a real story behind it.",
                ],
            ),
            (
                "Retail Buyer Script",
                [
                    "IC SPICY gives your shelf a premium heat brand with a real origin story. The line is built around rare peppers grown in Zone 10a Southwest Florida, chef-designed flavor profiles, clean premium positioning, and QR-enabled provenance storytelling.",
                    "It speaks to three fast-moving shoppers: grilling enthusiasts, global flavor explorers, and younger consumers looking for bold, authentic, traceable products.",
                    "We would launch with a disciplined three-to-four-SKU set, support it with social content, demos, QR education, and velocity-focused promotions. The goal is not to flood the shelf. The goal is to prove turns, reorders, and shopper excitement.",
                ],
            ),
            (
                "X / Community Shill",
                [
                    "IC SPICY is what happens when a rare pepper nursery, 30 years of Zone 10a growing experience, chef-built seasoning blends, and ICP provenance all collide.",
                    "We are not making another random spice jar. We are building a farm-to-flame brand that can live online, in kitchens, at farmers markets, and eventually on grocery shelves next to the giants.",
                ],
            ),
            (
                "Founder Intro",
                [
                    "I am building IC SPICY because I believe the next great seasoning brand should come from the grower, not the boardroom. I want customers to taste rare peppers, understand where they came from, and feel the difference between commodity heat and intentional flavor.",
                ],
            ),
            (
                "McCormick / Kinder's Comparison",
                [
                    "Respect to McCormick: they built the category. Respect to Kinder's: they proved modern seasoning brands can move fast. IC SPICY is coming from a different angle. We are smaller, sharper, more origin-driven, more chef-led, and built around rare peppers people can actually trace.",
                ],
            ),
        ],
    ),
    Doc(
        filename="IC_SPICY_X_Spaces_Script",
        title="IC SPICY X Spaces Script",
        kicker="A one-hour room for casual conviction and professional credibility.",
        audience="For founder-hosted X Spaces, AMAs, and ICP community rooms.",
        sections=[
            (
                "Room Title",
                [
                    "Can a Florida Pepper Nursery Outshine Big Seasoning?",
                    "Subtitle: rare peppers, chef-built flavor, ICP provenance, and the mission to take IC SPICY from farm trays to grocery shelves.",
                ],
            ),
            (
                "0:00-3:00 - Welcome",
                [
                    "Appreciate everyone pulling up. Tonight I am talking IC SPICY: rare peppers, chef-designed artisan seasonings, ICP provenance, and the mission to build a seasoning brand that can stand next to McCormick and Kinder's without blinking.",
                    "This room is casual, but the mission is serious. We are talking food, farming, flavor, retail, and blockchain as a proof layer.",
                ],
            ),
            (
                "3:00-8:00 - Founder Story",
                [
                    "Talk about the 30 years of growing experience, Zone 10a Southwest Florida, FDACS nursery credibility, rare pepper genetics, and why heat became a personal obsession.",
                    "Explain the chef angle: luxury fine dining mindset, ACF award-winning chef influence, and the idea that heat should be balanced, not just painful.",
                ],
            ),
            (
                "8:00-15:00 - Market Setup",
                [
                    "Spices and seasonings are a massive global category. Premium, bold, spicy, smoked, swicy, clean-label, and global flavors are all trending.",
                    "McCormick naming Aji Amarillo flavor of the year validates the chili-forward direction. Kinder's proves that a modern seasoning brand can capture grocery attention quickly.",
                    "The opportunity is to bring origin, chef craft, and digital proof to a category that still has too many anonymous jars.",
                ],
            ),
            (
                "15:00-25:00 - Product Vision",
                [
                    "Explain the full stack: seedlings, plants, spices, salts, PepperHead NFTs, QR provenance, weather/lifecycle history, community, CookBook, and future SpicyAI.",
                    "Keep repeating the plain-English value: this is a real food brand with technology that proves the story.",
                ],
            ),
            (
                "25:00-35:00 - Why ICP",
                [
                    "ICP lets the project host the app, assets, identity, wallet flows, NFTs, provenance records, and canister logic on-chain.",
                    "Do not over-technicalize. Say: the chain helps us make claims verifiable instead of asking customers to just trust a label.",
                ],
            ),
            (
                "35:00-45:00 - The Big Ambition",
                [
                    "Say the bold part clearly: McCormick owns legacy. Kinder's owns modern mass-market seasoning energy. IC SPICY is going after luxury heat: chef-built flavor from real peppers with proof behind the plant.",
                    "Acknowledge the climb: national grocery shelves require retail proof, margins, compliance, packaging, production, and velocity. The strategy is DTC first, specialty retail second, regional grocery third, national after proof.",
                ],
            ),
            (
                "45:00-55:00 - Q&A Prompts",
                [
                    "What flavors would you want first?",
                    "Would you scan a QR code on a spice jar to see where the peppers came from?",
                    "What makes you trust a premium seasoning brand?",
                    "Would you rather buy plants, spices, or membership first?",
                    "What would make you replace your current seasoning brand?",
                ],
            ),
            (
                "55:00-60:00 - Close",
                [
                    "If you want early access, follow IC SPICY, share the room, and watch the build. This starts with rare peppers in Florida, but the goal is grocery shelves everywhere.",
                    "Rare. Hot. Alive.",
                ],
            ),
        ],
    ),
]


def esc_pdf(text: str) -> str:
    return text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def strip_md(text: str) -> str:
    text = re.sub(r"\*\*(.*?)\*\*", r"\1", text)
    text = re.sub(r"\*(.*?)\*", r"\1", text)
    text = text.replace("—", "-").replace("–", "-").replace("·", "-")
    text = text.replace("≥", ">=").replace("→", "->").replace("🔥", "")
    text = text.replace("🌶️", "").replace("🌶", "")
    return text


def wrap(text: str, width: int) -> list[str]:
    return textwrap.wrap(strip_md(text), width=width, break_long_words=False, replace_whitespace=True)


class PdfDoc:
    def __init__(self, title: str):
        self.title = title
        self.pages: list[list[str]] = []
        self.current: list[str] = []
        self.w = 612
        self.h = 792
        self.y = 730
        self.page_no = 0
        self.new_page(cover=False)

    def cmd(self, command: str) -> None:
        self.current.append(command)

    def color(self, rgb: tuple[float, float, float], stroke: bool = False) -> None:
        op = "RG" if stroke else "rg"
        self.cmd(f"{rgb[0]:.3f} {rgb[1]:.3f} {rgb[2]:.3f} {op}")

    def rect(self, x: float, y: float, w: float, h: float, fill: bool = True) -> None:
        self.cmd(f"{x:.1f} {y:.1f} {w:.1f} {h:.1f} re {'f' if fill else 'S'}")

    def line(self, x1: float, y1: float, x2: float, y2: float) -> None:
        self.cmd(f"{x1:.1f} {y1:.1f} m {x2:.1f} {y2:.1f} l S")

    def text(self, text: str, x: float, y: float, size: int = 11, font: str = "F1", rgb=None) -> None:
        if rgb:
            self.color(rgb)
        self.cmd(f"BT /{font} {size} Tf {x:.1f} {y:.1f} Td ({esc_pdf(strip_md(text))}) Tj ET")

    def new_page(self, cover: bool = False) -> None:
        if self.current:
            self.add_footer()
            self.pages.append(self.current)
        self.current = []
        self.page_no += 1
        self.color(BRAND["dark"])
        self.rect(0, 0, self.w, self.h)
        self.color(BRAND["fire"])
        self.rect(0, self.h - 10, self.w, 10)
        self.color(BRAND["charcoal"])
        self.rect(0, self.h - 78, self.w, 68)
        self.text(BRAND["name"], 48, self.h - 44, 15, "F2", BRAND["cream"])
        self.text(BRAND["tagline"], 48, self.h - 64, 9, "F1", BRAND["gold"])
        if not cover:
            self.text(self.title, 300, self.h - 48, 10, "F1", BRAND["muted"])
        self.y = 690

    def add_footer(self) -> None:
        self.color(BRAND["gold"], stroke=True)
        self.line(48, 42, 564, 42)
        self.text("IC SPICY - Farm-grown heat. Chef-built flavor. Blockchain-backed provenance.", 48, 25, 8, "F1", BRAND["muted"])
        self.text(str(self.page_no), 548, 25, 8, "F1", BRAND["muted"])

    def ensure(self, needed: int) -> None:
        if self.y - needed < 70:
            self.new_page()

    def cover(self, doc: Doc) -> None:
        self.new_page(cover=True)
        self.color(BRAND["card"])
        self.rect(48, 190, 516, 410)
        self.color(BRAND["fire"])
        self.rect(48, 190, 8, 410)
        self.text("IC SPICY", 84, 545, 30, "F2", BRAND["cream"])
        self.text(doc.title, 84, 500, 24, "F2", BRAND["gold"])
        for i, line in enumerate(wrap(doc.kicker, 58)):
            self.text(line, 84, 460 - i * 18, 13, "F1", BRAND["cream"])
        for i, line in enumerate(wrap(doc.audience, 70)):
            self.text(line, 84, 380 - i * 15, 10, "F1", BRAND["muted"])
        self.text(BRAND["subtitle"], 84, 245, 11, "F1", BRAND["orange"])
        self.text("Prepared May 2026 - Draft marketing material; legal review required before public token claims.", 84, 222, 8, "F1", BRAND["muted"])
        self.new_page()

    def h1(self, text: str) -> None:
        self.ensure(48)
        self.color(BRAND["fire"])
        self.rect(48, self.y - 7, 5, 25)
        self.text(text, 64, self.y, 17, "F2", BRAND["gold"])
        self.y -= 34

    def paragraph(self, text: str) -> None:
        lines = wrap(text, 92)
        self.ensure(16 * len(lines) + 12)
        for line in lines:
            self.text(line, 64, self.y, 10, "F1", BRAND["cream"])
            self.y -= 14
        self.y -= 7

    def bullet(self, text: str) -> None:
        lines = wrap(text, 86)
        self.ensure(15 * len(lines) + 8)
        self.text("-", 70, self.y, 10, "F2", BRAND["fire"])
        self.text(lines[0], 86, self.y, 10, "F1", BRAND["cream"])
        self.y -= 14
        for line in lines[1:]:
            self.text(line, 86, self.y, 10, "F1", BRAND["cream"])
            self.y -= 14
        self.y -= 4

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
            objects.append(f"<< /Length {len(stream.encode('latin-1', errors='replace'))} >>\nstream\n{stream}\nendstream")
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


def markdown_for(doc: Doc) -> str:
    lines = [
        f"# {doc.title}",
        "",
        f"**{doc.kicker}**",
        "",
        f"*{doc.audience}*",
        "",
        "> IC SPICY branding: dark luxury agriculture, fire-red accents, gold highlights, and the tagline \"Rare. Hot. Alive.\"",
        "",
        "> Draft marketing material. Legal review required before public token, investment, or regulatory claims.",
        "",
        "---",
        "",
    ]
    for heading, paras in doc.sections:
        lines.append(f"## {heading}")
        lines.append("")
        for para in paras:
            if para.startswith("Phase ") or para.startswith("Stage ") or para.startswith("Month ") or para.startswith("Slide ") or para.startswith("What ") or para.startswith("Would "):
                lines.append(f"- {para}")
            else:
                lines.append(para)
            lines.append("")
    return "\n".join(lines).rstrip() + "\n"


def render_pdf(doc: Doc, path: Path) -> None:
    pdf = PdfDoc(doc.title)
    pdf.cover(doc)
    for heading, paras in doc.sections:
        pdf.h1(heading)
        for para in paras:
            if (
                para.startswith("Phase ")
                or para.startswith("Stage ")
                or para.startswith("Month ")
                or para.startswith("Slide ")
                or para.startswith("What ")
                or para.startswith("Would ")
            ):
                pdf.bullet(para)
            else:
                pdf.paragraph(para)
    pdf.save(path)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for doc in DOCS:
        (OUT / f"{doc.filename}.md").write_text(markdown_for(doc), encoding="utf-8")
        render_pdf(doc, OUT / f"{doc.filename}.pdf")
    index = [
        "# IC SPICY Brand Pack",
        "",
        "Generated branded source documents and PDFs for whitepaper, roadmap, pitch deck, marketing strategy, market analysis, scripts, and X Spaces.",
        "",
    ]
    for doc in DOCS:
        index.append(f"- [{doc.title}]({doc.filename}.md) / `{doc.filename}.pdf`")
    (OUT / "README.md").write_text("\n".join(index) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
