import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface Account {
  'owner' : Principal,
  'subaccount' : [] | [Subaccount],
}
export interface ActivityEntry {
  'plantName' : string,
  'actionType' : string,
  'detail' : string,
  'author' : Principal,
  'plantId' : PlantId,
  'timestamp' : Timestamp,
}
export interface AddFeedingInput {
  'dosage_amount' : string,
  'date' : Timestamp,
  'nutrient_type' : string,
  'product_name' : string,
  'notes' : [] | [string],
  'plant_id' : PlantId,
}
export interface AddPlantResult {
  'claimToken' : string,
  'nftTokenId' : bigint,
  'plantId' : PlantId,
}
export interface AddWeatherRecordInput {
  'latitude' : number,
  'temperature_max' : number,
  'temperature_min' : number,
  'precipitation' : number,
  'wind_speed' : [] | [number],
  'date' : string,
  'humidity' : [] | [number],
  'longitude' : number,
}
export interface AdminOrderItemPublic {
  'product_id' : ProductId,
  'price_cents' : bigint,
  'product_name' : string,
  'quantity' : bigint,
  'plant_id' : [] | [PlantId],
}
export interface AdminOrderPublic {
  'id' : OrderId,
  'status' : OrderStatus,
  'is_paid' : boolean,
  'subtotal_cents' : bigint,
  'pickup_claim_tokens' : Array<string>,
  'shipping_address' : [] | [string],
  'shipping_cents' : bigint,
  'shipping' : [] | [ShippingAddress],
  'created_at' : Timestamp,
  'pickup' : boolean,
  'line_nft_token_ids' : Array<bigint>,
  'buyer' : Principal,
  'items' : Array<AdminOrderItemPublic>,
  'total_cents' : bigint,
}
export type AdminOrderStatusFilter = { 'All' : null } |
  { 'Paid' : null } |
  { 'PickedUp' : null } |
  { 'Cancelled' : null } |
  { 'Shipped' : null } |
  { 'Pending' : null };
export interface AdminUserPage {
  'total' : bigint,
  'rows' : Array<AdminUserRow>,
}
export interface AdminUserRow {
  'username' : string,
  'avatar_key' : [] | [string],
  'raven_tier' : string,
  'created_at' : bigint,
  'last_active' : [] | [bigint],
  'nft_count' : bigint,
  'follower_count' : bigint,
  'principal_id' : Principal,
  'location' : [] | [string],
}
export interface AdminWithdrawTokensResult {
  'blockIndex' : [] | [bigint],
  'message' : string,
  'success' : boolean,
}
export interface AirdropAssignment { 'recipient' : Principal, 'nftId' : bigint }
export interface ApprovalInfo {
  'memo' : [] | [Uint8Array | number[]],
  'from_subaccount' : [] | [Uint8Array | number[]],
  'created_at_time' : [] | [bigint],
  'expires_at' : [] | [bigint],
  'spender' : Account,
}
export interface ApproveTokenArg {
  'token_id' : bigint,
  'approval_info' : ApprovalInfo,
}
export type ApproveTokenError = {
    'GenericError' : { 'message' : string, 'error_code' : bigint }
  } |
  { 'Duplicate' : { 'duplicate_of' : bigint } } |
  { 'InvalidSpender' : null } |
  { 'NonExistingTokenId' : null } |
  { 'Unauthorized' : null } |
  { 'CreatedInFuture' : { 'ledger_time' : bigint } } |
  { 'GenericBatchError' : { 'message' : string, 'error_code' : bigint } } |
  { 'TooOld' : null };
export type ApproveTokenResult = { 'Ok' : bigint } |
  { 'Err' : ApproveTokenError };
export interface ArtworkLayer {
  'id' : ArtworkLayerId,
  'layer_number' : bigint,
  'name' : string,
  'object_key' : string,
  'uploaded_at' : Timestamp,
}
export type ArtworkLayerId = bigint;
export type AssignAction = { 'AssignToQR' : { 'claim_token' : string } } |
  { 'ListOnShop' : { 'product_id' : bigint } } |
  { 'Airdrop' : { 'to' : Principal } };
export interface AuditEntry {
  'ts' : Time,
  'action' : string,
  'admin' : Principal,
  'detail' : string,
}
export interface BadgeEarned {
  'tokenId' : bigint,
  'badgeType' : string,
  'isNew' : boolean,
}
export interface BadgePublic {
  'tokenId' : bigint,
  'source' : BadgeSource,
  'owner' : Principal,
  'badgeType' : string,
  'tier' : string,
  'metadataJson' : string,
  'earnedAt' : bigint,
}
export type BadgeSource = { 'game' : null } |
  { 'masterclass' : null };
export interface BatchGiftPackPublic {
  'id' : string,
  'creator' : Principal,
  'plant_ids' : Array<PlantId>,
  'redeemed' : boolean,
  'created_at' : Timestamp,
  'redeemed_by' : [] | [Principal],
  'claim_token_id' : ClaimTokenId,
  'highest_rarity_pct' : bigint,
}
export interface BreedingCrossPublic {
  'id' : bigint,
  'motherVarietyId' : bigint,
  'owner' : Principal,
  'fatherPlantId' : [] | [PlantId],
  'name' : string,
  'createdAt' : Timestamp,
  'generation' : string,
  'expectedTraits' : [] | [string],
  'fatherVarietyId' : bigint,
  'crossDate' : Timestamp,
  'notes' : [] | [string],
  'observedTraits' : [] | [string],
  'motherPlantId' : [] | [PlantId],
  'seedLotId' : [] | [bigint],
  'photos' : Array<string>,
}
export type BulkCreateResult = { 'ok' : ProductPublic } |
  { 'err' : string };
export interface BuyListedNftResult { 'message' : string, 'success' : boolean }
export interface CallerDiscount {
  'tokenId' : [] | [bigint],
  'discountPercent' : bigint,
  'rarity' : string,
}
export interface CallerVoteInfo {
  'nft_token_id' : bigint,
  'option_id' : bigint,
}
export interface CanisterTreasuryBalance {
  'balance' : bigint,
  'ledgerCanisterId' : string,
  'symbol' : string,
}
export type CellStatus = { 'Empty' : null } |
  { 'Dead' : null } |
  { 'Germinated' : null } |
  { 'Planted' : null } |
  { 'Transplanted' : null };
export interface ClaimTokenAdminPublic {
  'token' : string,
  'token_id' : bigint,
  'redeemed' : boolean,
  'plant_id' : [] | [PlantId],
}
export type ClaimTokenId = string;
export type CommentId = bigint;
export interface CommentPublic {
  'id' : CommentId,
  'post_id' : PostId,
  'content' : string,
  'author_text' : string,
  'like_count' : bigint,
  'created_at' : Timestamp,
  'author' : Principal,
  'author_username' : [] | [string],
  'is_anonymous' : boolean,
  'caller_liked' : boolean,
}
export interface ConfirmOrderPaymentDirectResult {
  'claim_tokens' : Array<string>,
  'message' : string,
  'nft_token_ids' : Array<bigint>,
  'success' : boolean,
}
export type ContainerSize = { 'Gal5Bucket' : null } |
  { 'Gal1' : null } |
  { 'Gal3' : null } |
  { 'Gal5' : null } |
  { 'Oz16' : null } |
  { 'Gal7GrowBag' : null } |
  { 'Cell72' : null } |
  { 'Pot4Inch' : null } |
  { 'InGround' : null } |
  { 'Pot6Inch' : null } |
  { 'Gal10GrowBag' : null } |
  { 'Gal1New' : null } |
  { 'Gal3New' : null } |
  { 'Gal7Pot' : null } |
  { 'Cell128' : null } |
  { 'Gal15GrowBag' : null } |
  { 'Gal5GrowBag' : null } |
  { 'Other' : string };
export interface CoopSeatPublic {
  'revoked' : boolean,
  'activatedAt' : bigint,
  'growerLocation' : [] | [string],
  'licenseInfo' : [] | [string],
  'growerName' : [] | [string],
}
export interface CoopStatus { 'tokenId' : bigint, 'seat' : CoopSeatPublic }
export interface CounterOfferInput {
  'counter_amount' : bigint,
  'offer_id' : string,
  'counter_token' : OfferToken,
}
export interface CreateCommentInput {
  'post_id' : PostId,
  'content' : string,
  'anonymous' : boolean,
}
export interface CreateGardenDesignResult { 'designId' : bigint }
export interface CreateOrderInput {
  'shipping' : [] | [ShippingAddress],
  'pickup' : boolean,
  'items' : Array<OrderItem>,
}
export interface CreatePlantInput {
  'container_size' : [] | [ContainerSize],
  'date_purchased' : [] | [Timestamp],
  'origin' : [] | [string],
  'common_name' : [] | [string],
  'source_plant_id' : [] | [PlantId],
  'cell_position' : bigint,
  'watering_schedule' : [] | [string],
  'pest_notes' : [] | [string],
  'tray_id' : TrayId,
  'notes' : string,
  'planting_date' : Timestamp,
  'additional_notes' : [] | [string],
  'genetics' : string,
  'variety' : string,
  'nft_standard' : NFTStandard,
  'latin_name' : [] | [string],
}
export interface CreatePlantingEventInput {
  'name' : string,
  'emoji' : string,
  'notes' : string,
  'scheduled_at' : Timestamp,
  'event_type' : PlantingEventType,
}
export interface CreatePostInput {
  'content' : string,
  'nft_token_id' : [] | [bigint],
  'image_key' : [] | [string],
  'image_keys' : Array<string>,
  'anonymous' : boolean,
  'plant_id' : [] | [bigint],
}
export interface CreateProductInput {
  'image_key' : [] | [string],
  'shipping_flat_rate_cents' : [] | [bigint],
  'unit_label' : [] | [string],
  'name' : string,
  'price_cents' : bigint,
  'description' : string,
  'inventory_quantity' : [] | [bigint],
  'inventory_category' : [] | [InventoryCategory],
  'image_keys' : Array<string>,
  'shippable' : boolean,
  'category' : ProductCategory,
  'variety' : [] | [string],
  'weight_based' : boolean,
  'price_per_unit_cents' : [] | [bigint],
  'plant_id' : [] | [PlantId],
}
export interface CreateProposalInput {
  'title' : string,
  'publish_now' : boolean,
  'description' : string,
  'voting_ends_at' : Timestamp,
  'category' : ProposalCategory,
  'voting_starts_at' : Timestamp,
  'options' : Array<ProposalOptionInput>,
}
export interface CreateRecipeInput {
  'title' : string,
  'fermentation_time' : [] | [string],
  'image_key' : [] | [string],
  'difficulty' : Difficulty,
  'slug' : string,
  'tags' : Array<string>,
  'tips' : Array<string>,
  'best_for' : Array<string>,
  'description' : string,
  'safety_notes' : Array<string>,
  'total_time' : [] | [string],
  'is_published' : boolean,
  'steps' : Array<RecipeStep>,
  'application_frequency' : [] | [string],
  'category' : RecipeCategory,
  'display_order' : bigint,
  'related_recipe_ids' : Array<bigint>,
  'ingredients' : Array<Ingredient>,
  'prep_time' : [] | [string],
  'application_rate' : [] | [string],
}
export interface CreateTrayInput {
  'name' : string,
  'planting_date' : Timestamp,
  'nft_standard' : NFTStandard,
}
export interface DailyFeatureStat {
  'day' : DayBucket,
  'action' : string,
  'feature' : string,
  'count' : bigint,
  'uniqueUsers' : bigint,
}
export interface DashboardStats {
  'needsAttention' : bigint,
  'germinatedToday' : bigint,
  'lastWateredMsAgo' : [] | [bigint],
  'totalPlants' : bigint,
}
export type DayBucket = bigint;
export type DeathCause = { 'DampingOff' : null } |
  { 'PestDamage' : null } |
  { 'Disease' : null } |
  { 'Overwatering' : null } |
  { 'Unknown' : null } |
  { 'Other' : null } |
  { 'Drought' : null };
export type Difficulty = { 'Beginner' : null } |
  { 'Advanced' : null } |
  { 'Intermediate' : null };
export type FeedingId = bigint;
export interface FeedingPublic {
  'id' : FeedingId,
  'dosage_amount' : string,
  'date' : Timestamp,
  'nutrient_type' : string,
  'product_name' : string,
  'notes' : [] | [string],
  'plant_id' : PlantId,
}
export interface FinishVideoUploadResult {
  'posterKey' : [] | [string],
  'videoKey' : string,
}
export interface FleetEntry {
  'name' : string,
  'isHealthy' : boolean,
  'cyclesBalance' : bigint,
  'memorySize' : bigint,
  'canisterId' : string,
}
export interface FoundersMintInput {
  'layerCombination' : Array<bigint>,
  'recipient' : Principal,
  'rarityTier' : RarityTier,
  'badgeImageKey' : string,
  'nft_standard' : NFTStandard,
  'compositeImageKey' : string,
}
export interface FoundersMintResult {
  'tokenId' : string,
  'recipient' : Principal,
  'standard' : NFTStandard,
}
export interface GamePlayerStatsPublic {
  'lastPlayed' : bigint,
  'displayData' : string,
  'bestScore' : bigint,
  'totalPlays' : bigint,
}
export interface GameRankPublic {
  'displayData' : string,
  'rank' : bigint,
  'score' : bigint,
}
export interface GardenDesign {
  'id' : bigint,
  'structures' : Array<StructurePlacement>,
  'plants' : Array<PlantPlacement>,
  'owner' : Principal,
  'widthMeters' : number,
  'name' : string,
  'createdAt' : Timestamp,
  'description' : [] | [string],
  'gridSizeMeters' : number,
  'nftTokenId' : [] | [bigint],
  'updatedAt' : Timestamp,
  'depthMeters' : number,
  'isPublic' : boolean,
}
export interface GardenDesignInput {
  'structures' : Array<StructurePlacement>,
  'plants' : Array<PlantPlacement>,
  'widthMeters' : number,
  'name' : string,
  'description' : [] | [string],
  'gridSizeMeters' : number,
  'depthMeters' : number,
  'isPublic' : boolean,
}
export interface GrowerDirectoryEntry {
  'tokenId' : bigint,
  'growerLocation' : [] | [string],
  'memberSince' : bigint,
  'profilePrincipal' : Principal,
  'growerName' : string,
  'plantCount' : bigint,
  'provenanceMinted' : bigint,
}
export interface GrowerProvenanceMeta {
  'grower' : Principal,
  'mintedAt' : bigint,
  'plantId' : bigint,
  'growerName' : string,
  'variety' : string,
}
export interface GuideSection {
  'id' : string,
  'title' : string,
  'content' : string,
  'timing' : [] | [string],
  'icon' : string,
}
export interface Health {
  'heapSize' : bigint,
  'isHealthy' : boolean,
  'cyclesBalance' : bigint,
  'memoryUsed' : bigint,
}
export interface ICSpicy {
  '_initializeAccessControl' : ActorMethod<[], undefined>,
  'acceptOffer' : ActorMethod<[string], Offer>,
  'addAdmin' : ActorMethod<[Principal], undefined>,
  'addArtworkLayer' : ActorMethod<[string, string, bigint], ArtworkLayer>,
  'addComment' : ActorMethod<[PostId, string, boolean], CommentPublic>,
  'addFeedingEntry' : ActorMethod<
    [PlantId, string, string, string, [] | [string]],
    boolean
  >,
  'addFeedingRecord' : ActorMethod<[AddFeedingInput], FeedingPublic>,
  'addNimsPlantPhoto' : ActorMethod<[PlantId, string, [] | [string]], boolean>,
  'addPestEntry' : ActorMethod<
    [PlantId, string, string, [] | [string], [] | [string]],
    boolean
  >,
  'addPlant' : ActorMethod<
    [
      bigint,
      PlantStage,
      [] | [TrayId],
      [] | [bigint],
      [] | [bigint],
      [] | [ContainerSize],
    ],
    AddPlantResult
  >,
  'addPlantBatch' : ActorMethod<
    [bigint, PlantStage, bigint, [] | [TrayId]],
    Array<AddPlantResult>
  >,
  'addPlantNote' : ActorMethod<[PlantId, string], boolean>,
  'addPlantPhoto' : ActorMethod<[PlantId, string], undefined>,
  'addPurchasedPlantToNims' : ActorMethod<
    [bigint, ContainerSize, [] | [string]],
    PlantSeedResult
  >,
  'addSeedLot' : ActorMethod<
    [bigint, SeedSource, [] | [bigint], [] | [bigint], [] | [string]],
    bigint
  >,
  'addVariety' : ActorMethod<
    [
      string,
      string,
      bigint,
      bigint,
      string,
      [] | [string],
      [] | [bigint],
      [] | [bigint],
    ],
    bigint
  >,
  'addVendor' : ActorMethod<[string, [] | [string], [] | [string]], bigint>,
  'addWateringEntry' : ActorMethod<
    [PlantId, bigint, [] | [number], [] | [string]],
    boolean
  >,
  'addWeatherRecord' : ActorMethod<[AddWeatherRecordInput], WeatherRecord>,
  'addWeatherSnapshot' : ActorMethod<[PlantId, WeatherSnapshot], boolean>,
  'addZonePhoto' : ActorMethod<[TrayId, string], undefined>,
  'adminBatchAirdrop' : ActorMethod<
    [Array<Principal>, boolean, [] | [bigint]],
    Array<
      {
        'token_id' : bigint,
        'recipient' : Principal,
        'message' : string,
        'success' : boolean,
      }
    >
  >,
  'adminDeleteComment' : ActorMethod<[CommentId], boolean>,
  'adminDeletePost' : ActorMethod<[PostId], boolean>,
  'adminDeleteVarietyGuide' : ActorMethod<[bigint, string], boolean>,
  'adminGetGameStats' : ActorMethod<
    [string, Principal],
    [] | [GamePlayerStatsPublic]
  >,
  'adminGrantCoopSeat' : ActorMethod<
    [bigint, Principal],
    PurchaseCoopSeatResult
  >,
  'adminListCoopDesignatedSeats' : ActorMethod<[], Array<bigint>>,
  'adminListUsers' : ActorMethod<[bigint, bigint, string], AdminUserPage>,
  'adminRemoveGameScore' : ActorMethod<[string, Principal], boolean>,
  'adminReturnToPool' : ActorMethod<[bigint], TransferResult>,
  'adminRevokeSeat' : ActorMethod<[bigint, string], boolean>,
  'adminRunDailyWeatherCapture' : ActorMethod<[], bigint>,
  'adminSendNotification' : ActorMethod<[Principal, string], boolean>,
  'adminSetLeaderboardExcluded' : ActorMethod<[Principal, boolean], undefined>,
  'adminSubmitToDAB' : ActorMethod<
    [string, string, string, [] | [string]],
    { 'ok' : string } |
      { 'err' : string }
  >,
  'adminTransferFromPool' : ActorMethod<[bigint, Account], TransferResult>,
  'adminUnstickOrder' : ActorMethod<
    [bigint],
    { 'message' : string, 'success' : boolean }
  >,
  'adminUnstickPepperHead' : ActorMethod<
    [bigint],
    { 'message' : string, 'success' : boolean }
  >,
  'adminWithdrawTokens' : ActorMethod<
    [string, Principal, bigint],
    AdminWithdrawTokensResult
  >,
  'airdropNFT' : ActorMethod<[string, Principal], undefined>,
  'assignCallerUserRole' : ActorMethod<[Principal, UserRole], undefined>,
  'assignPoolNFT' : ActorMethod<[bigint, AssignAction], undefined>,
  'backfillWeatherHistory' : ActorMethod<[PlantId, string, string], bigint>,
  'banUser' : ActorMethod<[Principal], undefined>,
  'batchAirdropFromPool' : ActorMethod<
    [Array<AirdropAssignment>],
    { 'failed' : bigint, 'succeeded' : bigint }
  >,
  'batchAssignPoolNFTs' : ActorMethod<[Array<bigint>, AssignAction], bigint>,
  'batchAssignToQR' : ActorMethod<[Array<bigint>], Array<QRAssignmentResult>>,
  'batchFeed' : ActorMethod<
    [Array<PlantId>, string, string, string, [] | [string]],
    bigint
  >,
  'batchListOnShop' : ActorMethod<
    [Array<ShopAssignment>],
    { 'failed' : bigint, 'succeeded' : bigint }
  >,
  'batchMintFoundersCollection' : ActorMethod<
    [Array<FoundersMintInput>],
    Array<FoundersMintResult>
  >,
  'batchWater' : ActorMethod<
    [Array<PlantId>, bigint, [] | [number], [] | [string]],
    bigint
  >,
  'beginArtworkUpload' : ActorMethod<[bigint], undefined>,
  'beginVideoUpload' : ActorMethod<[string, bigint], bigint>,
  'bulkCreateProducts' : ActorMethod<
    [Array<CreateProductInput>],
    Array<BulkCreateResult>
  >,
  'buyListedNft' : ActorMethod<
    [bigint, PaymentToken, bigint],
    BuyListedNftResult
  >,
  'buyResaleListing' : ActorMethod<
    [string],
    { 'ok' : null } |
      { 'err' : string }
  >,
  'calculateGardenYield' : ActorMethod<[bigint], [] | [YieldEstimate]>,
  'calculateGardenYieldInput' : ActorMethod<[GardenDesignInput], YieldEstimate>,
  'cancelOffer' : ActorMethod<[string], Offer>,
  'cancelProposal' : ActorMethod<[ProposalId], boolean>,
  'cancelResaleListing' : ActorMethod<
    [string],
    { 'ok' : null } |
      { 'err' : string }
  >,
  'cancelVideoUpload' : ActorMethod<[bigint], undefined>,
  'castVote' : ActorMethod<[ProposalId, bigint], boolean>,
  'claimGameAchievement' : ActorMethod<[string, string], Result_5>,
  'clearArtworkFiles' : ActorMethod<[], undefined>,
  'closeProposal' : ActorMethod<[ProposalId], boolean>,
  'completeEvent' : ActorMethod<[bigint], PlantingEvent>,
  'confirmICPayPayment' : ActorMethod<
    [bigint, string],
    { 'message' : string, 'success' : boolean }
  >,
  'confirmOrderPaymentDirect' : ActorMethod<
    [bigint, string, bigint],
    ConfirmOrderPaymentDirectResult
  >,
  'confirmPayPalOrderPayment' : ActorMethod<
    [bigint, string],
    { 'message' : string, 'success' : boolean }
  >,
  'counterOffer' : ActorMethod<[CounterOfferInput], Offer>,
  'createBatchGiftPack' : ActorMethod<
    [Array<PlantId>],
    { 'ok' : BatchGiftPackPublic } |
      { 'err' : string }
  >,
  'createComment' : ActorMethod<[CreateCommentInput], CommentPublic>,
  'createDAOProposal' : ActorMethod<[CreateProposalInput], ProposalPublic>,
  'createGardenDesign' : ActorMethod<
    [GardenDesignInput],
    CreateGardenDesignResult
  >,
  'createGrowerProposal' : ActorMethod<
    [CreateProposalInput],
    { 'proposalId' : bigint }
  >,
  'createNimsTray' : ActorMethod<[string, Timestamp, [] | [bigint]], TrayId>,
  'createOrder' : ActorMethod<[Principal, CreateOrderInput], OrderPublic>,
  'createPlant' : ActorMethod<[CreatePlantInput], PlantPublic>,
  'createPlantingEvent' : ActorMethod<
    [CreatePlantingEventInput],
    PlantingEvent
  >,
  'createPost' : ActorMethod<[CreatePostInput], PostPublic>,
  'createProduct' : ActorMethod<[CreateProductInput], ProductPublic>,
  'createProposal' : ActorMethod<
    [CreateProposalInput],
    { 'proposalId' : bigint }
  >,
  'createRecipe' : ActorMethod<[CreateRecipeInput], { 'recipe_id' : RecipeId }>,
  'createTray' : ActorMethod<[CreateTrayInput], TrayPublic>,
  'dabTransform' : ActorMethod<
    [{ 'context' : Uint8Array | number[], 'response' : http_request_result }],
    http_request_result
  >,
  'deleteComment' : ActorMethod<[CommentId], boolean>,
  'deleteGardenDesign' : ActorMethod<[bigint], boolean>,
  'deletePlantingEvent' : ActorMethod<[bigint], undefined>,
  'deletePost' : ActorMethod<[PostId], boolean>,
  'deleteProduct' : ActorMethod<[ProductId], undefined>,
  'deleteRecipe' : ActorMethod<[RecipeId], boolean>,
  'deleteTray' : ActorMethod<[TrayId], undefined>,
  'delistNft' : ActorMethod<[bigint], boolean>,
  'delistPlant' : ActorMethod<[PlantId], boolean>,
  'designateCoopSeats' : ActorMethod<
    [Array<bigint>],
    { 'messages' : Array<string>, 'skipped' : bigint, 'designated' : bigint }
  >,
  'editPost' : ActorMethod<[PostId, string], boolean>,
  'ensureAdminProfile' : ActorMethod<[], undefined>,
  'ensureCallerProfile' : ActorMethod<[], undefined>,
  'feedEntireTray' : ActorMethod<
    [TrayId, string, string, string, [] | [string]],
    bigint
  >,
  'finalizeArtworkUpload' : ActorMethod<[], UploadResult>,
  'finishVideoUpload' : ActorMethod<
    [bigint, [] | [Uint8Array | number[]]],
    FinishVideoUploadResult
  >,
  'fixTransplantedPlant' : ActorMethod<
    [PlantId, ContainerSize, [] | [PlantId]],
    boolean
  >,
  'followUser' : ActorMethod<[Principal], boolean>,
  'generateAllPoolNFTs' : ActorMethod<[], bigint>,
  'generateClaimToken' : ActorMethod<[bigint], string>,
  'generateClaimTokens' : ActorMethod<
    [Array<bigint>],
    Array<{ 'tokenId' : bigint, 'claimToken' : string }>
  >,
  'generateCoopClaimToken' : ActorMethod<[PlantId], string>,
  'generatePickupQRPayload' : ActorMethod<[PlantId], string>,
  'getActiveResaleListings' : ActorMethod<[], Array<ResaleListingPublic>>,
  'getAdminInventory' : ActorMethod<
    [[] | [PlantStage], [] | [bigint], [] | [boolean]],
    Array<PlantLifecycle>
  >,
  'getAdminOrder' : ActorMethod<[OrderId], [] | [AdminOrderPublic]>,
  'getAdmins' : ActorMethod<[], Array<Principal>>,
  /**
   * / Per-principal rate limiters for cycle-drain protection (CDA).
   */
  'getArtworkFile' : ActorMethod<[string], [] | [Uint8Array | number[]]>,
  'getArtworkUploadResult' : ActorMethod<[], UploadResult>,
  'getArtworkUploadStatus' : ActorMethod<[], UploadSessionStatus>,
  'getAuditLog' : ActorMethod<[bigint, bigint], Array<AuditEntry>>,
  'getAvatarFile' : ActorMethod<[string], [] | [Uint8Array | number[]]>,
  'getBadgeByTokenId' : ActorMethod<[bigint], [] | [BadgePublic]>,
  'getBadgesByPrincipal' : ActorMethod<[Principal], Array<BadgePublic>>,
  'getBatchGiftPack' : ActorMethod<[ClaimTokenId], [] | [BatchGiftPackPublic]>,
  'getCallerDaoNftCount' : ActorMethod<[], bigint>,
  'getCallerDiscount' : ActorMethod<[], CallerDiscount>,
  'getCallerMembership' : ActorMethod<[], [] | [MembershipNFTPublic]>,
  'getCallerProfile' : ActorMethod<[], [] | [UserProfilePublic]>,
  'getCallerUserProfile' : ActorMethod<[], [] | [UserProfilePublic]>,
  'getCallerUserRole' : ActorMethod<[], UserRole>,
  /**
   * / Public query — anyone can check backend canister health.
   */
  'getCanisterHealth' : ActorMethod<[], Health>,
  'getCanisterId' : ActorMethod<[], string>,
  'getCanisterTreasuryBalances' : ActorMethod<
    [],
    Array<CanisterTreasuryBalance>
  >,
  'getClaimInfo' : ActorMethod<
    [string],
    [] | [
      {
        'tokenId' : bigint,
        'redeemed' : boolean,
        'photoUrl' : [] | [string],
        'plantId' : [] | [PlantId],
        'stage' : [] | [string],
        'nftName' : string,
        'variety' : [] | [string],
      }
    ]
  >,
  'getCommunityImageFile' : ActorMethod<[string], [] | [ShopListingFile]>,
  'getCoopSeatPriceCents' : ActorMethod<[], bigint>,
  'getCoopSeatsRemaining' : ActorMethod<
    [],
    { 'total' : bigint, 'available' : bigint }
  >,
  /**
   * / Admin: backend cycle balance (AGENTS.md hygiene).
   */
  'getCycleBalance' : ActorMethod<[], bigint>,
  'getDAOProposal' : ActorMethod<[ProposalId], [] | [ProposalPublic]>,
  'getDAOStats' : ActorMethod<
    [],
    {
      'totalVotes' : bigint,
      'uniqueVoters' : bigint,
      'callerVotes' : bigint,
      'activeProposals' : bigint,
    }
  >,
  'getFeaturedRecipes' : ActorMethod<[bigint], Array<RecipePublic>>,
  /**
   * / Admin: cycles + memory for backend, frontend, nft_assets, and uploads canisters.
   */
  'getFleetCanisterHealth' : ActorMethod<[], Array<FleetEntry>>,
  'getFollowers' : ActorMethod<
    [Principal, bigint, bigint],
    Array<UserProfilePublic>
  >,
  'getFollowersCount' : ActorMethod<[Principal], bigint>,
  'getFollowing' : ActorMethod<
    [Principal, bigint, bigint],
    Array<UserProfilePublic>
  >,
  'getFollowingCount' : ActorMethod<[Principal], bigint>,
  'getFollowingFeed' : ActorMethod<[bigint, bigint], Array<PostPublic>>,
  'getForSalePlants' : ActorMethod<[], Array<PlantPublic>>,
  'getFrontendCanisterId' : ActorMethod<[], [] | [string]>,
  'getGameLeaderboard' : ActorMethod<[string, bigint], Array<LeaderboardEntry>>,
  'getGardenDesign' : ActorMethod<[bigint], [] | [GardenDesign]>,
  'getGardenDesignForUser' : ActorMethod<[bigint], [] | [GardenDesign]>,
  'getGlobalFeed' : ActorMethod<[bigint, bigint], Array<PostPublic>>,
  'getGrowerProvenanceMeta' : ActorMethod<
    [bigint],
    [] | [GrowerProvenanceMeta]
  >,
  'getIcrc7PoolStatsAdmin' : ActorMethod<[], Icrc7PoolStats>,
  'getLatestNurseryWeather' : ActorMethod<[], [] | [WeatherSnapshot]>,
  'getLessonQuiz' : ActorMethod<[string], [] | [QuizPublic]>,
  'getLinkedWallets' : ActorMethod<[], Array<Principal>>,
  'getListedNfts' : ActorMethod<[[] | [boolean]], Array<NftListingPublic>>,
  'getLoadedMetadataCount' : ActorMethod<[], bigint>,
  'getMembershipPriceInToken' : ActorMethod<[OracleToken], bigint>,
  'getMyBadges' : ActorMethod<[], Array<BadgePublic>>,
  'getMyCoopStatus' : ActorMethod<[], [] | [CoopStatus]>,
  'getMyCrafterRecipes' : ActorMethod<[], Array<SavedCrafterRecipe>>,
  'getMyCrosses' : ActorMethod<[], Array<BreedingCrossPublic>>,
  'getMyDesigns' : ActorMethod<[], Array<GardenDesign>>,
  'getMyFavorites' : ActorMethod<[bigint, bigint], Array<RecipePublic>>,
  'getMyGameRank' : ActorMethod<[string], [] | [GameRankPublic]>,
  'getMyGameStats' : ActorMethod<[string], [] | [GamePlayerStatsPublic]>,
  'getMyGardenState' : ActorMethod<[], [] | [string]>,
  'getMyIngredientInventory' : ActorMethod<[], [] | [string]>,
  'getMyMasterclassProgress' : ActorMethod<[], string>,
  'getMyNftListings' : ActorMethod<[], Array<NftListingPublic>>,
  'getMyNotifications' : ActorMethod<
    [bigint, bigint],
    Array<NotificationPublic>
  >,
  'getMyOffers' : ActorMethod<[], Array<Offer>>,
  'getMyPlantsNims' : ActorMethod<[], Array<PlantLifecycle>>,
  'getMyResaleListings' : ActorMethod<[], Array<ResaleListingPublic>>,
  'getMySchedule' : ActorMethod<[Timestamp, Timestamp], Array<PlantingEvent>>,
  'getMySchedules' : ActorMethod<[], Array<SavedSchedule>>,
  'getMySeedBank' : ActorMethod<[], Array<SeedLotPublic>>,
  'getMyTrays' : ActorMethod<[], Array<TrayPublic>>,
  /**
   * / Uploads asset canister — user images served via HTTP from this canister.
   */
  'getMyVendors' : ActorMethod<[], Array<SeedVendorPublic>>,
  'getMyWeatherRecords' : ActorMethod<[bigint], Array<WeatherRecord>>,
  'getNewOrderCount' : ActorMethod<[], bigint>,
  'getNftPoolStatus' : ActorMethod<
    [],
    { 'total' : bigint, 'available' : bigint }
  >,
  'getNimsDashboardStats' : ActorMethod<[], DashboardStats>,
  'getNimsPhotoFile' : ActorMethod<[string], [] | [ShopListingFile]>,
  'getOffer' : ActorMethod<[string], [] | [Offer]>,
  'getOffersForNft' : ActorMethod<[string], Array<Offer>>,
  'getOffersReceived' : ActorMethod<[], Array<Offer>>,
  'getOrder' : ActorMethod<[OrderId], [] | [OrderPublic]>,
  'getOrderPickupClaimTokens' : ActorMethod<[OrderId], Array<string>>,
  'getOverdueEvents' : ActorMethod<[], Array<PlantingEvent>>,
  'getPayPalCheckoutConfig' : ActorMethod<[], PayPalCheckoutConfig>,
  'getPlant' : ActorMethod<[PlantId], [] | [PlantPublic]>,
  'getPlantByNft' : ActorMethod<[bigint], [] | [PlantLifecycle]>,
  'getPlantClaimToken' : ActorMethod<[PlantId], [] | [string]>,
  'getPlantCount' : ActorMethod<[], PlantCountStats>,
  'getPlantHealth' : ActorMethod<[PlantId], [] | [PlantHealth]>,
  'getPlantLifecycle' : ActorMethod<[PlantId], [] | [PlantLifecycle]>,
  'getPlantTimeline' : ActorMethod<[PlantId], [] | [PlantTimeline]>,
  'getPlantingEvent' : ActorMethod<[bigint], [] | [PlantingEvent]>,
  'getPlantsByContainer' : ActorMethod<[ContainerSize], Array<PlantLifecycle>>,
  'getPlantsForSale' : ActorMethod<
    [[] | [PlantStage], [] | [bigint]],
    Array<PlantLifecycle>
  >,
  'getPoolDashboard' : ActorMethod<[], PoolDashboard>,
  'getPoolNFT' : ActorMethod<[bigint], [] | [PoolNFTPublic]>,
  'getPoolNFTs' : ActorMethod<
    [[] | [PoolNFTStatus__1], bigint, bigint],
    Array<PoolNFTPublic__1>
  >,
  'getPoolStats' : ActorMethod<[], PoolStats>,
  'getPostWithComments' : ActorMethod<[PostId], [] | [PostWithComments]>,
  'getProduct' : ActorMethod<[ProductId], [] | [ProductPublic]>,
  'getProfile' : ActorMethod<[Principal], [] | [UserProfilePublic]>,
  'getProposal' : ActorMethod<[ProposalId], [] | [ProposalPublic]>,
  'getProposalResults' : ActorMethod<[ProposalId], [] | [ProposalResults]>,
  'getProposals' : ActorMethod<
    [[] | [ProposalStatus], [] | [ProposalCategory], bigint, bigint],
    Array<ProposalPublic>
  >,
  'getPublicDesigns' : ActorMethod<[bigint, bigint], Array<GardenDesign>>,
  'getPublicProfile' : ActorMethod<[Principal], [] | [UserProfilePublic]>,
  'getPublicProfileFull' : ActorMethod<[Principal], [] | [PublicProfileFull]>,
  'getRavenDiscountPercent' : ActorMethod<[], bigint>,
  'getRecentActivity' : ActorMethod<[bigint], Array<ActivityEntry>>,
  'getRecipe' : ActorMethod<[RecipeId], [] | [RecipePublic]>,
  'getRecipeBySlug' : ActorMethod<[string], [] | [RecipePublic]>,
  'getRecipeCategories' : ActorMethod<[], Array<[RecipeCategory, bigint]>>,
  'getRecipeSeoContent' : ActorMethod<
    [RecipeId],
    { 'faqs' : Array<[string, string]>, 'intro' : [] | [string] }
  >,
  'getRecipeVideoUrl' : ActorMethod<[RecipeId], [] | [string]>,
  'getRecipes' : ActorMethod<
    [[] | [RecipeCategory], [] | [string], bigint, bigint],
    Array<RecipePublic>
  >,
  'getScheduleByShareToken' : ActorMethod<[string], [] | [SavedSchedule]>,
  'getScheduleData' : ActorMethod<
    [string, Array<string>],
    Array<ScheduleEntry>
  >,
  'getSeedBankStats' : ActorMethod<[], SeedBankStats>,
  'getSeedLotsByVariety' : ActorMethod<[bigint], Array<SeedLotPublic>>,
  'getShopListingFile' : ActorMethod<[string], [] | [ShopListingFile]>,
  'getSlicerSharePublic' : ActorMethod<[Principal], [] | [SlicerSharePublic]>,
  'getSlicerSubmitRejectionStats' : ActorMethod<[], Array<[string, bigint]>>,
  'getSpawnSequence' : ActorMethod<[bigint, bigint], Array<SpawnEvent>>,
  'getTokenPriceInIcp' : ActorMethod<[OracleToken], bigint>,
  'getTokenPrices' : ActorMethod<[], Array<TokenPrice>>,
  'getTray' : ActorMethod<[TrayId], [] | [TrayPublic]>,
  'getTrayGrid' : ActorMethod<[TrayId], Array<TrayCellPublic>>,
  'getTreasuryBalance' : ActorMethod<[TreasuryToken], bigint>,
  'getTreasuryBalances' : ActorMethod<[], Array<TreasuryBalance>>,
  'getTreasuryLedger' : ActorMethod<[], Array<TreasuryTransaction>>,
  'getTrendingPosts' : ActorMethod<[bigint], Array<PostPublic>>,
  'getUnreadCount' : ActorMethod<[], bigint>,
  'getUpcomingEvents' : ActorMethod<[], Array<PlantingEvent>>,
  'getUpgradeHistory' : ActorMethod<[PlantId], Array<LifecycleUpgradeEvent>>,
  'getUploadsCanisterId' : ActorMethod<[], [] | [string]>,
  'getUsageRollups' : ActorMethod<[bigint], Array<DailyFeatureStat>>,
  'getUserPlantsPublic' : ActorMethod<
    [Principal, bigint, bigint],
    Array<PlantPublic>
  >,
  'getUserPosts' : ActorMethod<[Principal, bigint, bigint], Array<PostPublic>>,
  'getVariety' : ActorMethod<[bigint], [] | [VarietyPublic]>,
  'getVarietyGuide' : ActorMethod<[bigint, string], [] | [VarietyGuide]>,
  'getVarietyIntro' : ActorMethod<[bigint], [] | [string]>,
  'getVarietyProvenance' : ActorMethod<
    [bigint],
    [] | [VarietyProvenancePublic]
  >,
  'getWeatherDebug' : ActorMethod<
    [],
    { 'activeCount' : bigint, 'lastError' : string, 'lastUrl' : string }
  >,
  'getZoneCalendar' : ActorMethod<[string], ZoneCalendar>,
  'getZoneSchedule' : ActorMethod<[string, bigint], ZoneSchedule>,
  'gradeQuizCheckpoint' : ActorMethod<[string, string], Result_1>,
  'harvestSeeds' : ActorMethod<[PlantId, [] | [bigint], [] | [string]], bigint>,
  'hasDAOAccess' : ActorMethod<[], boolean>,
  'hasLikedPost' : ActorMethod<[PostId], boolean>,
  'hasMembership' : ActorMethod<[], boolean>,
  'hasVoted' : ActorMethod<[ProposalId], [] | [CallerVoteInfo]>,
  'icpayTransform' : ActorMethod<
    [{ 'context' : Uint8Array | number[], 'response' : http_request_result }],
    http_request_result
  >,
  /**
   * / ICRC-10: supported standards declaration (includes ICRC-28 for trusted origins).
   */
  'icrc10_supported_standards' : ActorMethod<
    [],
    Array<{ 'url' : string, 'name' : string }>
  >,
  /**
   * / ICRC-28: HTTPS origins allowed for wallet signer delegation flows (IdentityKit / OISY).
   */
  'icrc28_trusted_origins' : ActorMethod<
    [],
    { 'trusted_origins' : Array<string> }
  >,
  'icrc37_approve_tokens' : ActorMethod<
    [Array<ApproveTokenArg>],
    Array<[] | [ApproveTokenResult]>
  >,
  'icrc37_get_token_approvals' : ActorMethod<
    [bigint, [] | [TokenApproval], [] | [bigint]],
    Array<TokenApproval>
  >,
  'icrc37_is_approved' : ActorMethod<[Array<IsApprovedArg>], Array<boolean>>,
  'icrc37_max_approvals_per_token_or_collection' : ActorMethod<
    [],
    [] | [bigint]
  >,
  'icrc37_max_revoke_approvals' : ActorMethod<[], [] | [bigint]>,
  'icrc37_revoke_token_approvals' : ActorMethod<
    [Array<RevokeTokenApprovalArg>],
    Array<[] | [RevokeTokenApprovalResult]>
  >,
  'icrc37_transfer_from' : ActorMethod<
    [Array<TransferFromArg>],
    Array<[] | [TransferFromResult]>
  >,
  'icrc7_atomic_batch_transfers' : ActorMethod<[], [] | [boolean]>,
  'icrc7_balance_of' : ActorMethod<[Array<Account>], Array<bigint>>,
  'icrc7_collection_metadata' : ActorMethod<[], Array<[string, Value]>>,
  'icrc7_default_take_value' : ActorMethod<[], [] | [bigint]>,
  'icrc7_description' : ActorMethod<[], [] | [string]>,
  'icrc7_logo' : ActorMethod<[], [] | [string]>,
  'icrc7_max_memo_size' : ActorMethod<[], [] | [bigint]>,
  'icrc7_max_query_batch_size' : ActorMethod<[], [] | [bigint]>,
  'icrc7_max_take_value' : ActorMethod<[], [] | [bigint]>,
  'icrc7_max_update_batch_size' : ActorMethod<[], [] | [bigint]>,
  'icrc7_name' : ActorMethod<[], string>,
  'icrc7_owner_of' : ActorMethod<[Array<bigint>], Array<[] | [Account]>>,
  'icrc7_permitted_drift' : ActorMethod<[], [] | [bigint]>,
  'icrc7_supply_cap' : ActorMethod<[], [] | [bigint]>,
  'icrc7_symbol' : ActorMethod<[], string>,
  'icrc7_token_metadata' : ActorMethod<
    [Array<bigint>],
    Array<[] | [Array<[string, Value]>]>
  >,
  'icrc7_token_metadata_certified' : ActorMethod<
    [bigint],
    {
      'certificate' : [] | [Uint8Array | number[]],
      'value' : [] | [Uint8Array | number[]],
      'witness' : Uint8Array | number[],
    }
  >,
  'icrc7_tokens' : ActorMethod<[[] | [bigint], [] | [bigint]], Array<bigint>>,
  'icrc7_tokens_of' : ActorMethod<
    [Account, [] | [bigint], [] | [bigint]],
    Array<bigint>
  >,
  'icrc7_total_supply' : ActorMethod<[], bigint>,
  'icrc7_transfer' : ActorMethod<
    [Array<TransferArgs>],
    Array<[] | [TransferResult]>
  >,
  'icrc7_tx_window' : ActorMethod<[], [] | [bigint]>,
  'initializeNFTPool' : ActorMethod<
    [],
    { 'skipped' : bigint, 'initialized' : bigint }
  >,
  'isCallerAdmin' : ActorMethod<[], boolean>,
  /**
   * / ICRC-10: supported standards declaration (includes ICRC-28 for trusted origins).
   */
  'isFollowing' : ActorMethod<[Principal], boolean>,
  'isGrowerProvenanceToken' : ActorMethod<[bigint], boolean>,
  'isPepperHead' : ActorMethod<[bigint], boolean>,
  'isPepperHeadAvailable' : ActorMethod<[], bigint>,
  'isUserBanned' : ActorMethod<[Principal], boolean>,
  'issueMembership' : ActorMethod<
    [
      Principal,
      MembershipTier,
      { 'EXT' : null } |
        { 'Hedera' : null } |
        { 'ICRC37' : null },
    ],
    MembershipNFTPublic
  >,
  'likeComment' : ActorMethod<[CommentId], boolean>,
  'likePost' : ActorMethod<[PostId], boolean>,
  'linkWallet' : ActorMethod<[Principal], boolean>,
  'listAllOrdersAdmin' : ActorMethod<
    [AdminOrderStatusFilter],
    Array<AdminOrderPublic>
  >,
  'listAllPostsAdmin' : ActorMethod<[bigint, bigint], Array<PostPublic>>,
  'listArtworkFiles' : ActorMethod<[], Array<[string, bigint]>>,
  'listArtworkLayers' : ActorMethod<[], Array<ArtworkLayer>>,
  'listClaimTokensAdmin' : ActorMethod<
    [[] | [string]],
    Array<ClaimTokenAdminPublic>
  >,
  'listCommentsByPost' : ActorMethod<[PostId], Array<CommentPublic>>,
  'listDAOProposals' : ActorMethod<[], Array<ProposalPublic>>,
  'listGrowerDirectory' : ActorMethod<[], Array<GrowerDirectoryEntry>>,
  'listIcrc7PoolTokensAdmin' : ActorMethod<
    [Icrc7TokenFilter, bigint, bigint],
    Array<Icrc7TokenAdminPublic>
  >,
  'listMyPlants' : ActorMethod<[], Array<PlantPublic>>,
  'listNFTForResale' : ActorMethod<
    [PlantId, number],
    { 'ok' : ResaleListingPublic } |
      { 'err' : string }
  >,
  'listNftForSale' : ActorMethod<[bigint, bigint], boolean>,
  'listOrdersByBuyer' : ActorMethod<[], Array<OrderPublic>>,
  'listPlantForSale' : ActorMethod<[PlantId, [] | [bigint]], boolean>,
  'listPlants' : ActorMethod<[], Array<PlantPublic>>,
  'listPlantsByStage' : ActorMethod<[PlantStage], Array<PlantPublic>>,
  'listPoolNFTs' : ActorMethod<
    [[] | [PoolNFTStatus], bigint],
    Array<PoolNFTPublic>
  >,
  'listPosts' : ActorMethod<[], Array<PostPublic>>,
  'listProducts' : ActorMethod<[], Array<ProductPublic>>,
  'listProductsByCategory' : ActorMethod<
    [ProductCategory],
    Array<ProductPublic>
  >,
  'listRecipeSeoContent' : ActorMethod<
    [],
    Array<[RecipeId, string, Array<[string, string]>]>
  >,
  'listRecipeVideoUrls' : ActorMethod<[], Array<[RecipeId, string]>>,
  'listRecipes' : ActorMethod<[], Array<RecipePublic>>,
  'listRecipesAdmin' : ActorMethod<[], Array<RecipePublic>>,
  'listTrays' : ActorMethod<[], Array<TrayPublic>>,
  'listVarieties' : ActorMethod<[], Array<VarietyPublic>>,
  'listVarietyIntros' : ActorMethod<[], Array<[bigint, string]>>,
  'listVarietyProvenance' : ActorMethod<
    [bigint, bigint],
    Array<VarietyProvenancePublic>
  >,
  'loadStaticMetadata' : ActorMethod<
    [Array<[bigint, Uint8Array | number[]]>],
    LoadStaticMetadataResult
  >,
  'logFeeding' : ActorMethod<
    [PlantId, string, string, string, [] | [string]],
    boolean
  >,
  'logPest' : ActorMethod<
    [PlantId, string, string, [] | [string], [] | [string]],
    boolean
  >,
  'logWatering' : ActorMethod<
    [PlantId, bigint, [] | [number], [] | [string]],
    boolean
  >,
  'markCellDead' : ActorMethod<
    [TrayId, bigint, DeathCause, [] | [string], [] | [string]],
    boolean
  >,
  'markCellGerminated' : ActorMethod<
    [TrayId, bigint, [] | [Timestamp]],
    AddPlantResult
  >,
  'markNotificationsRead' : ActorMethod<[bigint], undefined>,
  'markOrdersSeen' : ActorMethod<[OrderId], undefined>,
  'markPlantDead' : ActorMethod<
    [PlantId, DeathCause, [] | [string], [] | [string]],
    boolean
  >,
  'markPlantGerminated' : ActorMethod<[PlantId, Timestamp], undefined>,
  'mintAchievementBadge' : ActorMethod<
    [Principal, string, string, string],
    Result_7
  >,
  'mintDesignAsNft' : ActorMethod<[bigint], MintDesignNftResult>,
  'mintEXT' : ActorMethod<[bigint, string, Array<[string, string]>], string>,
  'mintGameSeasonalBadge' : ActorMethod<
    [Principal, string, string, string],
    Result_7
  >,
  'mintGrowerProvenanceToken' : ActorMethod<
    [PlantId],
    MintGrowerProvenanceResult
  >,
  'mintHederaNFT' : ActorMethod<
    [PlantId, [] | [string], Array<[string, string]>],
    string
  >,
  'mintICRC37' : ActorMethod<
    [PlantId, [] | [string], Array<[string, string]>],
    string
  >,
  'mintRWAProvenance' : ActorMethod<[MintRWAProvenanceInput], string>,
  'paypalOAuthTransform' : ActorMethod<
    [{ 'context' : Uint8Array | number[], 'response' : http_request_result }],
    http_request_result
  >,
  'paypalTransform' : ActorMethod<
    [{ 'context' : Uint8Array | number[], 'response' : http_request_result }],
    http_request_result
  >,
  'placeOrder' : ActorMethod<[CreateOrderInput], OrderPublic>,
  'plantSeed' : ActorMethod<
    [TrayId, bigint, bigint, [] | [Timestamp]],
    PlantSeedResult
  >,
  'preGenerateNFTPool' : ActorMethod<
    [bigint, Array<bigint>],
    { 'ok' : boolean, 'total' : bigint }
  >,
  'prepareCoopPayPalCheckout' : ActorMethod<
    [],
    {
      'tokenId' : [] | [bigint],
      'customId' : [] | [string],
      'message' : string,
      'usdCents' : bigint,
      'success' : boolean,
    }
  >,
  'priceOracleTransform' : ActorMethod<
    [{ 'context' : Uint8Array | number[], 'response' : http_request_result }],
    http_request_result
  >,
  'pruneUsageData' : ActorMethod<[], undefined>,
  'publishProposal' : ActorMethod<[ProposalId], boolean>,
  'publishRecipe' : ActorMethod<[RecipeId], boolean>,
  'publishSlicerSharePage' : ActorMethod<[string], Result_6>,
  'purchaseCoopSeat' : ActorMethod<[string], PurchaseCoopSeatResult>,
  'purchaseCoopSeatDirect' : ActorMethod<
    [string, bigint],
    PurchaseCoopSeatResult
  >,
  'purchaseCoopSeatPayPal' : ActorMethod<[string], PurchaseCoopSeatResult>,
  'purchasePepperHead' : ActorMethod<
    [string],
    { 'tokenId' : [] | [bigint], 'message' : string, 'success' : boolean }
  >,
  'purchasePepperHeadDirect' : ActorMethod<
    [string, bigint],
    { 'tokenId' : [] | [bigint], 'message' : string, 'success' : boolean }
  >,
  'purchasePepperHeadPayPal' : ActorMethod<
    [string],
    { 'tokenId' : [] | [bigint], 'message' : string, 'success' : boolean }
  >,
  'purchasePlant' : ActorMethod<
    [PlantId, PaymentToken, bigint],
    PurchasePlantResult
  >,
  'purchasePlantICPay' : ActorMethod<[PlantId, string], PurchasePlantResult>,
  'purchasePlantPayPal' : ActorMethod<[PlantId, string], PurchasePlantResult>,
  'recordCross' : ActorMethod<
    [
      string,
      bigint,
      bigint,
      [] | [PlantId],
      [] | [PlantId],
      [] | [Timestamp],
      [] | [string],
      [] | [string],
      [] | [string],
    ],
    bigint
  >,
  'recordTip' : ActorMethod<[RecordTipInput], boolean>,
  'recordUsageEvent' : ActorMethod<[string, string], undefined>,
  'redeemBatchClaim' : ActorMethod<
    [ClaimTokenId],
    { 'ok' : BatchGiftPackPublic } |
      { 'err' : string }
  >,
  'redeemClaim' : ActorMethod<
    [string],
    { 'tokenId' : [] | [bigint], 'message' : string, 'success' : boolean }
  >,
  'refreshRavenBalance' : ActorMethod<[], undefined>,
  'refreshTokenPrices' : ActorMethod<[], boolean>,
  'rejectOffer' : ActorMethod<[string], Offer>,
  'removeAdmin' : ActorMethod<[Principal], undefined>,
  'removePlant' : ActorMethod<[PlantId], boolean>,
  'removePlantPhoto' : ActorMethod<[PlantId, string], undefined>,
  'removeVariety' : ActorMethod<[bigint], boolean>,
  'removeZonePhoto' : ActorMethod<[TrayId, string], undefined>,
  'reorderRecipes' : ActorMethod<[Array<RecipeId>], boolean>,
  'resetOrphanPoolNFT' : ActorMethod<[bigint], boolean>,
  'resetPoolNFT' : ActorMethod<
    [bigint],
    { 'ok' : string } |
      { 'err' : string }
  >,
  'resolveUsername' : ActorMethod<[string], [] | [Principal]>,
  'revivePlant' : ActorMethod<[PlantId], boolean>,
  'revokeClaimTokenAdmin' : ActorMethod<[string], boolean>,
  'runDailyWeatherCapture' : ActorMethod<[], bigint>,
  'saveCallerUserProfile' : ActorMethod<[SaveProfileInput], boolean>,
  'saveCrafterRecipe' : ActorMethod<
    [string, Array<[string, bigint]>, bigint, bigint],
    Result_5
  >,
  'saveGardenState' : ActorMethod<[string], Result_5>,
  'saveIngredientInventory' : ActorMethod<[string], Result_5>,
  'saveProfile' : ActorMethod<[SaveProfileInput], boolean>,
  'saveSchedule' : ActorMethod<[string, Array<string>], ScheduleId>,
  'saveVarietyGuide' : ActorMethod<
    [bigint, string, Array<GuideSection>, Array<bigint>],
    boolean
  >,
  'searchRecipes' : ActorMethod<[string, bigint], Array<RecipePublic>>,
  'searchUsers' : ActorMethod<[string, bigint], Array<UserProfilePublic>>,
  'searchVarieties' : ActorMethod<[string], Array<VarietyPublic>>,
  'seedDefaultRecipes' : ActorMethod<[], undefined>,
  'setCoopSeatPriceCents' : ActorMethod<[bigint], undefined>,
  'setForSale' : ActorMethod<[PlantId, boolean], undefined>,
  'setFrontendCanisterId' : ActorMethod<[string], undefined>,
  'setICPaySecretKey' : ActorMethod<[string], undefined>,
  'setPayPalCredentials' : ActorMethod<[string, string, boolean], undefined>,
  'setPlantNFT' : ActorMethod<[PlantId, string], undefined>,
  'setProfileBanner' : ActorMethod<[string], undefined>,
  'setProfileWallpaper' : ActorMethod<[string], undefined>,
  'setRecipeFaqs' : ActorMethod<[RecipeId, Array<[string, string]>], boolean>,
  'setRecipeIntro' : ActorMethod<[RecipeId, string], boolean>,
  'setRecipeVideoUrl' : ActorMethod<[RecipeId, [] | [string]], boolean>,
  'setTop8' : ActorMethod<[Array<Principal>], undefined>,
  'setUploadsCanisterId' : ActorMethod<[string], undefined>,
  'setVarietyIntro' : ActorMethod<[bigint, string], boolean>,
  'setVarietyProvenance' : ActorMethod<[bigint, VarietyProvenance], boolean>,
  'startGameSession' : ActorMethod<[string], Result_4>,
  'storeArtworkFile' : ActorMethod<
    [string, Uint8Array | number[], string],
    StoredFile
  >,
  'storeAvatarFile' : ActorMethod<[Uint8Array | number[]], string>,
  /**
   * / ICRC-28: HTTPS origins allowed for wallet signer delegation flows (IdentityKit / OISY).
   */
  'storeCommunityImage' : ActorMethod<
    [string, Uint8Array | number[], string],
    StoredFile
  >,
  'storeNimsPhotoFile' : ActorMethod<
    [string, Uint8Array | number[], string],
    StoredFile
  >,
  'storeProfileBannerFile' : ActorMethod<[Uint8Array | number[]], string>,
  /**
   * / Per-principal rate limiters for cycle-drain protection (CDA).
   */
  'storeProfileWallpaperFile' : ActorMethod<[Uint8Array | number[]], string>,
  'storeSlicerShareOgImage' : ActorMethod<[Uint8Array | number[]], Result_3>,
  'submitGameScore' : ActorMethod<[string, bigint, string], Result_2>,
  'submitOffer' : ActorMethod<[SubmitOfferInput], Offer>,
  'submitQuizResult' : ActorMethod<[string, string], Result_1>,
  'submitSlicerRun' : ActorMethod<[string, string], Result>,
  'toggleCooked' : ActorMethod<[PlantId], undefined>,
  'toggleFavorite' : ActorMethod<[RecipeId], boolean>,
  'toggleRecipeFeatured' : ActorMethod<[RecipeId], boolean>,
  'transplantCell' : ActorMethod<[TransplantInput], PlantPublic>,
  'transplantPlant' : ActorMethod<
    [PlantId, ContainerSize, [] | [string]],
    boolean
  >,
  'treasuryDeposit' : ActorMethod<
    [TreasuryToken, bigint, [] | [string]],
    TreasuryTransaction
  >,
  'treasuryTransfer' : ActorMethod<
    [TreasuryToken, bigint, Principal, Principal, [] | [string]],
    TreasuryTransaction
  >,
  'treasuryWithdraw' : ActorMethod<
    [TreasuryToken, bigint, Principal, [] | [string]],
    TreasuryTransaction
  >,
  'triggerLifecycleUpgrade' : ActorMethod<[PlantId, string], string>,
  'unbanUser' : ActorMethod<[Principal], undefined>,
  'unfollowUser' : ActorMethod<[Principal], undefined>,
  'unlikePost' : ActorMethod<[PostId], bigint>,
  'unlinkWallet' : ActorMethod<[Principal], boolean>,
  'updateCellData' : ActorMethod<[UpdateCellDataInput], undefined>,
  'updateGardenDesign' : ActorMethod<[bigint, GardenDesignInput], boolean>,
  'updateMyGrowerProfile' : ActorMethod<[string, string, string], boolean>,
  'updateNimsPlantStage' : ActorMethod<[PlantId, PlantStage], boolean>,
  'updateOrderStatus' : ActorMethod<[OrderId, OrderStatus], undefined>,
  'updateOrderStatusAdmin' : ActorMethod<[OrderId, OrderStatus], undefined>,
  'updatePlantMetadata' : ActorMethod<[UpdatePlantMetadataInput], undefined>,
  'updatePlantPrice' : ActorMethod<[PlantId, bigint], boolean>,
  'updatePlantStage' : ActorMethod<[PlantId, PlantStage, string], undefined>,
  'updatePlantingEvent' : ActorMethod<
    [UpdatePlantingEventInput],
    PlantingEvent
  >,
  'updateProduct' : ActorMethod<[UpdateProductInput], undefined>,
  'updateProposal' : ActorMethod<[ProposalId, UpdateProposalInput], boolean>,
  'updateRecipe' : ActorMethod<[UpdateRecipeInput], boolean>,
  'updateSeedLot' : ActorMethod<
    [
      bigint,
      [] | [bigint],
      [] | [Timestamp],
      [] | [string],
      [] | [bigint],
      [] | [string],
      [] | [boolean],
      [] | [bigint],
    ],
    boolean
  >,
  'updateTrayName' : ActorMethod<[TrayId, string], undefined>,
  'updateTrayOrder' : ActorMethod<[TrayId, bigint], undefined>,
  'updateVariety' : ActorMethod<
    [
      bigint,
      [] | [string],
      [] | [string],
      [] | [bigint],
      [] | [bigint],
      [] | [string],
      [] | [string],
      [] | [bigint],
      [] | [bigint],
    ],
    boolean
  >,
  'updateZoneNotes' : ActorMethod<[TrayId, string], undefined>,
  'uploadArtworkChunk' : ActorMethod<
    [bigint, bigint, Uint8Array | number[]],
    { 'ok' : null } |
      { 'err' : string }
  >,
  'uploadVideoChunk' : ActorMethod<
    [bigint, bigint, Uint8Array | number[]],
    undefined
  >,
  'validateGardenDesign' : ActorMethod<[bigint], Array<ValidationWarning>>,
  'validateGardenDesignInput' : ActorMethod<
    [GardenDesignInput],
    Array<ValidationWarning>
  >,
  'voteOnProposal' : ActorMethod<[ProposalId, bigint], undefined>,
  'waterEntireTray' : ActorMethod<
    [TrayId, bigint, [] | [number], [] | [string]],
    bigint
  >,
  'weatherProvenanceTransform' : ActorMethod<
    [{ 'context' : Uint8Array | number[], 'response' : http_request_result }],
    http_request_result
  >,
}
export interface Icrc7PoolStats {
  'total' : bigint,
  'pepperhead_total' : bigint,
  'assigned_to_plants' : bigint,
  'assigned_to_products' : bigint,
  'pepperhead_sold' : bigint,
  'in_canister_pool' : bigint,
  'pepperhead_in_pool' : bigint,
  'missing_owner' : bigint,
  'sold_to_customers' : bigint,
}
export interface Icrc7TokenAdminPublic {
  'token_id' : bigint,
  'product_id' : [] | [ProductId],
  'owner' : string,
  'rarity_label' : string,
  'is_canister_pool' : boolean,
  'is_pepperhead' : boolean,
  'plant_id' : [] | [PlantId],
}
export type Icrc7TokenFilter = { 'All' : null } |
  { 'Missing' : null } |
  { 'Available' : null } |
  { 'Sold' : null } |
  { 'PepperHead' : null } |
  { 'Assigned' : null };
export interface Ingredient {
  'name' : string,
  'notes' : [] | [string],
  'is_optional' : boolean,
  'amount' : string,
}
export type InventoryCategory = { 'OtherSize' : string } |
  { 'Gal1' : null } |
  { 'Gal3' : null } |
  { 'Gal5' : null } |
  { 'Oz16' : null } |
  { 'InGround' : null };
export interface IsApprovedArg {
  'token_id' : bigint,
  'from_subaccount' : [] | [Uint8Array | number[]],
  'spender' : Account,
}
export interface LayerSummary {
  'file_names' : Array<string>,
  'layer' : string,
  'file_count' : bigint,
}
export interface LeaderboardEntry {
  'principal' : Principal,
  'displayData' : string,
  'score' : bigint,
}
export interface LifecycleUpgradeEvent {
  'new_stage' : string,
  'old_nft_id' : [] | [string],
  'old_stage' : string,
  'upgraded_at' : Timestamp,
  'new_nft_id' : string,
  'plant_id' : PlantId,
}
export interface LoadStaticMetadataResult {
  'skipped' : bigint,
  'errors' : Array<[bigint, string]>,
  'loaded' : bigint,
}
export interface MembershipNFTPublic {
  'id' : bigint,
  'nft_id' : [] | [string],
  'issued_at' : Timestamp,
  'owner' : Principal,
  'tier' : MembershipTier,
  'is_founder' : boolean,
  'layer_combination' : Array<bigint>,
  'rarity_tier' : [] | [RarityTier],
  'nft_standard' : { 'EXT' : null } |
    { 'Hedera' : null } |
    { 'ICRC37' : null },
}
export type MembershipTier = { 'Premium' : null } |
  { 'Standard' : null };
export interface MintDesignNftResult { 'nftTokenId' : bigint }
export interface MintGrowerProvenanceResult {
  'tokenId' : [] | [bigint],
  'message' : string,
  'success' : boolean,
}
export interface MintRWAProvenanceInput {
  'custom_notes' : string,
  'artwork_layer_id' : ArtworkLayerId,
  'rarity_tier' : bigint,
  'plant_id' : PlantId,
}
export type NFTStandard = { 'EXT' : null } |
  { 'Hedera' : null } |
  { 'ICRC37' : null };
export interface NftListingPublic {
  'tokenId' : bigint,
  'listedAt' : Timestamp,
  'seller' : Principal,
  'isActive' : boolean,
  'plantId' : [] | [PlantId],
  'priceUsdCents' : bigint,
}
export type NotificationKind = { 'tip' : null } |
  { 'like' : null } |
  { 'orderPlaced' : null } |
  { 'comment' : null } |
  { 'airdrop' : null } |
  { 'follow' : null } |
  { 'newUser' : null };
export interface NotificationPublic {
  'id' : bigint,
  'kind' : NotificationKind,
  'read' : boolean,
  'created_at' : bigint,
  'sender' : [] | [Principal],
  'message' : string,
  'ref_id' : [] | [string],
}
export interface Offer {
  'id' : string,
  'nft_id' : string,
  'status' : OfferStatus,
  'updated_at' : Timestamp,
  'history' : Array<OfferHistoryEntry>,
  'created_at' : Timestamp,
  'seller' : Principal,
  'offered_token' : OfferToken,
  'offered_amount' : bigint,
  'buyer' : Principal,
  'icp_equivalent' : bigint,
}
export type OfferAction = { 'Countered' : null } |
  { 'Rejected' : null } |
  { 'Accepted' : null } |
  { 'Cancelled' : null } |
  { 'Submitted' : null };
export interface OfferHistoryEntry {
  'by' : Principal,
  'token' : OfferToken,
  'action' : OfferAction,
  'timestamp' : Timestamp,
  'amount' : bigint,
}
export type OfferStatus = { 'Countered' : null } |
  { 'Rejected' : null } |
  { 'Accepted' : null } |
  { 'Cancelled' : null } |
  { 'Pending' : null };
export type OfferToken = { 'ICP' : null } |
  { 'ckBTC' : null } |
  { 'ckETH' : null } |
  { 'ckUSDC' : null } |
  { 'ckUSDT' : null };
export type OracleToken = { 'ICP' : null } |
  { 'ckBTC' : null } |
  { 'ckETH' : null } |
  { 'ckUSDC' : null } |
  { 'ckUSDT' : null };
export type OrderId = bigint;
export interface OrderItem {
  'product_id' : ProductId,
  'price_cents' : bigint,
  'quantity' : bigint,
  'plant_id' : [] | [PlantId],
}
export interface OrderPublic {
  'id' : OrderId,
  'status' : OrderStatus,
  'subtotal_cents' : bigint,
  'shipping_address' : [] | [string],
  'shipping_cents' : bigint,
  'shipping' : [] | [ShippingAddress],
  'created_at' : Timestamp,
  'pickup' : boolean,
  'line_nft_token_ids' : Array<bigint>,
  'buyer' : Principal,
  'items' : Array<OrderItem>,
  'total_cents' : bigint,
}
export type OrderStatus = { 'PickedUp' : null } |
  { 'Cancelled' : null } |
  { 'Shipped' : null } |
  { 'Pending' : null };
export interface PayPalCheckoutConfig {
  'sandbox' : boolean,
  'clientId' : string,
  'enabled' : boolean,
}
export type PaymentToken = { 'ICP' : null } |
  { 'ckBTC' : null } |
  { 'ckETH' : null } |
  { 'RAVEN' : null } |
  { 'ckUSDC' : null } |
  { 'ckUSDT' : null };
export interface PestEntry {
  'treatment' : [] | [string],
  'pestName' : string,
  'author' : Principal,
  'notes' : [] | [string],
  'timestamp' : Timestamp,
  'severity' : string,
}
export interface PlantCountStats {
  'total' : bigint,
  'sold' : bigint,
  'byStage' : Array<[PlantStage, bigint]>,
  'forSale' : bigint,
}
export interface PlantHealth {
  'daysSinceFeed' : [] | [bigint],
  'needsAttention' : boolean,
  'daysSinceWater' : [] | [bigint],
  'healthScore' : bigint,
  'lastFed' : [] | [Timestamp],
  'lastWatered' : [] | [Timestamp],
}
export type PlantId = bigint;
export interface PlantLifecycle {
  'wateringLog' : Array<WateringEntry>,
  'pestLog' : Array<PestEntry>,
  'soldAt' : [] | [Timestamp],
  'feedingLog' : Array<FeedingPublic>,
  'nftTokenId' : [] | [bigint],
  'notes' : Array<PlantNote>,
  'plant' : PlantPublic,
  'priceCents' : [] | [bigint],
  'varietyId' : [] | [bigint],
  'weatherSnapshots' : Array<WeatherSnapshot>,
  'photos' : Array<PlantPhotoEntry>,
}
export interface PlantNote {
  'text' : string,
  'author' : Principal,
  'timestamp' : Timestamp,
}
export interface PlantPhotoEntry {
  'url' : string,
  'author' : Principal,
  'timestamp' : Timestamp,
  'caption' : [] | [string],
}
export interface PlantPlacement {
  'x' : number,
  'y' : number,
  'id' : bigint,
  'rotation' : number,
  'plantLabel' : string,
  'icon' : string,
  'color' : string,
  'scale' : number,
  'varietyId' : [] | [bigint],
}
export interface PlantPublic {
  'id' : PlantId,
  'nft_id' : [] | [string],
  'container_size' : [] | [ContainerSize],
  'origin' : [] | [string],
  'sold' : boolean,
  'is_transplanted' : boolean,
  'common_name' : [] | [string],
  'for_sale' : boolean,
  'created_by' : Principal,
  'is_cooked' : boolean,
  'source_plant_id' : [] | [PlantId],
  'cell_position' : bigint,
  'watering_schedule' : [] | [string],
  'pest_notes' : [] | [string],
  'sold_to' : [] | [Principal],
  'stage' : PlantStage,
  'germination_date' : [] | [Timestamp],
  'tray_id' : TrayId,
  'notes' : string,
  'planting_date' : Timestamp,
  'transplant_date' : [] | [Timestamp],
  'additional_notes' : [] | [string],
  'photo_keys' : Array<string>,
  'genetics' : string,
  'variety' : string,
  'transplant_plant_id' : [] | [PlantId],
  'nft_standard' : NFTStandard,
  'photos' : Array<string>,
  'latin_name' : [] | [string],
}
export interface PlantSeedResult { 'plantId' : PlantId }
export type PlantStage = { 'Seedling' : null } |
  { 'Seed' : null } |
  { 'Mature' : null };
export interface PlantTimeline {
  'stage_history' : Array<StageHistory>,
  'feedings' : Array<FeedingPublic>,
  'plant' : PlantPublic,
}
export interface PlantingEvent {
  'id' : bigint,
  'owner' : Principal,
  'name' : string,
  'completed' : boolean,
  'created_at' : Timestamp,
  'emoji' : string,
  'notes' : string,
  'scheduled_at' : Timestamp,
  'completed_at' : [] | [Timestamp],
  'event_type' : PlantingEventType,
}
export type PlantingEventType = { 'directSow' : null } |
  { 'startIndoors' : null } |
  { 'harvest' : null } |
  { 'transplantOutdoors' : null };
export interface PoolDashboard {
  'total' : bigint,
  'listed_on_shop' : bigint,
  'assigned_to_qr' : bigint,
  'airdropped' : bigint,
  'ready' : bigint,
}
export interface PoolNFTPublic {
  'id' : bigint,
  'status' : PoolNFTStatus,
  'generated_at' : Timestamp,
  'token_id' : string,
  'image_key' : string,
  'layer_combo' : Array<string>,
  'rarity' : PoolNFTRarity,
}
export interface PoolNFTPublic__1 {
  'id' : bigint,
  'status' : PoolNFTStatus__1,
  'shopProductId' : [] | [bigint],
  'assignedAt' : [] | [Timestamp],
  'assignedTo' : [] | [Principal],
  'layerCombination' : Array<bigint>,
  'rarityTier' : RarityTier,
  'claimTokenId' : [] | [string],
  'compositeImageKey' : string,
}
export type PoolNFTRarity = { 'Rare' : null } |
  { 'Uncommon' : null } |
  { 'Common' : null };
export type PoolNFTStatus = {
    'ListedOnShop' : { 'at' : Timestamp, 'product_id' : bigint }
  } |
  { 'Ready' : null } |
  { 'AssignedToQR' : { 'at' : Timestamp, 'claim_token' : string } } |
  { 'Airdropped' : { 'at' : Timestamp, 'to' : Principal } };
export type PoolNFTStatus__1 = { 'Shop' : null } |
  { 'QRAssigned' : null } |
  { 'Ready' : null } |
  { 'Airdropped' : null };
export interface PoolStats {
  'shop' : bigint,
  'totalByRarity' : {
    'rare' : bigint,
    'founder' : bigint,
    'common' : bigint,
    'uncommon' : bigint,
  },
  'qrAssigned' : bigint,
  'airdropped' : bigint,
  'ready' : bigint,
}
export type PostId = bigint;
export interface PostPublic {
  'id' : PostId,
  'updated_at' : Timestamp,
  'content' : string,
  'author_text' : string,
  'comment_count' : bigint,
  'nft_token_id' : [] | [bigint],
  'image_key' : [] | [string],
  'like_count' : bigint,
  'created_at' : Timestamp,
  'author_principal' : [] | [Principal],
  'image_keys' : Array<string>,
  'tip_count' : bigint,
  'author_username' : [] | [string],
  'is_anonymous' : boolean,
  'caller_liked' : boolean,
  'plant_id' : [] | [bigint],
}
export interface PostWithComments {
  'post' : PostPublic,
  'has_liked' : boolean,
  'comments' : Array<CommentPublic>,
}
export type ProductCategory = { 'Spice' : null } |
  { 'Seedling' : null } |
  { 'GardenInputs' : null } |
  { 'FreshPodsFlatRate' : null } |
  { 'GardenAmendment' : null } |
  { 'FreshPodsByLb' : null } |
  { 'DriedPods' : null } |
  { 'Gallon1' : null } |
  { 'Gallon5' : null } |
  { 'LivePlant' : null };
export type ProductId = bigint;
export interface ProductPublic {
  'id' : ProductId,
  'active' : boolean,
  'nft_token_id' : [] | [bigint],
  'image_key' : [] | [string],
  'shipping_flat_rate_cents' : [] | [bigint],
  'unit_label' : [] | [string],
  'name' : string,
  'price_cents' : bigint,
  'description' : string,
  'inventory_category' : [] | [InventoryCategory],
  'image_keys' : Array<string>,
  'shippable' : boolean,
  'inventory_remaining' : [] | [bigint],
  'category' : ProductCategory,
  'variety' : [] | [string],
  'weight_based' : boolean,
  'price_per_unit_cents' : bigint,
  'plant_id' : [] | [PlantId],
}
export type ProposalCategory = { 'VarietyVote' : null } |
  { 'ProductVote' : null } |
  { 'FeatureRequest' : null } |
  { 'CommunityDecision' : null } |
  { 'TreasurySpend' : null } |
  { 'GrowerProposal' : null };
export type ProposalId = bigint;
export interface ProposalOptionInput {
  'description' : [] | [string],
  'option_label' : string,
}
export interface ProposalOptionPublic {
  'id' : bigint,
  'description' : [] | [string],
  'option_label' : string,
  'vote_count' : bigint,
}
export interface ProposalPublic {
  'id' : ProposalId,
  'status' : ProposalStatus,
  'title' : string,
  'updated_at' : Timestamp,
  'creator' : Principal,
  'description' : string,
  'created_at' : Timestamp,
  'voting_ends_at' : Timestamp,
  'category' : ProposalCategory,
  'total_votes' : bigint,
  'voting_starts_at' : Timestamp,
  'caller_vote' : [] | [bigint],
  'options' : Array<ProposalOptionPublic>,
}
export interface ProposalResultOption {
  'option_label' : string,
  'vote_count' : bigint,
  'percentage' : bigint,
}
export interface ProposalResults {
  'winner' : [] | [string],
  'total_votes' : bigint,
  'options' : Array<ProposalResultOption>,
}
export type ProposalStatus = { 'Closed' : null } |
  { 'Active' : null } |
  { 'Draft' : null } |
  { 'Cancelled' : null };
export interface PublicProfileFull {
  'is_raven' : boolean,
  'wallpaper_key' : [] | [string],
  'banner_key' : [] | [string],
  'top8' : Array<Top8Entry>,
  'plants_growing' : bigint,
  'nft_count' : bigint,
  'is_pepperhead' : boolean,
  'profile' : UserProfilePublic,
}
export interface PublishSlicerShareOk { 'url' : string, 'score' : bigint }
export interface PurchaseCoopSeatResult {
  'tokenId' : [] | [bigint],
  'message' : string,
  'success' : boolean,
}
export interface PurchasePlantResult {
  'claimToken' : [] | [ClaimTokenId],
  'nftTokenId' : [] | [bigint],
  'message' : string,
  'success' : boolean,
}
export interface QRAssignmentResult {
  'claimTokenId' : string,
  'nftId' : bigint,
}
export interface QuestionGrade { 'id' : string, 'correct' : boolean }
export type QuestionKind = { 'mc' : null } |
  { 'sa' : null };
export interface QuestionPublic {
  'id' : string,
  'lessonId' : string,
  'kind' : QuestionKind,
  'difficulty' : bigint,
  'explanationSlug' : string,
  'prompt' : string,
  'choices' : Array<string>,
}
export interface QuizPublic {
  'moduleId' : string,
  'lessonId' : string,
  'title' : string,
  'drawCount' : bigint,
  'badgeId' : string,
  'questions' : Array<QuestionPublic>,
  'quizVersion' : bigint,
  'passCorrect' : bigint,
}
export type RarityTier = { 'Rare' : null } |
  { 'Founder' : null } |
  { 'Uncommon' : null } |
  { 'Common' : null };
export type RecipeCategory = { 'KNF' : null } |
  { 'Composting' : null } |
  { 'SoilAmendment' : null } |
  { 'FermentedInputs' : null } |
  { 'PestControl' : null } |
  { 'PlantExtracts' : null } |
  { 'MicrobialCultures' : null } |
  { 'JADAM' : null } |
  { 'Other' : null };
export type RecipeId = bigint;
export interface RecipePublic {
  'id' : RecipeId,
  'title' : string,
  'updated_at' : Timestamp,
  'fermentation_time' : [] | [string],
  'image_key' : [] | [string],
  'difficulty' : Difficulty,
  'slug' : string,
  'tags' : Array<string>,
  'tips' : Array<string>,
  'best_for' : Array<string>,
  'description' : string,
  'safety_notes' : Array<string>,
  'created_at' : Timestamp,
  'author' : Principal,
  'total_time' : [] | [string],
  'is_published' : boolean,
  'steps' : Array<RecipeStep>,
  'application_frequency' : [] | [string],
  'category' : RecipeCategory,
  'display_order' : bigint,
  'related_recipe_ids' : Array<bigint>,
  'caller_favorited' : boolean,
  'favorite_count' : bigint,
  'ingredients' : Array<Ingredient>,
  'prep_time' : [] | [string],
  'application_rate' : [] | [string],
}
export interface RecipeStep {
  'duration' : [] | [string],
  'image_key' : [] | [string],
  'tips' : [] | [string],
  'step_number' : bigint,
  'instruction' : string,
}
export interface RecordTipInput {
  'post_id' : PostId,
  'block_index' : bigint,
  'ledger_canister_id' : string,
  'amount' : bigint,
}
export interface ResaleListingPublic {
  'id' : string,
  'seller' : Principal,
  'is_active' : boolean,
  'price_icp' : number,
  'rarity_tier' : RarityTier,
  'listed_at' : Timestamp,
  'plant_id' : PlantId,
}
export type Result = { 'ok' : SubmitRunOk } |
  { 'err' : string };
export type Result_1 = { 'ok' : SubmitQuizOk } |
  { 'err' : string };
export type Result_2 = { 'ok' : SubmitScoreOk } |
  { 'err' : string };
export type Result_3 = { 'ok' : string } |
  { 'err' : string };
export type Result_4 = { 'ok' : StartSessionOk } |
  { 'err' : string };
export type Result_5 = { 'ok' : null } |
  { 'err' : string };
export type Result_6 = { 'ok' : PublishSlicerShareOk } |
  { 'err' : string };
export type Result_7 = { 'ok' : bigint } |
  { 'err' : string };
export interface RevokeTokenApprovalArg {
  'token_id' : bigint,
  'memo' : [] | [Uint8Array | number[]],
  'from_subaccount' : [] | [Uint8Array | number[]],
  'created_at_time' : [] | [bigint],
  'spender' : [] | [Account],
}
export type RevokeTokenApprovalError = {
    'GenericError' : { 'message' : string, 'error_code' : bigint }
  } |
  { 'Duplicate' : { 'duplicate_of' : bigint } } |
  { 'NonExistingTokenId' : null } |
  { 'Unauthorized' : null } |
  { 'CreatedInFuture' : { 'ledger_time' : bigint } } |
  { 'ApprovalDoesNotExist' : null } |
  { 'GenericBatchError' : { 'message' : string, 'error_code' : bigint } } |
  { 'TooOld' : null };
export type RevokeTokenApprovalResult = { 'Ok' : bigint } |
  { 'Err' : RevokeTokenApprovalError };
export interface SaveProfileInput {
  'bio' : string,
  'username' : string,
  'avatar_key' : [] | [string],
  'location' : [] | [string],
}
export interface SavedCrafterRecipe {
  'shu' : bigint,
  'created' : bigint,
  'name' : string,
  'harmony' : bigint,
  'ingredients' : Array<SavedIngredient>,
}
export interface SavedIngredient { 'name' : string, 'amount' : bigint }
export interface SavedSchedule {
  'id' : ScheduleId,
  'owner' : Principal,
  'created_at' : Timestamp,
  'stage' : string,
  'inputs' : Array<string>,
  'share_token' : string,
}
export interface ScheduleEntry {
  'timing' : string,
  'dilution' : string,
  'stage' : string,
  'notes' : string,
  'frequency' : string,
  'input_name' : string,
}
export type ScheduleId = string;
export interface SeedBankStats {
  'totalLots' : bigint,
  'activeCrosses' : bigint,
  'varietyCount' : bigint,
}
export interface SeedLotPublic {
  'id' : bigint,
  'germinationRate' : [] | [bigint],
  'acquiredDate' : Timestamp,
  'source' : SeedSource,
  'owner' : Principal,
  'createdAt' : Timestamp,
  'generation' : [] | [string],
  'isActive' : boolean,
  'parentPlantId' : [] | [PlantId],
  'vendorId' : [] | [bigint],
  'notes' : [] | [string],
  'quantity' : [] | [bigint],
  'varietyId' : bigint,
  'harvestDate' : [] | [Timestamp],
  'crossId' : [] | [bigint],
}
export type SeedSource = { 'Gift' : null } |
  { 'OwnHarvest' : null } |
  { 'Trade' : null } |
  { 'Vendor' : null } |
  { 'Cross' : null };
export interface SeedVendorPublic {
  'id' : bigint,
  'owner' : Principal,
  'name' : string,
  'createdAt' : Timestamp,
  'website' : [] | [string],
  'notes' : [] | [string],
}
export interface ShippingAddress {
  'zip' : string,
  'city' : string,
  'state' : string,
  'street_line1' : string,
  'street_line2' : [] | [string],
  'phone' : string,
  'full_name' : string,
}
export interface ShopAssignment { 'nftId' : bigint, 'price' : bigint }
export interface ShopListingFile {
  'data' : Uint8Array | number[],
  'mime_type' : string,
}
export interface SlicerSharePublic {
  'lastPlayed' : bigint,
  'principal' : Principal,
  'username' : string,
  'displayData' : string,
  'tierSlug' : string,
  'rank' : bigint,
  'bestScore' : bigint,
  'rankedTotal' : bigint,
}
export interface SpawnEvent {
  'isFrenzy' : boolean,
  'kind' : bigint,
  'objectId' : bigint,
  'spawnTimeMs' : bigint,
  'index' : bigint,
}
export interface StageHistory {
  'stage' : PlantStage,
  'notes' : string,
  'timestamp' : Timestamp,
}
export interface StartSessionOk { 'seed' : bigint, 'sessionId' : string }
export interface StoredFile {
  'data' : Uint8Array | number[],
  'path' : string,
  'size' : bigint,
  'mime_type' : string,
  'layer' : string,
  'filename' : string,
  'uploaded_at' : Timestamp,
}
export interface StructurePlacement {
  'x' : number,
  'y' : number,
  'id' : bigint,
  'rotation' : number,
  'color' : string,
  'width' : number,
  'depth' : number,
  'structureType' : string,
}
export type Subaccount = Uint8Array | number[];
export interface SubmitOfferInput {
  'nft_id' : string,
  'offered_token' : OfferToken,
  'offered_amount' : bigint,
}
export interface SubmitQuizOk {
  'scorePct' : bigint,
  'total' : bigint,
  'moduleBadgeMinted' : [] | [bigint],
  'questionResults' : Array<QuestionGrade>,
  'correct' : bigint,
  'lessonPassed' : boolean,
  'progressJson' : string,
  'recorded' : boolean,
  'passed' : boolean,
  'capstoneBadgeMinted' : [] | [bigint],
}
export interface SubmitRunOk {
  'bestCombo' : bigint,
  'tier' : string,
  'bestScore' : bigint,
  'score' : bigint,
  'rareChilisSliced' : bigint,
  'isNewBest' : boolean,
  'badgesEarned' : Array<BadgeEarned>,
}
export interface SubmitScoreOk {
  'bestScore' : bigint,
  'totalPlays' : bigint,
  'isNewBest' : boolean,
}
export type Time = bigint;
export type Timestamp = bigint;
export interface TokenApproval {
  'token_id' : bigint,
  'approval_info' : ApprovalInfo,
}
export interface TokenPrice {
  'token' : OracleToken,
  'price_in_icp_e8s' : bigint,
  'last_updated' : Timestamp,
}
export interface Top8Entry {
  'username' : string,
  'avatar_key' : [] | [string],
  'principal_id' : Principal,
}
export interface TransferArgs {
  'to' : Account,
  'token_id' : bigint,
  'memo' : [] | [Uint8Array | number[]],
  'from_subaccount' : [] | [Uint8Array | number[]],
  'created_at_time' : [] | [bigint],
}
export type TransferError = {
    'GenericError' : { 'message' : string, 'error_code' : bigint }
  } |
  { 'Duplicate' : { 'duplicate_of' : bigint } } |
  { 'NonExistingTokenId' : null } |
  { 'Unauthorized' : null } |
  { 'CreatedInFuture' : { 'ledger_time' : bigint } } |
  { 'InvalidRecipient' : null } |
  { 'GenericBatchError' : { 'message' : string, 'error_code' : bigint } } |
  { 'TooOld' : null };
export interface TransferFromArg {
  'to' : Account,
  'spender_subaccount' : [] | [Uint8Array | number[]],
  'token_id' : bigint,
  'from' : Account,
  'memo' : [] | [Uint8Array | number[]],
  'created_at_time' : [] | [bigint],
}
export type TransferFromError = {
    'GenericError' : { 'message' : string, 'error_code' : bigint }
  } |
  { 'Duplicate' : { 'duplicate_of' : bigint } } |
  { 'NonExistingTokenId' : null } |
  { 'Unauthorized' : null } |
  { 'CreatedInFuture' : { 'ledger_time' : bigint } } |
  { 'InvalidRecipient' : null } |
  { 'GenericBatchError' : { 'message' : string, 'error_code' : bigint } } |
  { 'TooOld' : null };
export type TransferFromResult = { 'Ok' : bigint } |
  { 'Err' : TransferFromError };
export type TransferResult = { 'Ok' : bigint } |
  { 'Err' : TransferError };
export interface TransplantInput {
  'container_size' : ContainerSize,
  'plant_id' : PlantId,
}
export interface TrayCellPublic {
  'status' : CellStatus,
  'containerLabel' : [] | [string],
  'plantedAt' : [] | [Timestamp],
  'inventoryPlantId' : [] | [PlantId],
  'varietyName' : [] | [string],
  'nftTokenId' : [] | [bigint],
  'plantId' : [] | [PlantId],
  'position' : bigint,
  'daysSincePlanted' : [] | [bigint],
  'germinatedAt' : [] | [Timestamp],
}
export type TrayId = bigint;
export interface TrayPublic {
  'id' : TrayId,
  'creator' : Principal,
  'cells' : Array<[] | [PlantId]>,
  'name' : string,
  'sort_order' : bigint,
  'cell_count' : bigint,
  'zone_notes' : string,
  'planting_date' : Timestamp,
  'nft_standard' : NFTStandard,
  'zone_photo_keys' : Array<string>,
}
export interface TreasuryBalance {
  'token' : TreasuryToken,
  'balance_e8s' : bigint,
}
export type TreasuryToken = { 'ICP' : null } |
  { 'ckBTC' : null } |
  { 'ckETH' : null } |
  { 'ckUSDC' : null } |
  { 'ckUSDT' : null };
export interface TreasuryTransaction {
  'id' : string,
  'token' : TreasuryToken,
  'to_principal' : [] | [Principal],
  'memo' : [] | [string],
  'from_principal' : [] | [Principal],
  'amount_e8s' : bigint,
  'offer_id' : [] | [string],
  'timestamp' : Timestamp,
  'tx_type' : TreasuryTxType,
}
export type TreasuryTxType = { 'Deposit' : null } |
  { 'Withdrawal' : null } |
  { 'OfferSettlement' : null } |
  { 'Transfer' : null };
export interface UpdateCellDataInput {
  'origin' : [] | [string],
  'common_name' : [] | [string],
  'watering_schedule' : [] | [string],
  'pest_notes' : [] | [string],
  'notes' : [] | [string],
  'additional_notes' : [] | [string],
  'plant_id' : PlantId,
  'latin_name' : [] | [string],
}
export interface UpdatePlantMetadataInput {
  'notes' : [] | [string],
  'genetics' : [] | [string],
  'photos' : [] | [Array<string>],
  'plant_id' : PlantId,
}
export interface UpdatePlantingEventInput {
  'id' : bigint,
  'name' : string,
  'emoji' : string,
  'notes' : string,
  'scheduled_at' : Timestamp,
  'event_type' : PlantingEventType,
}
export interface UpdateProductInput {
  'active' : [] | [boolean],
  'product_id' : ProductId,
  'image_key' : [] | [string],
  'name' : [] | [string],
  'price_cents' : [] | [bigint],
  'description' : [] | [string],
  'image_keys' : [] | [Array<string>],
}
export interface UpdateProposalInput {
  'title' : [] | [string],
  'description' : [] | [string],
  'voting_ends_at' : [] | [Timestamp],
  'category' : [] | [ProposalCategory],
  'voting_starts_at' : [] | [Timestamp],
  'options' : [] | [Array<ProposalOptionInput>],
}
export interface UpdateRecipeInput {
  'id' : RecipeId,
  'title' : [] | [string],
  'fermentation_time' : [] | [string],
  'image_key' : [] | [string],
  'difficulty' : [] | [Difficulty],
  'slug' : [] | [string],
  'tags' : [] | [Array<string>],
  'tips' : [] | [Array<string>],
  'best_for' : [] | [Array<string>],
  'description' : [] | [string],
  'safety_notes' : [] | [Array<string>],
  'total_time' : [] | [string],
  'is_published' : [] | [boolean],
  'steps' : [] | [Array<RecipeStep>],
  'application_frequency' : [] | [string],
  'category' : [] | [RecipeCategory],
  'display_order' : [] | [bigint],
  'related_recipe_ids' : [] | [Array<bigint>],
  'ingredients' : [] | [Array<Ingredient>],
  'prep_time' : [] | [string],
  'application_rate' : [] | [string],
}
export interface UploadResult {
  'layers_detected' : bigint,
  'asset_canister_id' : string,
  'total_files' : bigint,
  'layer_summaries' : Array<LayerSummary>,
}
export interface UploadSessionStatus {
  'total_chunks' : bigint,
  'received' : bigint,
  'started_at' : Timestamp,
}
export interface UserProfilePublic {
  'bio' : string,
  'username' : string,
  'is_admin' : boolean,
  'avatar_key' : [] | [string],
  'following_count' : bigint,
  'post_count' : bigint,
  'created_at' : Timestamp,
  'caller_following' : boolean,
  'follower_count' : bigint,
  'principal_id' : Principal,
  'location' : [] | [string],
}
export type UserRole = { 'admin' : null } |
  { 'user' : null } |
  { 'guest' : null };
export type ValidationSeverity = { 'Error' : null } |
  { 'Info' : null } |
  { 'Warning' : null };
export interface ValidationWarning {
  'code' : string,
  'plantId' : [] | [bigint],
  'message' : string,
  'severity' : ValidationSeverity,
  'relatedPlantId' : [] | [bigint],
}
export type Value = { 'Int' : bigint } |
  { 'Map' : Array<[string, Value]> } |
  { 'Nat' : bigint } |
  { 'Blob' : Uint8Array | number[] } |
  { 'Text' : string } |
  { 'Array' : Array<Value> };
export interface VarietyGuide {
  'recipeRefs' : Array<bigint>,
  'generatedAt' : Timestamp,
  'zone' : string,
  'version' : bigint,
  'sections' : Array<GuideSection>,
  'varietyId' : bigint,
}
export interface VarietyProvenance {
  'breederLocation' : [] | [string],
  'heatClass' : [] | [string],
  'origin' : [] | [string],
  'photoKey' : [] | [string],
  'photoCredit' : [] | [string],
  'sources' : Array<VarietySource>,
  'species' : [] | [string],
  'breeder' : [] | [string],
}
export interface VarietyProvenancePublic {
  'breederLocation' : [] | [string],
  'heatClass' : [] | [string],
  'origin' : [] | [string],
  'photoKey' : [] | [string],
  'variety_id' : bigint,
  'photoCredit' : [] | [string],
  'sources' : Array<VarietySource>,
  'species' : [] | [string],
  'breeder' : [] | [string],
}
export interface VarietyPublic {
  'id' : bigint,
  'daysToMaturity' : [] | [bigint],
  'name' : string,
  'createdAt' : Timestamp,
  'description' : string,
  'imageUrl' : [] | [string],
  'scovilleMax' : bigint,
  'scovilleMin' : bigint,
  'species' : string,
  'daysToGermination' : [] | [bigint],
}
export interface VarietySource { 'url' : string, 'vendorName' : string }
export interface WateringEntry {
  'amountMl' : bigint,
  'author' : Principal,
  'notes' : [] | [string],
  'timestamp' : Timestamp,
  'phLevel' : [] | [number],
}
export interface WeatherRecord {
  'id' : WeatherRecordId,
  'latitude' : number,
  'temperature_max' : number,
  'temperature_min' : number,
  'precipitation' : number,
  'wind_speed' : [] | [number],
  'date' : string,
  'user' : Principal,
  'humidity' : [] | [number],
  'recorded_at' : Timestamp,
  'longitude' : number,
}
export type WeatherRecordId = bigint;
export interface WeatherSnapshot {
  'source' : string,
  'date' : string,
  'tempHighF' : number,
  'rainfallInches' : number,
  'uvIndex' : number,
  'humidity' : number,
  'tempLowF' : number,
}
export interface YieldEstimate {
  'estimatedLbsMax' : number,
  'estimatedLbsMin' : number,
  'spacingPenaltyPct' : number,
  'companionBonusPct' : number,
  'notes' : string,
  'totalPlantCount' : bigint,
}
export interface ZoneCalendar {
  'zone_label' : string,
  'months' : Array<ZoneSchedule>,
}
export interface ZoneRecommendation {
  'name' : string,
  'emoji' : string,
  'notes' : string,
  'event_type' : PlantingEventType,
}
export interface ZoneSchedule {
  'month' : bigint,
  'recommendations' : Array<ZoneRecommendation>,
  'zone_label' : string,
}
export interface http_header { 'value' : string, 'name' : string }
export interface http_request_result {
  'status' : bigint,
  'body' : Uint8Array | number[],
  'headers' : Array<http_header>,
}
export interface _SERVICE extends ICSpicy {}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
