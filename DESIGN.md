# Design Brief

## Direction

IC SPICY — A FDACS-registered chili pepper nursery platform built for premium rare peppers, plant lifecycle tracking, and agricultural community engagement. Includes NIMS (Nursery Inventory Management System) as a professional data-first dashboard.

## Tone

Dark agricultural luxury with fire and spice as visual language: deep charcoal backgrounds with vibrant flame-red accents evoke both premium artisanal craftsmanship and the bold heat of rare chilies. NIMS layer maintains utilitarian precision — no decoration, clarity first.

## Differentiation

Fire-red accent color used sparingly on CTAs, lifecycle badges, and social links creates a consistent "chili pepper brand" identity that signals premium, rare agricultural products rather than generic e-commerce. NIMS adds professional inventory hierarchy through table styling, filter panels, and status indicators.

## Color Palette

| Token              | OKLCH         | Role                                 |
| ------------------ | ------------- | ------------------------------------ |
| background         | 0.12 0.015 50 | Deep charcoal base                   |
| foreground         | 0.92 0.01 60  | Warm cream text                      |
| card               | 0.16 0.018 50 | Elevated card surfaces               |
| primary (fire-red) | 0.62 0.26 24  | CTAs, badges, social links, accents  |
| accent (burnt-org) | 0.58 0.22 32  | Secondary highlights, plant stages   |
| muted              | 0.22 0.02 50  | Neutral secondary backgrounds        |
| border             | 0.28 0.02 50  | Card borders, dividers               |

## Typography

- Display: Space Grotesk — bold geometric sans for headings, product names, lifecycle stage labels
- Body: Satoshi — warm humanistic sans for product descriptions, metadata, UI copy
- Mono: Geist Mono — technical precision for admin interfaces, transaction history, NFT metadata
- Scale: hero `text-6xl md:text-7xl font-bold tracking-tight`, h2 `text-4xl font-bold`, label `text-xs font-semibold uppercase tracking-widest`, body `text-base leading-relaxed`

## Elevation & Depth

Warm soft shadows on dark backgrounds create surface hierarchy without opacity: shadow-subtle (4px blur, 0.2 black) for standard cards, shadow-elevated (12px blur, 0.3 black) for modals/overlays. No glass morphism or neon glows.

## Structural Zones

| Zone    | Background                    | Border                    | Notes                                                   |
| ------- | ----------------------------- | ------------------------- | ------------------------------------------------------- |
| Header  | `card` (0.16 L) + fire accent | Subtle `border` divider   | Social links (Facebook, X, Instagram, TikTok) in right |
| Content | Alternating `background`/`card` | —                         | Product cards on `card` bg, metadata on `background`    |
| Footer  | `card` (0.16 L)               | Top `border` divider      | Social links, copyright, admin links                    |
| NIMS    | Sidebar `card/50` filter panel, main `background` table layout | `border` for table structure | Data table with headers, rows, status pills, tray grid toggle |

## NIMS Inventory Dashboard

| Component | Styling | Purpose |
| --- | --- | --- |
| Table Header | `table-header` (muted/60 bg, uppercase xs text) | Column titles (Variety, Stage, Tray, Plant ID, Feeding, Status) |
| Table Row | `table-row-hover` (card bg, lift on hover) | Plant data rows with consistent padding |
| Status Pills | `.status-seed` (muted), `.status-seedling` (accent), `.status-mature` (primary), `.status-sold` (muted struck) | Lifecycle stage indicators |
| Filter Panel | `.filter-panel` (card/50 bg, border, rounded-lg) | Left sidebar with Stage/Variety/Tray/Status facets |
| Tray Grid Cells | `.tray-cell-available` (card/60 hover), `.tray-cell-occupied` (primary/15 border), `.tray-cell-sold` (muted/30 opacity) | 72-cell grid view with state indicators |
| Search Input | `.inventory-search` (muted/30 bg, focus ring-primary) | Search bar with placeholder and focus state |
| Sort Button | `.sort-button` (text muted, hover foreground) | Column sort controls |

## Spacing & Rhythm

Section gaps 32px (`gap-8`), content grouping with 16px (`gap-4`), micro-spacing 8px (`gap-2`). Card padding 24px (`p-6`). Dense metadata sections use smaller grid gaps for information hierarchy. NIMS table compact spacing: 12px row padding, 8px cell gaps.

## Component Patterns

- Buttons: Fire-red rounded-md (6px), bold text, hover darkens to 0.55 L, active adds subtle inner shadow
- Cards: Rounded-md (6px) on `card` bg with subtle border, shadow-subtle, spacing 16px internal
- Badges: Inline stage indicators (Seedling/1-gal/5-gal) use fire-red text on transparent, rounded-sm (4px)
- Plant lifecycle visuals: Stage progression badges render with fire-accent as left border accent
- Tables: Header with `table-header` utility, rows with `table-row-hover`, consistent grid alignment

## Motion

- Entrance: Cards fade-in + slide-up 400ms on page load via `opacity-0 translate-y-4 → opacity-100 translate-y-0`
- Hover: CTAs transition-smooth (300ms) to lighter state, cards lift via subtle shadow increase. Table rows and tray cells use `transition-smooth` for hover states.
- Decorative: Minimal — no full-page animations. NFT reveal animations use fade + scale for minting moments only

## Constraints

- No gradients on backgrounds — use solid dark charcoal foundation only
- Social links must always be accessible (header + footer minimum)
- Fire-red (#E63946 equivalent in OKLCH) limited to interactive elements only, never full sections
- No opacity on dark backgrounds — maintain solid contrast for text readability
- Admin panel shares design system but uses slightly reduced card padding for density
- NIMS table structure prioritizes legibility: strong header contrast, clear row separation, compact status indicators

## Signature Detail

Fire-red accent used on lifecycle stage badges, primary CTAs, social media icons, and NIMS status pills (Mature stage) — creating a visual thread connecting the chili pepper brand identity throughout every page and interaction. Table clarity over decoration ensures professional inventory management feel.

## CookBook Feature

| Component | Styling | Purpose |
| --- | --- | --- |
| Recipe Card | `.recipe-card` (card bg, primary left border 4px, shadow-subtle) | Premium recipe display with OHN, FPJ, WCA, etc. |
| Recipe Title | `.recipe-title` (xl, display font, bold) | Recipe common name + spice icon |
| Recipe Subtitle | `.recipe-subtitle` (sm, muted, italic) | Latin/traditional name, origin |
| Section Title | `.recipe-section-title` (xs uppercase, accent text) | Ingredients, Instructions, Application Notes |
| Ingredient | `.recipe-ingredient` + `.recipe-ingredient-highlight` (primary bold on key items) | Ingredient list with emphasis on KNF inputs |
| Step | `.recipe-step` (sm, leading-relaxed) | Step-by-step application instructions |
| Print Layout | White background, black text, IC SPICY header, footer with date | Greenhouse-ready printable/downloadable PDF |
| Share Button | Fire-red text, copy-to-clipboard or shareable URL | Social sharing of individual recipes |

## NIMS Onboarding Tooltips

| Component | Styling | Purpose |
| --- | --- | --- |
| Tooltip Card | `.tooltip-card` (card bg, primary left border, shadow-elevated) | Contextual hint positioned near interactive element |
| Arrow Indicator | `.tooltip-arrow` (positioned absolutely, border-based) | Points to the target interactive element |
| Tooltip Text | `.tooltip-text` (sm, foreground) | Clear, one-sentence instruction |
| Dismiss Button | `.tooltip-dismiss-button` (primary text, "Got it") | Dismissible per tooltip, not modal |
| Master Toggle | Settings → Show NIMS Tips (checkbox) | Toggle all tooltips on/off globally |

## Printable Tray Map

| Component | Styling | Purpose |
| --- | --- | --- |
| Print Header | `.tray-map-header` (IC SPICY logo/title, date, user) | Professional greenhouse label |
| Tray Grid | 72-cell layout (12x6), `.tray-map-cell-print` (black border, white bg) | Each cell shows plant name, stage badge |
| Cell Label | Text-xs, plant name + stage (Seed/Seedling/Mature) | Quick visual reference in field |
| QR Code | Bottom right, links to live tray data | Real-time access to tray on phone |
| Footer | User name, print date, IC SPICY branding | Document metadata |

## Garden Inputs Category

New shop category for soil amendments, nutrients, tools, and KNF ingredients. Uses existing product card styling with icon-based visual differentiation (leaf, droplet, beaker icons). Listed alongside Plants and Artisan Spices in shop sidebar.


