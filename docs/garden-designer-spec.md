# IC SPICY Garden Designer — Full Specification

## Save Date: May 25, 2026
## Status: Saved for future implementation (Phase 13+)

---

## Overview

A Sims Build Mode-style 3D interactive garden/nursery designer integrated into IC SPICY. Users drag-and-drop real pepper varieties from the IC SPICY catalog onto a virtual garden plot, plan layouts, validate spacing, simulate growth, and mint the finished design as an NFT. Supports multiplayer co-op editing via IC WebSockets.

## Core Requirements

- 100% on-chain: All design data, rules, and metadata in existing Motoko backend canister
- All code, libraries, and assets must be free and open-source (MIT/Apache/CC0)
- Frontend hosted on the existing IC SPICY frontend asset canister
- Rendering is client-side using React Three Fiber + Three.js (WebGL)
- Users mint the finished design as an NFT via existing ICRC-7 canister
- Internet Identity authentication (already implemented)
- Support both 2D top-down SVG and interactive 3D view
- Integrates with existing variety catalog, NIMS plants, shop, and community

## Integration Points with Existing IC SPICY

| Feature | Integration |
|---|---|
| Variety catalog | Populates the plant sidebar with real IC SPICY varieties |
| NIMS plants | Drag actual tracked plants into the layout |
| NFT mint | Save design → mint via existing ICRC-7 canister |
| Community | Share garden designs as posts |
| Shop | "Buy the plants in this design" → adds to cart |
| Weather | Sunlight simulation uses the same Open-Meteo data |
| Seed Bank | Suggest plants from user's seed collection |

## Sims-Like User Experience

### Sidebar Catalog
- Tabs: "Spicy Plants", "Trees & Shrubs", "Structures" (greenhouses, raised beds, irrigation, paths, fences), "Decor"
- Search and filter by variety, container size, sun requirements
- Plant cards show: variety name, image, Scoville range, spacing requirements

### Editing Tools
- Drag-and-drop from catalog to garden plot
- Paint-brush tool for rapid multi-plant placement
- Grid snapping (0.5m–2m configurable)
- Rotation (45° snap or free rotation)
- Scale, duplicate, delete
- Undo/Redo (last 30 actions, stored client + synced to chain)
- Multi-select for bulk operations

### Views
- 3D perspective with orbit controls (rotate, zoom, pan)
- 2D orthographic top-down (floorplan style)
- Toggle between views
- Real-time 3D preview with lighting, soft shadows

### Play Preview Mode
- Sunlight simulation using suncalc (based on user's GPS location)
- Growth stage animation (seedling → mature over time)
- Yield estimator based on plant count + spacing + companion planting
- Seasonal view (show garden in spring/summer/fall/winter)

### On-Chain Validation
- Plant spacing rules (minimum distance between plants)
- Companion planting compatibility (e.g., peppers + basil = boost)
- Sun/shade requirements per plant
- Container size validation
- Budget tracking (plants cost IC tokens / USD equivalent)

### UX Polish
- Hotkeys (Ctrl+Z undo, R rotate, Delete remove, G toggle grid)
- Tooltip fun spicy facts on hover
- Celebratory confetti + subtle audio on mint
- "X plants, estimated yield: Y lbs" live counter

## Technical Architecture

### Backend (Motoko — extends existing backend canister)

New types:
```motoko
type PlantPlacement = {
  id : Nat;
  varietyId : Nat;
  x : Float;
  y : Float;
  z : Float;
  rotationY : Float;
  scale : Float;
  variant : Nat8;  // visual variant (1-8)
  containerType : ?ContainerType;
};

type GardenDesign = {
  id : Nat;
  owner : Principal;
  name : Text;
  description : ?Text;
  plants : [PlantPlacement];
  structures : [StructurePlacement];
  width : Float;   // meters
  depth : Float;   // meters
  gridSize : Float; // snap grid in meters
  createdAt : Time;
  updatedAt : Time;
  isPublic : Bool;
  nftTokenId : ?Nat;
  version : Nat;
  collaborators : [Principal];
};

type StructurePlacement = {
  id : Nat;
  structureType : StructureType;
  x : Float;
  y : Float;
  z : Float;
  rotationY : Float;
  width : Float;
  depth : Float;
};

type StructureType = {
  #RaisedBed;
  #Greenhouse;
  #Path;
  #Fence;
  #IrrigationLine;
  #Trellis;
  #ShadeSail;
  #CompostBin;
};
```

New methods:
- `createGardenDesign(name, width, depth) → { designId : Nat }`
- `updateGardenDesign(designId, plants, structures) → Bool`
- `getGardenDesign(designId) → ?GardenDesign`
- `getMyDesigns() → [GardenDesign]`
- `getPublicDesigns(offset, limit) → [GardenDesign]`
- `validateLayout(designId) → [ValidationWarning]`
- `calculateYield(designId) → YieldEstimate`
- `getDesignSvg(designId) → Text` — generates 2D SVG on-chain
- `mintDesignAsNft(designId) → { nftTokenId : Nat }`
- `forkDesign(designId) → { newDesignId : Nat }` — remix/copy
- `deleteDesign(designId) → Bool`
- `saveDesignSnapshot(designId) → { version : Nat }` — version history
- `getDesignHistory(designId) → [{ version, timestamp, snapshot }]`

### Frontend (React + React Three Fiber)

Libraries to install:
```bash
pnpm add @react-three/fiber @react-three/drei three @types/three suncalc
```

Page: `/garden` (new route)

Component structure:
```
src/frontend/src/pages/GardenDesigner.tsx
src/frontend/src/components/garden/
├── GardenCanvas.tsx          — React Three Fiber canvas with scene
├── GardenGrid.tsx            — snap grid overlay
├── PlantModel.tsx            — 3D plant model (instanced)
├── StructureModel.tsx        — 3D structure models
├── CatalogSidebar.tsx        — plant/structure catalog with tabs
├── ToolBar.tsx               — edit tools (select, move, rotate, paint, delete)
├── DesignControls.tsx        — save, mint, share, undo/redo
├── TopDownView.tsx           — 2D SVG orthographic view
├── GrowthPreview.tsx         — animated growth simulation
├── SunlightSimulation.tsx    — suncalc-based sun position
├── YieldEstimator.tsx        — estimated yield display
├── ValidationPanel.tsx       — spacing/compatibility warnings
└── DesignGallery.tsx         — browse public designs
```

3D Plant Models:
- Phase 1: CC0 GLB models from Kenney.nl (simple, performant)
- Phase 2: EZ-Tree procedural generation (https://github.com/dgreenheck/ez-tree)
- Use instanced meshes for high plant counts (100+ plants)
- 8-12 visual variants per plant type

Ground/Terrain:
- Phase 1: flat plane with grass texture
- Phase 2: THREE.Terrain for subtle height variation

## Multiplayer Co-Op Design Sessions

### IC WebSocket Stack (all free/open-source)
- Backend: ic-websocket-cdk-rs (or Motoko equivalent) integrated into backend canister
- Frontend: ic-websocket-sdk-js
- Gateway: Public `wss://gatewayv1.icws.io` or self-hosted Omnia gateway

### Features
- Join/leave session by design_id
- Live broadcast of every plant move/rotate/add/delete via WebSocket push
- Optimistic UI updates + confirmed state from canister
- Live cursors (show other users' mouse/pointer in 3D scene with names)
- Presence list (who is online, avatar, role)
- On-chain comments/annotations attached to specific plants
- Permissions: owner, editor, viewer
- Version history snapshots in canister
- Conflict handling: timestamp-based last-write-wins + optional client-side CRDT for positions
- Toast notifications: "X just moved the ghost peppers"

### Data Flow
```
User A moves plant → Optimistic UI update → WebSocket broadcast → Canister update
                                            ↓
User B sees plant move in real-time ← WebSocket push ← Canister confirmed
```

### Session Management
```motoko
type DesignSession = {
  designId : Nat;
  participants : [SessionParticipant];
  createdAt : Time;
  lastActivity : Time;
};

type SessionParticipant = {
  principal : Principal;
  displayName : Text;
  role : SessionRole;
  cursorPosition : ?{ x : Float; y : Float; z : Float };
  joinedAt : Time;
  lastSeen : Time;
};

type SessionRole = {
  #Owner;
  #Editor;
  #Viewer;
};
```

### Bonus Features
- In-app voice note recording (WebRTC, stored on uploads canister)
- Text chat broadcast per session
- "Suggest a plant" button that recommends based on zone + layout
- AI-powered layout suggestions via SpicyAI integration

## Build Phases

### Phase 1 (1-2 weeks): Interactive 2D/3D Garden Plotter
- Drag plants from variety catalog onto grid
- Snap, rotate, scale, delete, undo/redo
- Save designs to Motoko backend
- Toggle 2D/3D view
- Simple CC0 3D plant models
- Mint design as NFT

### Phase 2 (2-3 weeks): Enhanced 3D + Rules Engine
- EZ-Tree procedural plants
- Plant spacing validation
- Companion planting rules
- Sunlight simulation (suncalc)
- Growth stage preview
- Yield estimation

### Phase 3 (3-4 weeks): Multiplayer Co-Op
- IC WebSocket integration
- Live cursors + presence
- Real-time sync of edits
- Permissions (owner/editor/viewer)
- Version history
- In-scene annotations

### Phase 4 (2-3 weeks): Polish + Pro Features
- Paint brush tool for rapid placement
- Terrain + irrigation visualization
- Budget system with IC tokens
- Voice notes
- Mobile touch optimization
- Wind shaders + advanced lighting

## Canister IDs (existing)
- Backend: `ghxmp-xiaaa-aaaao-ba4sq-cai`
- Frontend: `7rukv-hqaaa-aaaao-ba6ma-cai`
- NFT Assets: `gawk3-2qaaa-aaaao-ba4sa-cai`
- Uploads: `r53pg-maaaa-aaaao-ba7na-cai`

## Open-Source Libraries & Assets
- 3D core: `@react-three/fiber` + `@react-three/drei` (MIT)
- Garden reference: github.com/marty-mcgee/threed-garden (MIT)
- Procedural plants: github.com/dgreenheck/ez-tree (MIT)
- Terrain: github.com/IceCreamYou/THREE.Terrain (MIT)
- Sunlight: suncalc (MIT)
- Free CC0 3D assets: Kenney.nl, three.js examples, Sketchfab CC0
- IC WebSockets: ic-websocket-cdk-rs, ic-websocket-sdk-js
- UI: Tailwind + shadcn (already installed)
