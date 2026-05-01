export type {
  PlantPublic as Plant,
  TrayPublic as Tray,
  ProductPublic as Product,
  OrderPublic as Order,
  ProposalPublic as Proposal,
  PostPublic as Post,
  UserProfilePublic as UserProfile,
  MembershipNFTPublic as MembershipNFT,
  OrderItem,
  CommentPublic as Comment,
  FeedingPublic as Feeding,
  StageHistory,
  PlantTimeline,
  CreateOrderInput,
  CreatePlantInput,
  CreatePostInput,
  CreateProductInput,
  CreateProposalInput,
  CreateTrayInput,
  SaveProfileInput,
  AddFeedingInput,
  UpdateProductInput,
  UpdatePlantMetadataInput,
  UpdateCellDataInput,
  TransplantInput,
  AddWeatherRecordInput,
  MintRWAProvenanceInput,
  WeatherRecord,
  ArtworkLayer,
  ContainerSize,
  PlantId,
  TrayId,
  ProductId,
  OrderId,
  PostId,
  ProposalId,
  ArtworkLayerId,
  WeatherRecordId,
  Recipe,
  RecipeId,
  CreateRecipeInput,
  UpdateRecipeInput,
  Offer,
  OfferHistoryEntry,
  SubmitOfferInput,
  CounterOfferInput,
  TreasuryBalance,
  TreasuryTransaction,
  TokenPrice,
  PoolNFTPublic as PoolNFTRecord,
  PoolDashboard,
  UploadResult,
  LayerSummary,
} from "../backend";

export {
  PlantStage,
  ProductCategory,
  OrderStatus,
  NFTStandard,
  MembershipTier,
  ProposalType,
  UserRole,
  OfferStatus,
  OfferAction,
  TreasuryToken,
  TreasuryTxType,
  RarityTier,
} from "../backend";

// ── Pool NFT frontend types ───────────────────────────────────────────────────

export type PoolNFTStatusKind = "Ready" | "Airdropped" | "Shop" | "QRAssigned";

export interface PoolStats {
  ready: number;
  airdropped: number;
  shop: number;
  qrAssigned: number;
  total: number;
  common: number;
  uncommon: number;
  rare: number;
}

export interface CartItem {
  product_id: bigint;
  plant_id?: bigint;
  name: string;
  variety?: string;
  price_cents: bigint;
  quantity: number;
  category: string;
}

export interface WalletBalance {
  icp: string;
  ckBtc: string;
  ckEth: string;
  ckUsdc: string;
  ckUsdt: string;
}

export const SOCIAL_LINKS = {
  facebook: "https://www.facebook.com/share/18FY3jmLuY/?mibextid=wwXIfr",
  x: "https://x.com/icspicyrwa?s=21",
  instagram: "https://www.instagram.com/icspicyrwa?igsh=MXAzc2RoYW1mN2t2aw==",
  tiktok: "https://www.tiktok.com/@icspicyrwa?_r=1&_t=ZP-93jkqSSwaXW",
} as const;

export const CHILI_VARIETIES = [
  "Apocalypse Scorpion",
  "Death Spiral",
  "RB003",
  "Fried Chicken",
  "Scotch Bonnet",
  "Sugar Rush Peach",
  "Aji Charapita",
  "Calabrian (Cherry)",
  "Fish Pepper",
  "Farmers Market Jalapeno",
  "Aji Guyana",
  "Acoma Pueblo",
] as const;

export type ChiliVariety = (typeof CHILI_VARIETIES)[number];

// NIMS-specific UI types
export interface NIMSCellData {
  trayId: bigint;
  cellIndex: number;
}

export type ContainerSizeOption =
  | "16oz"
  | "1gal"
  | "3gal"
  | "5gal"
  | "inground"
  | "other";

// Token display config
export const OFFER_TOKENS = [
  "ICP",
  "ckBTC",
  "ckETH",
  "ckUSDC",
  "ckUSDT",
] as const;
export type OfferTokenSymbol = (typeof OFFER_TOKENS)[number];

export const TOKEN_DECIMALS: Record<OfferTokenSymbol, number> = {
  ICP: 8,
  ckBTC: 8,
  ckETH: 18,
  ckUSDC: 6,
  ckUSDT: 6,
};

export const TOKEN_DISPLAY: Record<
  OfferTokenSymbol,
  { symbol: string; colorClass: string; bgClass: string; borderClass: string }
> = {
  ICP: {
    symbol: "ICP",
    colorClass: "text-purple-400",
    bgClass: "bg-purple-500/20",
    borderClass: "border-purple-500/30",
  },
  ckBTC: {
    symbol: "₿",
    colorClass: "text-orange-400",
    bgClass: "bg-orange-500/20",
    borderClass: "border-orange-500/30",
  },
  ckETH: {
    symbol: "Ξ",
    colorClass: "text-blue-400",
    bgClass: "bg-blue-500/20",
    borderClass: "border-blue-500/30",
  },
  ckUSDC: {
    symbol: "$",
    colorClass: "text-emerald-400",
    bgClass: "bg-emerald-500/20",
    borderClass: "border-emerald-500/30",
  },
  ckUSDT: {
    symbol: "₮",
    colorClass: "text-teal-400",
    bgClass: "bg-teal-500/20",
    borderClass: "border-teal-500/30",
  },
};
