import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface PoolStats {
    shop: bigint;
    totalByRarity: {
        rare: bigint;
        common: bigint;
        uncommon: bigint;
    };
    qrAssigned: bigint;
    airdropped: bigint;
    ready: bigint;
}
export interface TreasuryTransaction {
    id: string;
    token: TreasuryToken;
    to_principal?: Principal;
    memo?: string;
    from_principal?: Principal;
    amount_e8s: bigint;
    offer_id?: string;
    timestamp: Timestamp;
    tx_type: TreasuryTxType;
}
export interface TransformationOutput {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export interface FoundersMintResult {
    tokenId: string;
    recipient: Principal;
    standard: NFTStandard;
}
export interface TokenPrice {
    token: OracleToken;
    price_in_icp_e8s: bigint;
    last_updated: Timestamp;
}
export interface StageHistory {
    stage: PlantStage;
    notes: string;
    timestamp: Timestamp;
}
export interface CreateCommentInput {
    post_id: PostId;
    content: string;
}
export interface MembershipNFTPublic {
    id: bigint;
    nft_id?: string;
    issued_at: Timestamp;
    owner: Principal;
    tier: MembershipTier;
    is_founder: boolean;
    layer_combination: Array<bigint>;
    rarity_tier?: RarityTier;
    nft_standard: NFTStandard;
}
export interface CallerDiscount {
    discountPercent: bigint;
    rarity: string;
    tokenId?: bigint;
}
export interface CreateProposalInput {
    title: string;
    ends_at: Timestamp;
    description: string;
    options: Array<string>;
    proposal_type: ProposalType;
}
export interface AirdropAssignment {
    recipient: Principal;
    nftId: bigint;
}
export interface ResaleListingPublic {
    id: string;
    seller: Principal;
    is_active: boolean;
    price_icp: number;
    rarity_tier: RarityTier;
    listed_at: Timestamp;
    plant_id: PlantId;
}
export type RecipeId = bigint;
export type {
    RecipePublic as Recipe,
    RecipeCategory,
    Difficulty,
    Ingredient,
    RecipeStep,
    CreateRecipeInput,
    UpdateRecipeInput,
} from "./declarations/backend.did";
export interface LifecycleUpgradeEvent {
    new_stage: string;
    old_nft_id?: string;
    old_stage: string;
    upgraded_at: Timestamp;
    new_nft_id: string;
    plant_id: PlantId;
}
export interface TrayPublic {
    id: TrayId;
    cells: Array<PlantId | null>;
    name: string;
    sort_order: bigint;
    cell_count: bigint;
    zone_notes: string;
    planting_date: Timestamp;
    nft_standard: NFTStandard;
    zone_photo_keys: Array<string>;
}
export interface ShippingAddress {
    full_name: string;
    street_line1: string;
    street_line2?: string;
    city: string;
    state: string;
    zip: string;
    phone: string;
}
export interface CreateOrderInput {
    shipping?: ShippingAddress;
    pickup: boolean;
    items: Array<OrderItem>;
}
export interface SavedSchedule {
    id: ScheduleId;
    owner: Principal;
    created_at: Timestamp;
    stage: string;
    inputs: Array<string>;
    share_token: string;
}
export interface FoundersMintInput {
    layerCombination: Array<bigint>;
    recipient: Principal;
    rarityTier: RarityTier;
    badgeImageKey: string;
    nft_standard: NFTStandard;
    compositeImageKey: string;
}
export interface SaveProfileInput {
    bio: string;
    username: string;
    avatar_key?: string;
}
export interface PlantTimeline {
    stage_history: Array<StageHistory>;
    feedings: Array<FeedingPublic>;
    plant: PlantPublic;
}
export interface CounterOfferInput {
    counter_amount: bigint;
    offer_id: string;
    counter_token: OfferToken;
}
export type CommentId = bigint;
export interface PoolNFTPublic__1 {
    id: bigint;
    status: PoolNFTStatus__1;
    shopProductId?: bigint;
    assignedAt?: Timestamp;
    assignedTo?: Principal;
    layerCombination: Array<bigint>;
    rarityTier: RarityTier;
    claimTokenId?: string;
    compositeImageKey: string;
}
export interface SubmitOfferInput {
    nft_id: string;
    offered_token: OfferToken;
    offered_amount: bigint;
}
export interface ScheduleEntry {
    timing: string;
    dilution: string;
    stage: string;
    notes: string;
    frequency: string;
    input_name: string;
}
export interface QRAssignmentResult {
    claimTokenId: string;
    nftId: bigint;
}
export interface PoolNFTPublic {
    id: bigint;
    status: PoolNFTStatus;
    generated_at: Timestamp;
    token_id: string;
    image_key: string;
    layer_combo: Array<string>;
    rarity: PoolNFTRarity;
}
export type ProposalId = bigint;
export interface OfferHistoryEntry {
    by: Principal;
    token: OfferToken;
    action: OfferAction;
    timestamp: Timestamp;
    amount: bigint;
}
export interface http_header {
    value: string;
    name: string;
}
export interface http_request_result {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export interface CreateProductInput {
    image_key?: string;
    name: string;
    price_cents: bigint;
    description: string;
    inventory_category?: InventoryCategory;
    image_keys: Array<string>;
    category: ProductCategory;
    variety?: string;
    plant_id?: PlantId;
    shippable: boolean;
    shipping_flat_rate_cents?: bigint;
    weight_based: boolean;
    price_per_unit_cents?: bigint;
    unit_label?: string;
    inventory_quantity?: bigint;
}
export type ContainerSize = {
    __kind__: "Gal5Bucket";
    Gal5Bucket: null;
} | {
    __kind__: "Gal1";
    Gal1: null;
} | {
    __kind__: "Gal3";
    Gal3: null;
} | {
    __kind__: "Gal5";
    Gal5: null;
} | {
    __kind__: "Oz16";
    Oz16: null;
} | {
    __kind__: "Gal7GrowBag";
    Gal7GrowBag: null;
} | {
    __kind__: "Cell72";
    Cell72: null;
} | {
    __kind__: "Pot4Inch";
    Pot4Inch: null;
} | {
    __kind__: "InGround";
    InGround: null;
} | {
    __kind__: "Pot6Inch";
    Pot6Inch: null;
} | {
    __kind__: "Gal10GrowBag";
    Gal10GrowBag: null;
} | {
    __kind__: "Gal1New";
    Gal1New: null;
} | {
    __kind__: "Gal3New";
    Gal3New: null;
} | {
    __kind__: "Gal7Pot";
    Gal7Pot: null;
} | {
    __kind__: "Cell128";
    Cell128: null;
} | {
    __kind__: "Gal15GrowBag";
    Gal15GrowBag: null;
} | {
    __kind__: "Gal5GrowBag";
    Gal5GrowBag: null;
} | {
    __kind__: "Other";
    Other: string;
};
export type BulkCreateResult = {
    __kind__: "ok";
    ok: ProductPublic;
} | {
    __kind__: "err";
    err: string;
};
export interface BatchGiftPackPublic {
    id: string;
    creator: Principal;
    plant_ids: Array<PlantId>;
    redeemed: boolean;
    created_at: Timestamp;
    redeemed_by?: Principal;
    claim_token_id: ClaimTokenId;
    highest_rarity_pct: bigint;
}
export interface TransplantInput {
    container_size: ContainerSize;
    plant_id: PlantId;
}
export interface Offer {
    id: string;
    nft_id: string;
    status: OfferStatus;
    updated_at: Timestamp;
    history: Array<OfferHistoryEntry>;
    created_at: Timestamp;
    seller: Principal;
    offered_token: OfferToken;
    offered_amount: bigint;
    buyer: Principal;
    icp_equivalent: bigint;
}
export type FeedingId = bigint;
export interface CreatePlantInput {
    container_size?: ContainerSize;
    date_purchased?: Timestamp;
    origin?: string;
    common_name?: string;
    source_plant_id?: PlantId;
    cell_position: bigint;
    watering_schedule?: string;
    pest_notes?: string;
    tray_id: TrayId;
    notes: string;
    planting_date: Timestamp;
    additional_notes?: string;
    genetics: string;
    variety: string;
    nft_standard: NFTStandard;
    latin_name?: string;
}
export interface SendTokenInput {
    tokenSymbol: string;
    recipientAddress: string;
    amount: bigint;
}
export interface StoredFile {
    data: Uint8Array;
    path: string;
    size: bigint;
    mime_type: string;
    layer: string;
    filename: string;
    uploaded_at: Timestamp;
}
export interface ShopListingFile {
    data: Uint8Array;
    mime_type: string;
}
export interface ProposalPublic {
    id: ProposalId;
    title: string;
    vote_counts: Array<bigint>;
    ends_at: Timestamp;
    description: string;
    created_at: Timestamp;
    created_by: Principal;
    voter_count: bigint;
    caller_vote?: bigint;
    options: Array<string>;
    proposal_type: ProposalType;
}
export interface UploadSessionStatus {
    total_chunks: bigint;
    received: bigint;
    started_at: Timestamp;
}
export type Timestamp = bigint;
export interface PostPublic {
    id: PostId;
    updated_at: Timestamp;
    content: string;
    author_text: string;
    comment_count: bigint;
    image_key?: string;
    like_count: bigint;
    created_at: Timestamp;
    author_principal?: Principal;
    author_username?: string;
    is_anonymous: boolean;
    caller_liked: boolean;
}
export interface ProductPublic {
    id: ProductId;
    active: boolean;
    image_key?: string;
    name: string;
    price_cents: bigint;
    description: string;
    inventory_category?: InventoryCategory;
    image_keys: Array<string>;
    category: ProductCategory;
    variety?: string;
    plant_id?: PlantId;
    nft_token_id?: bigint;
    shippable: boolean;
    shipping_flat_rate_cents?: bigint;
    weight_based: boolean;
    price_per_unit_cents: bigint;
    unit_label?: string;
    inventory_remaining?: bigint;
}
export interface ShopAssignment {
    nftId: bigint;
    price: bigint;
}
export type PostId = bigint;
export interface OrderItem {
    product_id: ProductId;
    price_cents: bigint;
    quantity: bigint;
    plant_id?: PlantId;
}
export interface WeatherRecord {
    id: WeatherRecordId;
    latitude: number;
    temperature_max: number;
    temperature_min: number;
    precipitation: number;
    wind_speed?: number;
    date: string;
    user: Principal;
    humidity?: number;
    recorded_at: Timestamp;
    longitude: number;
}
export interface WalletTransaction {
    id: string;
    status: TxStatus;
    counterparty: string;
    tokenSymbol: string;
    timestamp: Timestamp;
    txType: TxType;
    amount: bigint;
}
export type WeatherRecordId = bigint;
export interface OrderPublic {
    id: OrderId;
    status: OrderStatus;
    subtotal_cents: bigint;
    shipping_cents: bigint;
    shipping_address?: string;
    shipping?: ShippingAddress;
    created_at: Timestamp;
    pickup: boolean;
    line_nft_token_ids: Array<bigint>;
    buyer: Principal;
    items: Array<OrderItem>;
    total_cents: bigint;
}
export interface UpdateProductInput {
    active?: boolean;
    product_id: ProductId;
    image_key?: string;
    name?: string;
    price_cents?: bigint;
    description?: string;
    image_keys?: Array<string>;
}
export interface UploadResult {
    layers_detected: bigint;
    asset_canister_id: string;
    total_files: bigint;
    layer_summaries: Array<LayerSummary>;
}
export interface FeedingPublic {
    id: FeedingId;
    dosage_amount: string;
    date: Timestamp;
    nutrient_type: string;
    product_name: string;
    notes?: string;
    plant_id: PlantId;
}
export interface CreatePostInput {
    content: string;
    image_key?: string;
    anonymous: boolean;
}
export type InventoryCategory = {
    __kind__: "OtherSize";
    OtherSize: string;
} | {
    __kind__: "Gal1";
    Gal1: null;
} | {
    __kind__: "Gal3";
    Gal3: null;
} | {
    __kind__: "Gal5";
    Gal5: null;
} | {
    __kind__: "Oz16";
    Oz16: null;
} | {
    __kind__: "InGround";
    InGround: null;
};
export interface WalletToken {
    decimals: number;
    balance: bigint;
    name: string;
    usdValue: number;
    symbol: string;
}
export interface PlantPublic {
    id: PlantId;
    nft_id?: string;
    container_size?: ContainerSize;
    origin?: string;
    sold: boolean;
    is_transplanted: boolean;
    common_name?: string;
    for_sale: boolean;
    created_by: Principal;
    is_cooked: boolean;
    source_plant_id?: PlantId;
    cell_position: bigint;
    watering_schedule?: string;
    pest_notes?: string;
    sold_to?: Principal;
    stage: PlantStage;
    germination_date?: Timestamp;
    tray_id: TrayId;
    notes: string;
    planting_date: Timestamp;
    transplant_date?: Timestamp;
    additional_notes?: string;
    photo_keys: Array<string>;
    genetics: string;
    variety: string;
    transplant_plant_id?: PlantId;
    nft_standard: NFTStandard;
    photos: Array<string>;
    latin_name?: string;
}
export interface TransformationInput {
    context: Uint8Array;
    response: http_request_result;
}
export interface UpdatePlantMetadataInput {
    notes?: string;
    genetics?: string;
    photos?: Array<string>;
    plant_id: PlantId;
}
export type PlantId = bigint;
export interface MintRWAProvenanceInput {
    custom_notes: string;
    artwork_layer_id: ArtworkLayerId;
    rarity_tier: bigint;
    plant_id: PlantId;
}
export interface CreateTrayInput {
    name: string;
    planting_date: Timestamp;
    nft_standard: NFTStandard;
}
export type ClaimTokenId = string;
export type AssignAction = {
    __kind__: "AssignToQR";
    AssignToQR: {
        claim_token: string;
    };
} | {
    __kind__: "ListOnShop";
    ListOnShop: {
        product_id: bigint;
    };
} | {
    __kind__: "Airdrop";
    Airdrop: {
        to: Principal;
    };
};
export type ArtworkLayerId = bigint;
export type TrayId = bigint;
export interface ArtworkLayer {
    id: ArtworkLayerId;
    layer_number: bigint;
    name: string;
    object_key: string;
    uploaded_at: Timestamp;
}
export interface AddWeatherRecordInput {
    latitude: number;
    temperature_max: number;
    temperature_min: number;
    precipitation: number;
    wind_speed?: number;
    date: string;
    humidity?: number;
    longitude: number;
}
export interface CommentPublic {
    id: CommentId;
    post_id: PostId;
    content: string;
    created_at: Timestamp;
    author: Principal;
    author_username?: string;
}
export interface ClaimTokenPublic {
    id: ClaimTokenId;
    created_at: Timestamp;
    redeemed_at?: Timestamp;
    redeemed_by?: Principal;
    claim_data: string;
    rarity_tier: RarityTier;
    plant_id: PlantId;
}
export type PoolNFTStatus = {
    __kind__: "ListedOnShop";
    ListedOnShop: {
        at: Timestamp;
        product_id: bigint;
    };
} | {
    __kind__: "Ready";
    Ready: null;
} | {
    __kind__: "AssignedToQR";
    AssignedToQR: {
        at: Timestamp;
        claim_token: string;
    };
} | {
    __kind__: "Airdropped";
    Airdropped: {
        at: Timestamp;
        to: Principal;
    };
};
export interface UpdateCellDataInput {
    origin?: string;
    common_name?: string;
    watering_schedule?: string;
    pest_notes?: string;
    notes?: string;
    additional_notes?: string;
    plant_id: PlantId;
    latin_name?: string;
}
export interface PoolDashboard {
    total: bigint;
    listed_on_shop: bigint;
    assigned_to_qr: bigint;
    airdropped: bigint;
    ready: bigint;
}
export interface UserProfilePublic {
    bio: string;
    username: string;
    avatar_key?: string;
    following_count: bigint;
    created_at: Timestamp;
    follower_count: bigint;
    principal_id: Principal;
}
export interface TreasuryBalance {
    token: TreasuryToken;
    balance_e8s: bigint;
}
export type ScheduleId = string;
export type ProductId = bigint;
export interface LayerSummary {
    file_names: Array<string>;
    layer: string;
    file_count: bigint;
}
export type OrderId = bigint;
export interface AddFeedingInput {
    dosage_amount: string;
    date: Timestamp;
    nutrient_type: string;
    product_name: string;
    notes?: string;
    plant_id: PlantId;
}
export enum MembershipTier {
    Premium = "Premium",
    Standard = "Standard"
}
export enum NFTStandard {
    EXT = "EXT",
    Hedera = "Hedera",
    ICRC37 = "ICRC37"
}
export enum OfferAction {
    Countered = "Countered",
    Rejected = "Rejected",
    Accepted = "Accepted",
    Cancelled = "Cancelled",
    Submitted = "Submitted"
}
export enum OfferStatus {
    Countered = "Countered",
    Rejected = "Rejected",
    Accepted = "Accepted",
    Cancelled = "Cancelled",
    Pending = "Pending"
}
export enum OrderStatus {
    PickedUp = "PickedUp",
    Cancelled = "Cancelled",
    Shipped = "Shipped",
    Pending = "Pending"
}
export enum PlantStage {
    Seedling = "Seedling",
    Seed = "Seed",
    Mature = "Mature"
}
export enum PoolNFTStatus__1 {
    Shop = "Shop",
    QRAssigned = "QRAssigned",
    Ready = "Ready",
    Airdropped = "Airdropped"
}
export enum ProductCategory {
    Spice = "Spice",
    Seedling = "Seedling",
    GardenInputs = "GardenInputs",
    Gallon1 = "Gallon1",
    Gallon5 = "Gallon5",
    LivePlant = "LivePlant",
    DriedPods = "DriedPods",
    GardenAmendment = "GardenAmendment",
    FreshPodsByLb = "FreshPodsByLb",
    FreshPodsFlatRate = "FreshPodsFlatRate",
}
export enum ProposalType {
    General = "General",
    Seasoning = "Seasoning",
    PlantVariety = "PlantVariety"
}
export enum RarityTier {
    Rare = "Rare",
    Uncommon = "Uncommon",
    Common = "Common"
}
export enum TreasuryToken {
    ICP = "ICP",
    ckBTC = "ckBTC",
    ckETH = "ckETH",
    ckUSDC = "ckUSDC",
    ckUSDT = "ckUSDT"
}
export enum TreasuryTxType {
    Deposit = "Deposit",
    Withdrawal = "Withdrawal",
    OfferSettlement = "OfferSettlement",
    Transfer = "Transfer"
}
export enum TxStatus {
    pending = "pending",
    completed = "completed",
    failed = "failed"
}
export enum TxType {
    receive = "receive",
    send = "send"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    acceptOffer(offerId: string): Promise<Offer>;
    addArtworkLayer(name: string, object_key: string, layer_number: bigint): Promise<ArtworkLayer>;
    addFeedingRecord(input: AddFeedingInput): Promise<FeedingPublic>;
    addPlantPhoto(plant_id: PlantId, photo_key: string): Promise<void>;
    addWeatherRecord(input: AddWeatherRecordInput): Promise<WeatherRecord>;
    addZonePhoto(tray_id: TrayId, photo_key: string): Promise<void>;
    adminSubmitToDAB(collectionName: string, collectionDescription: string, standard: string, canisterIdOverride: string | null): Promise<{
        __kind__: "ok";
        ok: string;
    } | {
        __kind__: "err";
        err: string;
    }>;
    airdropNFT(token_id: string, recipient: Principal): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    assignPoolNFT(nftId: bigint, action: AssignAction): Promise<void>;
    batchAirdropFromPool(assignments: Array<AirdropAssignment>): Promise<{
        failed: bigint;
        succeeded: bigint;
    }>;
    batchAssignPoolNFTs(nftIds: Array<bigint>, action: AssignAction): Promise<bigint>;
    batchAssignToQR(nftIds: Array<bigint>): Promise<Array<QRAssignmentResult>>;
    batchListOnShop(assignments: Array<ShopAssignment>): Promise<{
        failed: bigint;
        succeeded: bigint;
    }>;
    batchMintFoundersCollection(entries: Array<FoundersMintInput>): Promise<Array<FoundersMintResult>>;
    beginArtworkUpload(totalChunks: bigint): Promise<void>;
    bulkCreateProducts(inputs: Array<CreateProductInput>): Promise<Array<BulkCreateResult>>;
    buyResaleListing(listing_id: string): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    cancelOffer(offerId: string): Promise<Offer>;
    cancelResaleListing(listing_id: string): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    clearArtworkFiles(): Promise<void>;
    counterOffer(input: CounterOfferInput): Promise<Offer>;
    createBatchGiftPack(plant_ids: Array<PlantId>): Promise<{
        __kind__: "ok";
        ok: BatchGiftPackPublic;
    } | {
        __kind__: "err";
        err: string;
    }>;
    createComment(input: CreateCommentInput): Promise<CommentPublic>;
    createDAOProposal(input: CreateProposalInput): Promise<ProposalPublic>;
    createOrder(buyer: Principal, input: CreateOrderInput): Promise<OrderPublic>;
    createPlant(input: CreatePlantInput): Promise<PlantPublic>;
    createPost(input: CreatePostInput): Promise<PostPublic>;
    createProduct(input: CreateProductInput): Promise<ProductPublic>;
    createRecipe(input: CreateRecipeInput): Promise<{
        recipe_id: RecipeId;
    }>;
    createTray(input: CreateTrayInput): Promise<TrayPublic>;
    dabTransform(input: TransformationInput): Promise<TransformationOutput>;
    deletePost(post_id: PostId): Promise<void>;
    deleteProduct(product_id: ProductId): Promise<void>;
    deleteRecipe(id: RecipeId): Promise<boolean>;
    deleteTray(tray_id: TrayId): Promise<void>;
    editPost(post_id: PostId, new_content: string): Promise<PostPublic>;
    ensureAdminProfile(): Promise<void>;
    ensureCallerProfile(): Promise<void>;
    finalizeArtworkUpload(): Promise<UploadResult>;
    followUser(target: Principal): Promise<void>;
    generateAllPoolNFTs(): Promise<bigint>;
    generateClaimToken(plant_id: PlantId, rarity_tier: RarityTier): Promise<ClaimTokenPublic>;
    generatePickupQRPayload(plant_id: PlantId): Promise<string>;
    getActiveResaleListings(): Promise<Array<ResaleListingPublic>>;
    getAdminPrincipal(): Promise<string>;
    getAdminPrincipals(): Promise<Array<string>>;
    getArtworkFile(path: string): Promise<Uint8Array | null>;
    getShopListingFile(path: string): Promise<ShopListingFile | null>;
    getArtworkUploadResult(): Promise<UploadResult>;
    getArtworkUploadStatus(): Promise<UploadSessionStatus>;
    getBatchGiftPack(claim_token_id: ClaimTokenId): Promise<BatchGiftPackPublic | null>;
    getCallerMembership(): Promise<MembershipNFTPublic | null>;
    getCallerDiscount(): Promise<CallerDiscount>;
    getCallerUserProfile(): Promise<UserProfilePublic | null>;
    getCallerUserRole(): Promise<UserRole>;
    getCanisterId(): Promise<string>;
    getClaimToken(token_id: ClaimTokenId): Promise<ClaimTokenPublic | null>;
    getDAOProposal(proposal_id: ProposalId): Promise<ProposalPublic | null>;
    getDAOStats(): Promise<{
        totalVotes: bigint;
        totalProposals: bigint;
        activeProposals: bigint;
    }>;
    getFollowersCount(user: Principal): Promise<bigint>;
    getFollowingCount(user: Principal): Promise<bigint>;
    getForSalePlants(): Promise<Array<PlantPublic>>;
    getMembershipPriceInToken(token: OracleToken): Promise<bigint>;
    getMyOffers(): Promise<Array<Offer>>;
    getMyResaleListings(): Promise<Array<ResaleListingPublic>>;
    getMySchedules(): Promise<Array<SavedSchedule>>;
    getMyWeatherRecords(limit: bigint): Promise<Array<WeatherRecord>>;
    getOffer(offerId: string): Promise<Offer | null>;
    getOffersForNft(nftId: string): Promise<Array<Offer>>;
    getOffersReceived(): Promise<Array<Offer>>;
    getOrder(order_id: OrderId): Promise<OrderPublic | null>;
    getPlant(plant_id: PlantId): Promise<PlantPublic | null>;
    getPlantTimeline(plant_id: PlantId): Promise<PlantTimeline | null>;
    getPoolDashboard(): Promise<PoolDashboard>;
    getPoolNFT(nftId: bigint): Promise<PoolNFTPublic | null>;
    getPoolNFTs(filter: PoolNFTStatus__1 | null, offset: bigint, limit: bigint): Promise<Array<PoolNFTPublic__1>>;
    getPoolStats(): Promise<PoolStats>;
    getProduct(product_id: ProductId): Promise<ProductPublic | null>;
    getPublicProfile(user: Principal): Promise<UserProfilePublic | null>;
    getRecipe(id: RecipeId): Promise<Recipe | null>;
    getScheduleByShareToken(share_token: string): Promise<SavedSchedule | null>;
    getScheduleData(stage: string, inputs: Array<string>): Promise<Array<ScheduleEntry>>;
    getTokenPriceInIcp(token: OracleToken): Promise<bigint>;
    getTokenPrices(): Promise<Array<TokenPrice>>;
    getTray(tray_id: TrayId): Promise<TrayPublic | null>;
    getTreasuryBalance(token: TreasuryToken): Promise<bigint>;
    getTreasuryBalances(): Promise<Array<TreasuryBalance>>;
    getTreasuryLedger(): Promise<Array<TreasuryTransaction>>;
    getUpgradeHistory(plant_id: PlantId): Promise<Array<LifecycleUpgradeEvent>>;
    getUserPosts(user: Principal): Promise<Array<PostPublic>>;
    getWalletAddress(): Promise<string>;
    getWalletBalances(): Promise<Array<WalletToken>>;
    getWalletTransactions(): Promise<Array<WalletTransaction>>;
    hasDAOAccess(): Promise<boolean>;
    hasMembership(): Promise<boolean>;
    isCallerAdmin(): Promise<boolean>;
    issueMembership(owner: Principal, tier: MembershipTier, nft_standard: NFTStandard): Promise<MembershipNFTPublic>;
    likePost(post_id: PostId): Promise<bigint>;
    listArtworkFiles(): Promise<Array<[string, bigint]>>;
    listArtworkLayers(): Promise<Array<ArtworkLayer>>;
    listCommentsByPost(post_id: PostId): Promise<Array<CommentPublic>>;
    listDAOProposals(): Promise<Array<ProposalPublic>>;
    listMyPlants(): Promise<Array<PlantPublic>>;
    listNFTForResale(plant_id: PlantId, price_icp: number): Promise<{
        __kind__: "ok";
        ok: ResaleListingPublic;
    } | {
        __kind__: "err";
        err: string;
    }>;
    listOrdersByBuyer(): Promise<Array<OrderPublic>>;
    listPlants(): Promise<Array<PlantPublic>>;
    listPlantsByStage(stage: PlantStage): Promise<Array<PlantPublic>>;
    listPoolNFTs(statusFilter: PoolNFTStatus | null, limit: bigint): Promise<Array<PoolNFTPublic>>;
    listPosts(): Promise<Array<PostPublic>>;
    listProducts(): Promise<Array<ProductPublic>>;
    listProductsByCategory(category: ProductCategory): Promise<Array<ProductPublic>>;
    listRecipes(): Promise<Array<Recipe>>;
    listTrays(): Promise<Array<TrayPublic>>;
    markPlantGerminated(plant_id: PlantId, germination_date: Timestamp): Promise<void>;
    mintEXT(plantId: bigint, imageKey: string, attributes: Array<[string, string]>): Promise<string>;
    mintHederaNFT(plant_id: PlantId, image_key: string | null, attributes: Array<[string, string]>): Promise<string>;
    mintICRC37(plant_id: PlantId, image_key: string | null, attributes: Array<[string, string]>): Promise<string>;
    mintRWAProvenance(input: MintRWAProvenanceInput): Promise<string>;
    placeOrder(input: CreateOrderInput): Promise<OrderPublic>;
    preGenerateNFTPool(layerCount: bigint, layerFileCounts: Array<bigint>): Promise<{
        ok: boolean;
        total: bigint;
    }>;
    priceOracleTransform(input: TransformationInput): Promise<TransformationOutput>;
    redeemBatchClaim(token_id: ClaimTokenId): Promise<{
        __kind__: "ok";
        ok: BatchGiftPackPublic;
    } | {
        __kind__: "err";
        err: string;
    }>;
    redeemClaim(token_id: ClaimTokenId): Promise<ClaimTokenPublic>;
    refreshTokenPrices(): Promise<boolean>;
    rejectOffer(offerId: string): Promise<Offer>;
    removePlantPhoto(plant_id: PlantId, photo_key: string): Promise<void>;
    removeZonePhoto(tray_id: TrayId, photo_key: string): Promise<void>;
    resetOrphanPoolNFT(nftId: bigint): Promise<boolean>;
    resetPoolNFT(nftId: bigint): Promise<{
        __kind__: "ok";
        ok: string;
    } | {
        __kind__: "err";
        err: string;
    }>;
    saveCallerUserProfile(input: SaveProfileInput): Promise<void>;
    saveSchedule(stage: string, inputs: Array<string>): Promise<ScheduleId>;
    seedDefaultRecipes(): Promise<void>;
    sendToken(input: SendTokenInput): Promise<{
        __kind__: "ok";
        ok: string;
    } | {
        __kind__: "err";
        err: string;
    }>;
    setForSale(plant_id: PlantId, for_sale: boolean): Promise<void>;
    setPlantNFT(plant_id: PlantId, nft_id: string): Promise<void>;
    storeArtworkFile(path: string, data: Uint8Array, mimeType: string): Promise<StoredFile>;
    submitOffer(input: SubmitOfferInput): Promise<Offer>;
    toggleCooked(plant_id: PlantId): Promise<void>;
    toggleRecipeFeatured(id: RecipeId): Promise<boolean>;
    transform(input: TransformationInput): Promise<TransformationOutput>;
    transplantCell(input: TransplantInput): Promise<PlantPublic>;
    treasuryDeposit(token: TreasuryToken, amount: bigint, memo: string | null): Promise<TreasuryTransaction>;
    treasuryTransfer(token: TreasuryToken, amount: bigint, from: Principal, to: Principal, memo: string | null): Promise<TreasuryTransaction>;
    treasuryWithdraw(token: TreasuryToken, amount: bigint, to: Principal, memo: string | null): Promise<TreasuryTransaction>;
    triggerLifecycleUpgrade(plant_id: PlantId, new_stage: string): Promise<string>;
    unfollowUser(target: Principal): Promise<void>;
    unlikePost(post_id: PostId): Promise<bigint>;
    updateCellData(input: UpdateCellDataInput): Promise<void>;
    updateOrderStatus(order_id: OrderId, status: OrderStatus): Promise<void>;
    updatePlantMetadata(input: UpdatePlantMetadataInput): Promise<void>;
    updatePlantStage(plant_id: PlantId, new_stage: PlantStage, notes: string): Promise<void>;
    updateProduct(input: UpdateProductInput): Promise<void>;
    updateRecipe(input: UpdateRecipeInput): Promise<boolean>;
    updateTrayName(tray_id: TrayId, new_name: string): Promise<void>;
    updateTrayOrder(tray_id: TrayId, new_order: bigint): Promise<void>;
    updateZoneNotes(tray_id: TrayId, notes: string): Promise<void>;
    uploadArtworkChunk(chunkIndex: bigint, totalChunks: bigint, data: Uint8Array): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    voteOnProposal(proposal_id: ProposalId, option_index: bigint): Promise<void>;
}
