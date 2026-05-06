from __future__ import annotations

from pathlib import Path
import runpy
import zipfile


ROOT = Path(__file__).resolve().parents[1]
BASE = runpy.run_path(str(ROOT / "scripts" / "generate-brand-pack.py"))
Doc = BASE["Doc"]
markdown_for = BASE["markdown_for"]
render_pdf = BASE["render_pdf"]

OUT = ROOT / "docs" / "brand-pack" / "expanded-library"


def doc(filename: str, title: str, kicker: str, audience: str, sections):
    return Doc(filename=filename, title=title, kicker=kicker, audience=audience, sections=sections)


DOCS = [
    doc("01_Executive_Summary", "IC SPICY One-Page Executive Summary", "The fastest shareable overview of the brand, product, and opportunity.", "For intros, text-message followups, quick partner review, and warm investor forwards.", [
        ("The One-Liner", ["IC SPICY is a premium rare-pepper nursery and artisan seasoning brand from Zone 10a Southwest Florida, using ICP-native provenance to connect real plants, chef-built flavor, NFTs, community, and future token utility."]),
        ("Why It Matters", ["Seasoning shelves are full of anonymous commodity blends. IC SPICY brings origin, grower credibility, culinary craft, and digital proof to a category where premium heat, global flavor, and clean-label products are gaining momentum."]),
        ("What Exists", ["The project has a React storefront, Motoko backend, NIMS plant inventory system, marketplace, community, CookBook, NFT infrastructure, and a mainnet NFT asset canister strategy. The brand story is anchored by 30 years of growing experience and rare pepper genetics."]),
        ("The Ask", ["Follow, taste, partner, stock, introduce, and help turn a Florida rare-pepper nursery into a premium heat brand with grocery-shelf ambition."]),
    ]),
    doc("02_Investor_Memo", "IC SPICY Investor Memo", "A deeper written narrative than the pitch deck.", "For strategic backers, grant reviewers, and ecosystem partners.", [
        ("Thesis", ["IC SPICY has two linked opportunities: a premium physical CPG brand and an ICP-native RWA provenance platform. The physical products create mainstream demand; the blockchain layer creates trust, membership, transparency, and defensible community infrastructure."]),
        ("Market Timing", ["Premium seasoning, bold heat, global flavor, chef-inspired pantry upgrades, and specialty food discovery are all moving in IC SPICY's direction. McCormick validates chili-forward trends; Kinder's validates that challengers can grow quickly with the right flavor and retail strategy."]),
        ("Moat", ["The moat is founder-market fit: 30 years of Zone 10a growing experience, rare pepper access, chef-built blend development, a real nursery operation, and a software system that turns agricultural lifecycle data into customer-facing provenance."]),
        ("Risks", ["Retail distribution is expensive, token claims require legal discipline, solo-founder bandwidth is finite, and national grocery ambitions require production, insurance, packaging, compliance, trade spend, and velocity proof."]),
        ("Use of Support", ["Strategic support should focus on audit readiness, retail packaging, production SOPs, chef collaborations, community growth, and warm introductions to ICP and specialty food partners."]),
    ]),
    doc("03_Data_Room_Index", "IC SPICY Due Diligence Data Room Index", "A clean map of materials for serious reviewers.", "For organizing investor, partner, legal, retail, and technical diligence.", [
        ("Core Brand Docs", ["Branded whitepaper, pitch deck, roadmap, executive summary, market analysis, marketing strategy, founder bio, press kit, and retail sell sheet."]),
        ("Technical Docs", ["PROJECT_CONTEXT.md, AGENTS.md, canister architecture, ICRC-7 plan, asset upload notes, security posture, audit plan, local test results, and canister IDs as they are finalized."]),
        ("Commercial Docs", ["Wholesale line sheet, SKU sheets, packaging guide, pricing model, margin assumptions, demo scripts, launch calendar, and retail readiness checklist."]),
        ("Legal and Risk Docs", ["Token disclosure draft, claims checklist, food safety checklist, privacy policy, terms, risk register, audit scope, and counsel review notes when available."]),
        ("Open Items", ["Populate legal entity details, finalized UPCs, insurance, production certifications, lab tests where needed, audit firm selection, LGE dates, SPICY ledger ID, and post-launch retail scan data."]),
    ]),
    doc("04_Strategic_Partner_Brief", "IC SPICY Strategic Partner Brief", "Why IC SPICY is useful to food, retail, and ICP partners.", "For DFINITY, OISY, Plug, ICPSwap, OHSHII, chefs, distributors, and regional retailers.", [
        ("Partner Fit", ["IC SPICY is a practical RWA showcase: real products, real customers, on-chain identity, NFTs, payment rails, provenance, and a narrative normal people can understand."]),
        ("ICP Ecosystem Value", ["The project can demonstrate certified assets, ICRC-7 NFTs, wallet signer flows, HTTPS outcalls, Internet Identity, and future ICRC-1 token utility in a consumer-facing brand."]),
        ("Food Partner Value", ["Chefs, grocers, and distributors get a differentiated premium heat line with a Florida origin story, rare peppers, chef-designed blends, and digital storytelling that can activate shoppers at shelf."]),
        ("Collaboration Ideas", ["Co-branded chef blends, limited NFT-backed drops, retail tasting events, provenance demos, ICP community spaces, hot-sauce or seasoning pairing kits, and regional specialty-food pilots."]),
    ]),
    doc("05_Grant_Application_Packet", "IC SPICY Grant Application Packet", "A reusable narrative for ecosystem and small-business funding.", "For ICP grants, agriculture innovation programs, local business support, and pitch competitions.", [
        ("Project Summary", ["IC SPICY combines specialty agriculture, premium food CPG, and blockchain provenance to modernize how rare plants and pepper products are sold, verified, and experienced."]),
        ("Innovation", ["The project applies ICP-native infrastructure to living agricultural assets: plant lifecycle records, certified NFT assets, self-custody wallet payments, QR claims, and weather provenance."]),
        ("Economic Impact", ["The project can support local agriculture, specialty food production, chef collaborations, online sales, retail accounts, and digital community growth from Southwest Florida."]),
        ("Funding Priorities", ["Audit readiness, food packaging and compliance, production scale-up, retail demo support, provenance UX, and public education around RWA utility."]),
        ("Outcomes", ["Deliver a working dapp, launch premium seasoning SKUs, establish early retail accounts, document provenance use cases, and publish transparent progress updates."]),
    ]),
    doc("06_Retail_Buyer_Sell_Sheet", "IC SPICY Retail Buyer Sell Sheet", "The one-page grocery buyer pitch.", "For specialty grocers, regional grocery buyers, co-ops, and gourmet shops.", [
        ("Brand Snapshot", ["IC SPICY is a premium Florida rare-pepper brand delivering chef-built heat from Zone 10a Southwest Florida. The line is designed for shoppers who want bold flavor, origin, and a story stronger than another generic spice jar."]),
        ("Why It Belongs On Shelf", ["Premium heat is culturally hot, global flavor is growing, shoppers want better pantry upgrades, and IC SPICY gives the category a founder-led farm origin with modern QR storytelling."]),
        ("Launch Assortment", ["Recommended first four SKUs: Zone 10a Fire Salt, Reaper Reserve, Smoked Datil Citrus, and Chef's Charred Garlic Pepper. This creates an everyday SKU, an extreme SKU, a Florida signature SKU, and a grill-friendly mass appeal SKU."]),
        ("Retail Support", ["Founder-led demos, social content, recipe cards, QR provenance story, limited drops, local press, seasonal pepper tie-ins, and buyer-specific launch promotions."]),
        ("Buyer Promise", ["Start tight, support the shelf, measure velocity, earn reorders, and scale only the SKUs that prove themselves."]),
    ]),
    doc("07_Wholesale_Line_Sheet", "IC SPICY Wholesale Line Sheet", "SKU, pricing, case, and ordering framework.", "For wholesale conversations before final UPC and case-pack data is locked.", [
        ("Wholesale Policy", ["This is a planning template. Final wholesale prices, MSRP, UPCs, net weight, case packs, minimum order quantities, payment terms, and lead times should be confirmed after packaging and COGS are finalized."]),
        ("Proposed Line", ["Zone 10a Fire Salt: everyday finishing and grilling salt. Reaper Reserve: controlled superhot chef blend. Smoked Datil Citrus: Florida seafood and poultry blend. Chef's Charred Garlic Pepper: broad grill and roasted vegetable blend."]),
        ("Suggested Structure", ["Target premium MSRP range: 9.99 to 14.99 depending on jar size and ingredients. Wholesale should preserve enough margin for retailer and brand after packaging, labor, spoilage, freight, demos, and trade spend."]),
        ("Order Terms To Define", ["Case pack, opening order, reorder minimum, shelf life, storage requirements, lead time, freight policy, damaged goods policy, seasonal availability, and demo support."]),
        ("Buyer Notes", ["Keep the first line focused. Retailers need proof of turns, not a huge catalog. Use early DTC and local sell-through to justify expansion."]),
    ]),
    doc("08_Distributor_Pitch_Deck", "IC SPICY Distributor Pitch Deck Copy", "Operational pitch language for distributors.", "For brokers, specialty distributors, and regional food distribution meetings.", [
        ("Slide 1 - Brand", ["IC SPICY: rare Florida peppers, chef-built seasonings, and shelf-ready premium heat."]),
        ("Slide 2 - Category Fit", ["Premium seasoning, bold heat, global flavor, and clean-label pantry upgrades are growing. IC SPICY gives buyers a differentiated challenger brand with a real farm story."]),
        ("Slide 3 - Assortment", ["Four-SKU launch: everyday, extreme, Florida signature, and grill-friendly. Focused enough for clean placement; broad enough to test shopper demand."]),
        ("Slide 4 - Support", ["Founder demos, social campaigns, QR storytelling, recipe cards, limited seasonal drops, and regional content tied to Southwest Florida growing."]),
        ("Slide 5 - Distributor Need", ["We need partners who can help with regional account access, shelf strategy, buyer feedback, reorder discipline, and operational scaling without overextending the brand too early."]),
    ]),
    doc("09_Grocery_Demo_Script", "IC SPICY Grocery Demo Script", "What to say during tastings without sounding pushy.", "For in-store demos, farmers markets, pop-ups, and chef events.", [
        ("Opening Line", ["Want to taste a Florida-grown rare pepper seasoning? IC SPICY is built from peppers grown in Zone 10a Southwest Florida and blended for flavor first, not just heat."]),
        ("Sampling Flow", ["Start with the approachable blend, then offer a hotter option only after asking the customer's heat comfort level. Never surprise someone with superhot spice."]),
        ("Core Talking Points", ["Farm-grown peppers, chef-designed blends, Florida origin, small-batch production, QR story, and the goal of bringing a better premium heat brand to grocery shelves."]),
        ("Objection Handling", ["If they say it is too hot: explain the line has levels. If they ask about crypto: say the tech is mostly for provenance and membership, while the product is real seasoning. If they compare to Kinder's: say IC SPICY is more origin-driven and chef-led."]),
        ("Close", ["If you like it, grab a jar today and follow the QR for the story behind the brand. We are building this from a real Florida pepper nursery, one batch at a time."]),
    ]),
    doc("10_Retail_Launch_Calendar", "IC SPICY Retail Launch Calendar", "A practical 90-day retail support plan.", "For specialty retail launches and small regional account pilots.", [
        ("Days 1-15", ["Deliver product, verify shelf placement, provide sell sheet and recipe cards, announce account on social, and schedule first demo."]),
        ("Days 16-30", ["Run first demo, capture customer reactions, post store-specific content, check shelf condition, and record early sell-through."]),
        ("Days 31-60", ["Run second demo, test a small promo, send buyer progress update, gather staff feedback, and identify best-performing SKU."]),
        ("Days 61-90", ["Request reorder, refine assortment, propose secondary placement if velocity supports it, and package results for the next retail pitch."]),
        ("Metrics", ["Units sold, units per store per week, demo conversion, reorder timing, customer comments, social engagement, and SKU ranking."]),
    ]),
    doc("11_SKU_Concept_Sheets", "IC SPICY SKU Concept Sheets", "Concepts for the first four seasoning products.", "For product development, label planning, tastings, and buyer previews.", [
        ("Zone 10a Fire Salt", ["Everyday finishing salt with citrus, smoke, mineral crunch, and controlled chili warmth. Best on eggs, grilled vegetables, chicken, fries, avocado, and seafood."]),
        ("Reaper Reserve", ["A luxury superhot blend designed for tiny-dose use. The goal is precision heat with depth, not a prank product. Best for chili, wings, sauces, marinades, and brave pepper heads."]),
        ("Smoked Datil Citrus", ["Florida signature profile with bright citrus, smoked pepper, subtle sweetness, and coastal energy. Best on shrimp, fish, chicken, rice bowls, and roasted corn."]),
        ("Chef's Charred Garlic Pepper", ["Broadest mass-market contender: roasted garlic, char, pepper, salt, chili warmth, and savory finish. Best on steak, burgers, potatoes, mushrooms, and grilled vegetables."]),
        ("Future Limited Drops", ["Aji Amarillo Mango Smoke, Scotch Bonnet Lime Salt, Charapita Gold Dust, and Death Spiral Black Garlic should be seasonal or collector releases after the core line proves demand."]),
    ]),
    doc("12_Packaging_Copy_Guide", "IC SPICY Packaging Copy Guide", "Words for labels, backs, QR callouts, and claim discipline.", "For designers, label review, and packaging production.", [
        ("Front Label Formula", ["Brand name, SKU name, short flavor promise, heat level, net weight, and one concise origin phrase such as Zone 10a Florida Pepper Blend."]),
        ("Back Label Formula", ["One founder-origin paragraph, tasting notes, use cases, ingredient list, QR callout, batch number, website, and required regulatory information."]),
        ("QR Callout", ["Scan for the IC SPICY story, batch notes, pepper origin, recipes, and membership updates. Avoid promising investment, token upside, medical effects, or unverifiable claims."]),
        ("Claims To Avoid", ["Do not claim organic, pesticide-free, health benefits, disease treatment, guaranteed provenance certification, or token economics unless legally reviewed and factually supported."]),
        ("Tone", ["Premium but not stiff. Confident but not hype-drunk. Culinary, farm-rooted, and specific."]),
    ]),
    doc("13_Brand_Voice_Guide", "IC SPICY Brand Voice Guide", "How the brand should sound everywhere.", "For labels, social, website copy, decks, and founder scripts.", [
        ("Voice Attributes", ["Grounded, fiery, culinary, premium, direct, transparent, and a little rebellious."]),
        ("What To Say", ["Farm-grown heat. Chef-built flavor. Rare Florida peppers. Real provenance. Luxury pantry fire. Built from soil, not a boardroom."]),
        ("What To Avoid", ["Moon language, guaranteed financial upside, empty Web3 jargon, macho pain challenges, fake scarcity, and vague wellness claims."]),
        ("Audience Adjustments", ["For grocery buyers: margin, velocity, shopper fit. For chefs: flavor, origin, technique. For X: founder conviction and build-in-public. For local customers: plants, taste, community, and trust."]),
        ("Signature Lines", ["Rare. Hot. Alive. Farm-grown heat. Chef-built flavor. From tray to table. From soil to shelf."]),
    ]),
    doc("14_Product_Naming_System", "IC SPICY Product Naming System", "Rules for naming core blends and future drops.", "For keeping the product line premium and coherent.", [
        ("Core Naming Rule", ["Use names that combine place, flavor, technique, and heat. The name should feel like food, not a novelty dare."]),
        ("Core Line Families", ["Fire Salts for finishing salts, Chef's Reserve for culinary blends, Smokehouse for grill blends, Florida Gold for local citrus and datil profiles, and Superhot Reserve for extreme blends."]),
        ("Limited Drop Names", ["Use rare cultivar names sparingly: Charapita Gold, Death Spiral Reserve, Apocalypse Smoke, Aji Amarillo Sunfire, Scotch Bonnet Lime Fire."]),
        ("Avoid", ["Do not overuse skulls, death jokes, or shock names. Keep extreme heat sophisticated."]),
        ("Decision Test", ["Would a chef, a grocery buyer, and a pepper head all understand why this product exists? If yes, the name is working."]),
    ]),
    doc("15_Recipe_Cards", "IC SPICY Recipe Card Pack", "Starter recipe copy for early content and printed cards.", "For demos, packaging inserts, social posts, and email campaigns.", [
        ("Fire Salt Eggs", ["Soft scrambled eggs, butter, chives, and Zone 10a Fire Salt. Finish lightly after cooking so the citrus and pepper stay bright."]),
        ("Datil Citrus Shrimp", ["Toss shrimp with olive oil, lime, garlic, Smoked Datil Citrus, and a pinch of salt. Sear hot and finish with fresh herbs."]),
        ("Charred Garlic Potatoes", ["Roast potatoes with oil and Chef's Charred Garlic Pepper until crisp. Finish with lemon and parsley."]),
        ("Reaper Reserve Chili Oil", ["Warm neutral oil with garlic, paprika, and a tiny pinch of Reaper Reserve. Rest, strain if desired, and use carefully over pizza, noodles, or beans."]),
        ("Retail Demo Bite", ["Use plain popcorn, roasted potatoes, or grilled chicken bites as neutral carriers so customers taste the seasoning clearly."]),
    ]),
    doc("16_Thirty_Day_Content_Calendar", "IC SPICY 30-Day Launch Content Calendar", "A realistic posting plan for a solo founder.", "For X, Instagram, TikTok, Facebook, and email.", [
        ("Week 1 - Origin", ["Day 1 founder story, Day 2 Zone 10a grow post, Day 3 rare pepper photo, Day 4 chef blend teaser, Day 5 X thread on why grocery spices are anonymous, Day 6 behind-the-scenes, Day 7 email signup push."]),
        ("Week 2 - Product", ["Show each hero SKU, tasting notes, recipe use, heat level, packaging direction, and one customer/friend tasting reaction."]),
        ("Week 3 - Proof", ["Post QR provenance demo, NIMS grow tracking, ICP explanation in plain English, farmers-market prep, and a retail ambition thread."]),
        ("Week 4 - Launch", ["Announce limited batch, run countdown, post demo video, share recipe cards, host X Space, publish founder note, and ask for reviews and shares."]),
        ("Cadence Rule", ["Do not wait for perfect visuals. Ship useful content consistently, capture the real process, and let the audience watch the brand become real."]),
    ]),
    doc("17_X_Thread_Bank", "IC SPICY X Thread Bank", "Prewritten thread ideas for the next 30 posts.", "For founder-led X growth and ICP community education.", [
        ("Thread 1 - Why Seasoning Needs Origin", ["Hook: Most spice jars tell you a flavor. They do not tell you a story. IC SPICY is changing that."]),
        ("Thread 2 - McCormick, Kinder's, and the Opening", ["Hook: McCormick owns legacy. Kinder's owns modern grill energy. The next lane is farm-origin luxury heat."]),
        ("Thread 3 - What RWA Means Here", ["Hook: RWA does not have to mean real estate or treasuries. Sometimes it means a living pepper plant with a history."]),
        ("Thread 4 - Zone 10a Advantage", ["Hook: Southwest Florida is not just a location. For peppers, climate is character."]),
        ("Thread 5 - Heat Is Easy", ["Hook: Anyone can make something hot. The hard part is making heat taste expensive."]),
        ("More Thread Hooks", ["From tray to token; Why I am building on ICP; What PepperHeads are; Why QR labels matter; How to beat commodity spices; Why retail velocity matters; What a chef-built pepper blend needs; Why solo-founder brands can move fast."]),
    ]),
    doc("18_Short_Form_Video_Scripts", "IC SPICY Short-Form Video Script Pack", "Hooks and shot lists for Reels, TikTok, and Shorts.", "For fast content production from the farm, kitchen, and desk.", [
        ("Video 1 - Boardroom vs Soil", ["Hook: Most seasoning brands start in a boardroom. Mine starts here. Shot: hand in soil, pepper plants, drying peppers, seasoning jar. CTA: follow IC SPICY."]),
        ("Video 2 - Heat Is Easy", ["Hook: Making food hot is easy. Making heat taste expensive is the work. Shot: chef tasting, ingredients, plated food. CTA: join the waitlist."]),
        ("Video 3 - Scan The Jar", ["Hook: What if your spice jar could tell you where the peppers came from? Shot: QR mockup, NIMS screen, plant photo. CTA: watch the provenance build."]),
        ("Video 4 - Kinder's Challenge", ["Hook: I respect Kinder's. But I think a Florida rare-pepper brand can hit harder. Shot: shelf, blend test, founder talking. CTA: which flavor should launch first?"]),
        ("Video 5 - Superhot Discipline", ["Hook: This is not a prank blend. This is controlled fire. Shot: tiny pinch, sauce, tasting reaction. CTA: PepperHeads are coming."]),
    ]),
    doc("19_Email_Launch_Sequence", "IC SPICY Email Launch Sequence", "Email copy structure for waitlist and drop campaigns.", "For Mailchimp, Beehiiv, ConvertKit, or manual email sends.", [
        ("Email 1 - Welcome", ["Subject: Welcome to IC SPICY. Body: founder story, rare peppers, chef-built flavor, and what subscribers will get first."]),
        ("Email 2 - The Mission", ["Subject: From soil to shelf. Body: explain the grocery-shelf ambition, why the category needs origin, and how customers can help early."]),
        ("Email 3 - The First Blends", ["Subject: Meet the first four fires. Body: introduce each SKU with tasting notes and use cases."]),
        ("Email 4 - Provenance", ["Subject: Why the QR matters. Body: explain traceability, plant records, and ICP in simple customer language."]),
        ("Email 5 - Drop Day", ["Subject: The first IC SPICY batch is live. Body: product link, limited quantity, recipe idea, and share CTA."]),
    ]),
    doc("20_Press_Kit", "IC SPICY Press Kit", "Copy for media, blogs, podcasts, and local press.", "For outreach to food, agriculture, local, and Web3 media.", [
        ("Boilerplate", ["IC SPICY is a Southwest Florida rare-pepper nursery and premium seasoning brand building farm-grown heat, chef-built flavor, and blockchain-backed provenance on the Internet Computer."]),
        ("Founder Bio", ["Founder/operator with 30 years of growing experience in Zone 10a Southwest Florida, focused on rare peppers, regenerative growing practices, artisan spice products, and practical RWA technology."]),
        ("Press Angles", ["Florida nursery takes on seasoning giants; rare peppers meet blockchain provenance; chef-designed heat brand targets grocery shelves; solo founder builds farm-to-flame CPG company."]),
        ("Media Assets Needed", ["Founder headshot, farm photos, pepper macro shots, seasoning jars, QR demo, NIMS screenshot, product lifestyle shots, and short brand video."]),
        ("Contact Block", ["Add email, website, social links, city/state, press contact, and product availability once finalized."]),
    ]),
    doc("21_Influencer_Chef_Outreach_Kit", "IC SPICY Influencer and Chef Outreach Kit", "DMs, collaboration framing, and sample-box copy.", "For chefs, grill creators, pepper reviewers, and local food influencers.", [
        ("DM Script", ["Hey [Name], I am building IC SPICY - a Southwest Florida rare-pepper seasoning brand with chef-built blends and provenance-backed storytelling. I would love to send you an early sample box and get your honest take."]),
        ("Chef Collaboration Offer", ["Limited co-branded blend, recipe content, tasting notes, launch livestream, and revenue-share or flat collaboration terms depending on partner fit."]),
        ("Sample Box Insert", ["You are tasting an early IC SPICY batch. Please try it on a neutral food first, then on your favorite protein or vegetable. Honest feedback is more valuable than hype."]),
        ("Creator Guidelines", ["No fake praise required. Disclose gifted product. Focus on flavor, use case, aroma, balance, and heat level. Tag IC SPICY and share recipe ideas."]),
        ("Best Targets", ["Pepper reviewers, BBQ creators, chefs, Florida food accounts, regenerative farming creators, ICP creators, and premium pantry reviewers."]),
    ]),
    doc("22_PepperHead_Membership_Guide", "IC SPICY PepperHead Membership Guide", "A clear guide to the 888 membership NFTs.", "For collectors, early supporters, and Web3 community members.", [
        ("What PepperHeads Are", ["PepperHeads are 888 membership-bearing NFTs inside the 8888-token IC SPICY collection. They are designed for early supporters who want deeper access to the brand, future drops, and premium community features."]),
        ("Benefits", ["Future NFT drop whitelist, early access windows, product discounts by rarity, premium SpicyAI tier, community status, and access to member-first updates."]),
        ("What They Are Not", ["They are not equity, securities, guaranteed profit instruments, or claims on treasury or nursery assets. Benefits are product and community utility."]),
        ("Why 888", ["The limited supply makes membership legible and scarce without making it the entire brand. The physical products and community remain accessible to normal customers."]),
        ("Plain-English Pitch", ["If you want to be early to IC SPICY as it grows from rare pepper nursery to premium heat brand, PepperHeads are the member lane."]),
    ]),
    doc("23_NFT_Collector_Guide", "IC SPICY NFT Collector Guide", "NFT collection, rarity, provenance, and utility explained.", "For NFT buyers and IC-native users.", [
        ("Collection", ["8888 ICRC-7 NFTs with rarity tiers: Common, Uncommon, Rare, and Founder. Static art and metadata are paired with future live provenance and ownership history."]),
        ("Utility", ["Discount tiers, claim flows, PepperHead benefits, future burn redemption, and access to provenance-linked experiences."]),
        ("Provenance", ["The long-term goal is for plant-linked NFTs to show lifecycle data such as variety, germination, transplant, sale, claim, and weather snapshots where applicable."]),
        ("Custody", ["Self-custody is central. Internet Identity handles app login, while wallet connection handles explicit financial actions."]),
        ("Collector Reminder", ["Buy because you value the brand, art, utility, and community. Do not buy based on expectations of profit."]),
    ]),
    doc("24_SPICY_Utility_Explainer", "SPICY Utility Explainer", "A non-legal consumer-friendly utility overview.", "For community education before deeper legal disclosure.", [
        ("What SPICY Is", ["SPICY is planned as an ICRC-1 utility token for IC SPICY ecosystem functions. Formal token details require legal review and should be governed by the token disclosure document when published."]),
        ("Planned Utility", ["Pay-with-SPICY burns, recipe submission gate and burn, SpicyAI bonus calls, Legend badge, NFT redemption pool mechanics, and treasury transparency surfaces."]),
        ("What SPICY Is Not", ["SPICY is not equity, profit share, a dividend right, a claim on treasury assets, or a guarantee of future value."]),
        ("Customer Framing", ["For mainstream customers, SPICY should be secondary. The physical products and brand experience come first."]),
        ("Compliance Reminder", ["Do not publish token claims, launch dates, pricing, or financial language without legal review."]),
    ]),
    doc("25_X_Spaces_Host_Pack", "IC SPICY X Spaces Host Pack", "A reusable host toolkit for live audio rooms.", "For founder-hosted X Spaces and partner AMAs.", [
        ("Opening", ["Welcome everyone. IC SPICY is a rare pepper nursery and premium seasoning brand from Southwest Florida, building chef-designed heat with ICP-backed provenance."]),
        ("Transitions", ["From the farm story, move to product. From product, move to market. From market, move to ICP. From ICP, move back to how customers actually taste and buy the brand."]),
        ("Guest Questions", ["What makes a spice brand premium? What flavor trends are you watching? Would QR provenance matter at shelf? What would make you replace your current seasoning?"]),
        ("Moderation", ["Keep token talk compliant, stop price speculation, redirect hype into product utility, and keep the room welcoming to non-crypto food people."]),
        ("Close", ["Follow IC SPICY, join the waitlist, share the room, and watch the build from soil to shelf."]),
    ]),
    doc("26_Community_Moderation_Guide", "IC SPICY Community Moderation Guide", "Rules and tone for a healthy community.", "For X, Discord/OpenChat, Telegram, comments, and future community channels.", [
        ("Principles", ["Food first, respect always, no scams, no price manipulation, no harassment, no medical claims, and no pretending speculation is utility."]),
        ("Allowed", ["Grow tips, recipes, product feedback, pepper photos, ICP questions, NFT utility discussion, retail ideas, and constructive criticism."]),
        ("Not Allowed", ["Token price pumping, guaranteed profit claims, hate speech, doxxing, spam, fake giveaways, impersonation, unsafe food advice, and harassment."]),
        ("Escalation", ["Warn, mute, remove, ban, and document depending on severity. Security issues should go to a dedicated disclosure path once available."]),
        ("Tone", ["Casual, direct, helpful, spicy but not toxic. The brand can have heat without becoming hostile."]),
    ]),
    doc("27_Founder_Operating_Plan", "IC SPICY Founder Operating Plan", "A weekly cadence for a solo grower-builder.", "For balancing code, farming, production, marketing, and retail.", [
        ("Weekly Blocks", ["Two focused coding blocks, two farm/production blocks, one content batch block, one sales/outreach block, and one admin/compliance block."]),
        ("Daily Minimums", ["Capture one useful piece of content, answer customer/community messages, check priority tasks, and move one revenue or launch item forward."]),
        ("Do Not Overbuild", ["Avoid adding features that do not help launch, sell, verify, or support the product. Focus on revenue, trust, and proof."]),
        ("Monthly Review", ["Review cash, inventory, content output, DTC sales, retail leads, technical progress, and next bottleneck."]),
        ("Founder Health", ["A solo founder cannot run at emergency pace forever. Build repeatable systems, not constant heroics."]),
    ]),
    doc("28_Retail_Readiness_Checklist", "IC SPICY Retail Readiness Checklist", "What must be ready before serious grocery outreach.", "For CPG operations and buyer conversations.", [
        ("Product", ["Final recipes, stable batch process, ingredient sourcing, shelf life, packaging, labels, net weight, UPCs, case packs, and quality checks."]),
        ("Business", ["Wholesale pricing, MSRP, margin model, opening order terms, reorder terms, lead times, freight policy, insurance, W-9/entity info, and invoicing process."]),
        ("Compliance", ["Nutrition facts if required, ingredient/allergen review, claims review, food safety process, local/state requirements, and any needed facility or co-packer documentation."]),
        ("Sales", ["Sell sheet, line sheet, sample kit, demo plan, product photos, buyer email, retail launch calendar, and reorder tracking sheet."]),
        ("Proof", ["DTC sales, reviews, demo conversion, local account reorders, social engagement, and units per store per week."]),
    ]),
    doc("29_Food_Safety_Claims_Checklist", "IC SPICY Food Safety and Claims Checklist", "A practical guardrail for labels and marketing.", "For packaging, ads, web copy, and public claims.", [
        ("Review Required", ["Organic, pesticide-free, non-GMO, gluten-free, allergen-free, health benefits, medical effects, lab-tested, award-winning, chef-certified, and provenance-certified claims should be reviewed before publishing."]),
        ("Food Safety Basics", ["Document batch dates, ingredients, suppliers, sanitation, packaging, storage, complaints, recalls, and lot codes."]),
        ("Label Basics", ["Product identity, net weight, ingredients, allergens, business name/address, nutrition panel if required, UPC, lot code, and best-by guidance."]),
        ("Marketing Discipline", ["Say what is true and provable. If a claim depends on future tech, say planned or future, not live."]),
        ("Legal Reminder", ["This checklist is not legal advice. Use qualified food compliance and legal review before retail scale."]),
    ]),
    doc("30_Mainnet_Launch_Checklist", "IC SPICY Mainnet Launch Checklist", "Operational checklist for production deployment readiness.", "For ICP launch planning and internal discipline.", [
        ("Before Deploy", ["Read PROJECT_CONTEXT.md and AGENTS.md, fetch relevant ICP skills, complete local tests, verify admins, verify canister IDs, confirm cycles, and review upgrade risks."]),
        ("Security", ["Authenticated methods guarded, admin methods protected, CallerGuard on async settlement, no hardcoded secrets, no frontend-trusted prices, and no user content in Debug.print."]),
        ("Assets", ["Frontend built, NFT assets verified, certified paths used, raw access policy reviewed, metadata templating correct, and upload scripts tested."]),
        ("Comms", ["Publish launch notes, privacy policy, terms, risk notes, support channel, known limitations, and no token claims beyond reviewed disclosures."]),
        ("After Deploy", ["Run smoke tests, verify queries, check cycle balances, record module hashes, archive release notes, and monitor errors and customer reports."]),
    ]),
    doc("31_Risk_Register", "IC SPICY Risk Register", "Market, technical, retail, legal, and founder-dependency risks.", "For planning, diligence, and sober decision-making.", [
        ("Technical Risks", ["Canister bugs, payment settlement issues, wallet signer UX, HTTPS outcall failures, cycle exhaustion, upgrade mistakes, and untested edge cases."]),
        ("Market Risks", ["Seasoning competition, slow retail adoption, weak repeat purchase, poor SKU focus, pricing mismatch, or content failing to reach the right buyers."]),
        ("Operational Risks", ["Solo-founder bottleneck, production capacity, packaging delays, ingredient sourcing, batch consistency, shipping, demos, and customer support."]),
        ("Legal and Compliance Risks", ["Token regulation, food labeling, claims, privacy, sales tax, entity structure, insurance, and retail requirements."]),
        ("Mitigation", ["Launch in stages, keep claims reviewed, prove velocity before scale, audit before funds, document operations, and maintain a clear public risk posture."]),
    ]),
]


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    pdfs = []
    for item in DOCS:
        md = OUT / f"{item.filename}.md"
        pdf = OUT / f"{item.filename}.pdf"
        md.write_text(markdown_for(item), encoding="utf-8")
        render_pdf(item, pdf)
        pdfs.append(pdf)

    readme = [
        "# IC SPICY Expanded Brand Library",
        "",
        "Branded Markdown sources and PDFs for all requested investor, retail, CPG, marketing, community, and operations documents.",
        "",
    ]
    for item in DOCS:
        readme.append(f"- [{item.title}]({item.filename}.md) / `{item.filename}.pdf`")
    (OUT / "README.md").write_text("\n".join(readme) + "\n", encoding="utf-8")

    zip_path = OUT / "IC_SPICY_Expanded_Brand_Library_PDFs.zip"
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for pdf in pdfs:
            zf.write(pdf, arcname=pdf.name)
        zf.write(OUT / "README.md", arcname="README.md")


if __name__ == "__main__":
    main()
