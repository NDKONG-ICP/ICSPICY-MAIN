import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface Account {
  'owner' : Principal,
  'subaccount' : [] | [Subaccount],
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
export type BulkCreateResult = { 'ok' : ProductPublic } |
  { 'err' : string };
export interface BuyListedNftResult { 'message' : string, 'success' : boolean }
export interface CallerDiscount {
  'tokenId' : [] | [bigint],
  'discountPercent' : bigint,
  'rarity' : string,
}
export interface CanisterTreasuryBalance {
  'balance' : bigint,
  'ledgerCanisterId' : string,
  'symbol' : string,
}
export type ClaimTokenId = string;
export type CommentId = bigint;
export interface CommentPublic {
  'id' : CommentId,
  'post_id' : PostId,
  'content' : string,
  'created_at' : Timestamp,
  'author' : Principal,
  'author_username' : [] | [string],
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
export interface CounterOfferInput {
  'counter_amount' : bigint,
  'offer_id' : string,
  'counter_token' : OfferToken,
}
export interface CreateCommentInput { 'post_id' : PostId, 'content' : string }
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
export interface CreatePostInput {
  'content' : string,
  'image_key' : [] | [string],
  'anonymous' : boolean,
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
  'ends_at' : Timestamp,
  'description' : string,
  'options' : Array<string>,
  'proposal_type' : ProposalType,
}
export interface CreateRecipeInput {
  'photo_key' : [] | [string],
  'name' : string,
  'tags' : Array<string>,
  'description' : string,
  'instructions' : Array<string>,
  'is_featured' : boolean,
  'shop_link' : [] | [string],
  'shop_link_label' : [] | [string],
  'application_notes' : string,
  'full_name' : string,
  'ingredients' : Array<string>,
}
export interface CreateTrayInput {
  'name' : string,
  'planting_date' : Timestamp,
  'nft_standard' : NFTStandard,
}
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
export interface ICSpicy {
  '_initializeAccessControl' : ActorMethod<[], undefined>,
  'acceptOffer' : ActorMethod<[string], Offer>,
  'addAdmin' : ActorMethod<[Principal], undefined>,
  'addArtworkLayer' : ActorMethod<[string, string, bigint], ArtworkLayer>,
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
    [bigint, PlantStage, [] | [TrayId], [] | [bigint], [] | [bigint]],
    AddPlantResult
  >,
  'addPlantBatch' : ActorMethod<
    [bigint, PlantStage, bigint, [] | [TrayId]],
    Array<AddPlantResult>
  >,
  'addPlantNote' : ActorMethod<[PlantId, string], boolean>,
  'addPlantPhoto' : ActorMethod<[PlantId, string], undefined>,
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
  'addWateringEntry' : ActorMethod<
    [PlantId, bigint, [] | [number], [] | [string]],
    boolean
  >,
  'addWeatherRecord' : ActorMethod<[AddWeatherRecordInput], WeatherRecord>,
  'addWeatherSnapshot' : ActorMethod<[PlantId, WeatherSnapshot], boolean>,
  'addZonePhoto' : ActorMethod<[TrayId, string], undefined>,
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
  'batchAirdropFromPool' : ActorMethod<
    [Array<AirdropAssignment>],
    { 'failed' : bigint, 'succeeded' : bigint }
  >,
  'batchAssignPoolNFTs' : ActorMethod<[Array<bigint>, AssignAction], bigint>,
  'batchAssignToQR' : ActorMethod<[Array<bigint>], Array<QRAssignmentResult>>,
  'batchListOnShop' : ActorMethod<
    [Array<ShopAssignment>],
    { 'failed' : bigint, 'succeeded' : bigint }
  >,
  'batchMintFoundersCollection' : ActorMethod<
    [Array<FoundersMintInput>],
    Array<FoundersMintResult>
  >,
  'beginArtworkUpload' : ActorMethod<[bigint], undefined>,
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
  'cancelOffer' : ActorMethod<[string], Offer>,
  'cancelResaleListing' : ActorMethod<
    [string],
    { 'ok' : null } |
      { 'err' : string }
  >,
  'clearArtworkFiles' : ActorMethod<[], undefined>,
  'confirmICPayPayment' : ActorMethod<
    [bigint, string],
    { 'message' : string, 'success' : boolean }
  >,
  'confirmOrderPaymentDirect' : ActorMethod<
    [bigint, string, bigint],
    ConfirmOrderPaymentDirectResult
  >,
  'counterOffer' : ActorMethod<[CounterOfferInput], Offer>,
  'createBatchGiftPack' : ActorMethod<
    [Array<PlantId>],
    { 'ok' : BatchGiftPackPublic } |
      { 'err' : string }
  >,
  'createComment' : ActorMethod<[CreateCommentInput], CommentPublic>,
  'createDAOProposal' : ActorMethod<[CreateProposalInput], ProposalPublic>,
  'createNimsTray' : ActorMethod<[string, Timestamp, [] | [bigint]], TrayId>,
  'createOrder' : ActorMethod<[Principal, CreateOrderInput], OrderPublic>,
  'createPlant' : ActorMethod<[CreatePlantInput], PlantPublic>,
  'createPost' : ActorMethod<[CreatePostInput], PostPublic>,
  'createProduct' : ActorMethod<[CreateProductInput], ProductPublic>,
  'createRecipe' : ActorMethod<[CreateRecipeInput], Recipe>,
  'createTray' : ActorMethod<[CreateTrayInput], TrayPublic>,
  'dabTransform' : ActorMethod<
    [{ 'context' : Uint8Array | number[], 'response' : http_request_result }],
    http_request_result
  >,
  'deletePost' : ActorMethod<[PostId], undefined>,
  'deleteProduct' : ActorMethod<[ProductId], undefined>,
  'deleteRecipe' : ActorMethod<[RecipeId], boolean>,
  'deleteTray' : ActorMethod<[TrayId], undefined>,
  'delistNft' : ActorMethod<[bigint], boolean>,
  'delistPlant' : ActorMethod<[PlantId], boolean>,
  'editPost' : ActorMethod<[PostId, string], PostPublic>,
  'ensureAdminProfile' : ActorMethod<[], undefined>,
  'ensureCallerProfile' : ActorMethod<[], undefined>,
  'finalizeArtworkUpload' : ActorMethod<[], UploadResult>,
  'followUser' : ActorMethod<[Principal], undefined>,
  'generateAllPoolNFTs' : ActorMethod<[], bigint>,
  'generateClaimToken' : ActorMethod<[bigint], string>,
  'generateClaimTokens' : ActorMethod<
    [Array<bigint>],
    Array<{ 'tokenId' : bigint, 'claimToken' : string }>
  >,
  'generatePickupQRPayload' : ActorMethod<[PlantId], string>,
  'getActiveResaleListings' : ActorMethod<[], Array<ResaleListingPublic>>,
  'getAdminInventory' : ActorMethod<
    [[] | [PlantStage], [] | [bigint], [] | [boolean]],
    Array<PlantLifecycle>
  >,
  'getAdmins' : ActorMethod<[], Array<Principal>>,
  'getArtworkFile' : ActorMethod<[string], [] | [Uint8Array | number[]]>,
  'getArtworkUploadResult' : ActorMethod<[], UploadResult>,
  'getArtworkUploadStatus' : ActorMethod<[], UploadSessionStatus>,
  'getAuditLog' : ActorMethod<[bigint, bigint], Array<AuditEntry>>,
  'getBatchGiftPack' : ActorMethod<[ClaimTokenId], [] | [BatchGiftPackPublic]>,
  'getCallerDiscount' : ActorMethod<[], CallerDiscount>,
  'getCallerMembership' : ActorMethod<[], [] | [MembershipNFTPublic]>,
  'getCallerUserProfile' : ActorMethod<[], [] | [UserProfilePublic]>,
  'getCallerUserRole' : ActorMethod<[], UserRole>,
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
  'getDAOProposal' : ActorMethod<[ProposalId], [] | [ProposalPublic]>,
  'getDAOStats' : ActorMethod<
    [],
    {
      'totalVotes' : bigint,
      'totalProposals' : bigint,
      'activeProposals' : bigint,
    }
  >,
  'getFollowersCount' : ActorMethod<[Principal], bigint>,
  'getFollowingCount' : ActorMethod<[Principal], bigint>,
  'getForSalePlants' : ActorMethod<[], Array<PlantPublic>>,
  'getListedNfts' : ActorMethod<[[] | [boolean]], Array<NftListingPublic>>,
  'getLoadedMetadataCount' : ActorMethod<[], bigint>,
  'getMembershipPriceInToken' : ActorMethod<[OracleToken], bigint>,
  'getMyNftListings' : ActorMethod<[], Array<NftListingPublic>>,
  'getMyOffers' : ActorMethod<[], Array<Offer>>,
  'getMyPlantsNims' : ActorMethod<[], Array<PlantLifecycle>>,
  'getMyResaleListings' : ActorMethod<[], Array<ResaleListingPublic>>,
  'getMySchedules' : ActorMethod<[], Array<SavedSchedule>>,
  'getMyWeatherRecords' : ActorMethod<[bigint], Array<WeatherRecord>>,
  'getNftPoolStatus' : ActorMethod<
    [],
    { 'total' : bigint, 'available' : bigint }
  >,
  'getOffer' : ActorMethod<[string], [] | [Offer]>,
  'getOffersForNft' : ActorMethod<[string], Array<Offer>>,
  'getOffersReceived' : ActorMethod<[], Array<Offer>>,
  'getOrder' : ActorMethod<[OrderId], [] | [OrderPublic]>,
  'getOrderPickupClaimTokens' : ActorMethod<[OrderId], Array<string>>,
  'getPlant' : ActorMethod<[PlantId], [] | [PlantPublic]>,
  'getPlantByNft' : ActorMethod<[bigint], [] | [PlantLifecycle]>,
  'getPlantClaimToken' : ActorMethod<[PlantId], [] | [string]>,
  'getPlantCount' : ActorMethod<[], PlantCountStats>,
  'getPlantLifecycle' : ActorMethod<[PlantId], [] | [PlantLifecycle]>,
  'getPlantTimeline' : ActorMethod<[PlantId], [] | [PlantTimeline]>,
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
  'getProduct' : ActorMethod<[ProductId], [] | [ProductPublic]>,
  'getPublicProfile' : ActorMethod<[Principal], [] | [UserProfilePublic]>,
  'getRecipe' : ActorMethod<[RecipeId], [] | [Recipe]>,
  'getScheduleByShareToken' : ActorMethod<[string], [] | [SavedSchedule]>,
  'getScheduleData' : ActorMethod<
    [string, Array<string>],
    Array<ScheduleEntry>
  >,
  'getShopListingFile' : ActorMethod<[string], [] | [ShopListingFile]>,
  'getTokenPriceInIcp' : ActorMethod<[OracleToken], bigint>,
  'getTokenPrices' : ActorMethod<[], Array<TokenPrice>>,
  'getTray' : ActorMethod<[TrayId], [] | [TrayPublic]>,
  'getTreasuryBalance' : ActorMethod<[TreasuryToken], bigint>,
  'getTreasuryBalances' : ActorMethod<[], Array<TreasuryBalance>>,
  'getTreasuryLedger' : ActorMethod<[], Array<TreasuryTransaction>>,
  'getUpgradeHistory' : ActorMethod<[PlantId], Array<LifecycleUpgradeEvent>>,
  'getUserPosts' : ActorMethod<[Principal], Array<PostPublic>>,
  'getVariety' : ActorMethod<[bigint], [] | [VarietyPublic]>,
  'hasDAOAccess' : ActorMethod<[], boolean>,
  'hasMembership' : ActorMethod<[], boolean>,
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
  'isPepperHead' : ActorMethod<[bigint], boolean>,
  'isPepperHeadAvailable' : ActorMethod<[], bigint>,
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
  'likePost' : ActorMethod<[PostId], bigint>,
  'listArtworkFiles' : ActorMethod<[], Array<[string, bigint]>>,
  'listArtworkLayers' : ActorMethod<[], Array<ArtworkLayer>>,
  'listCommentsByPost' : ActorMethod<[PostId], Array<CommentPublic>>,
  'listDAOProposals' : ActorMethod<[], Array<ProposalPublic>>,
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
  'listRecipes' : ActorMethod<[], Array<Recipe>>,
  'listTrays' : ActorMethod<[], Array<TrayPublic>>,
  'listVarieties' : ActorMethod<[], Array<VarietyPublic>>,
  'loadStaticMetadata' : ActorMethod<
    [Array<[bigint, Uint8Array | number[]]>],
    LoadStaticMetadataResult
  >,
  'markCellGerminated' : ActorMethod<
    [TrayId, bigint, [] | [Timestamp]],
    AddPlantResult
  >,
  'markPlantGerminated' : ActorMethod<[PlantId, Timestamp], undefined>,
  'mintEXT' : ActorMethod<[bigint, string, Array<[string, string]>], string>,
  'mintHederaNFT' : ActorMethod<
    [PlantId, [] | [string], Array<[string, string]>],
    string
  >,
  'mintICRC37' : ActorMethod<
    [PlantId, [] | [string], Array<[string, string]>],
    string
  >,
  'mintRWAProvenance' : ActorMethod<[MintRWAProvenanceInput], string>,
  'placeOrder' : ActorMethod<[CreateOrderInput], OrderPublic>,
  'preGenerateNFTPool' : ActorMethod<
    [bigint, Array<bigint>],
    { 'ok' : boolean, 'total' : bigint }
  >,
  'priceOracleTransform' : ActorMethod<
    [{ 'context' : Uint8Array | number[], 'response' : http_request_result }],
    http_request_result
  >,
  'purchasePepperHead' : ActorMethod<
    [string],
    { 'tokenId' : [] | [bigint], 'message' : string, 'success' : boolean }
  >,
  'purchasePepperHeadDirect' : ActorMethod<
    [string, bigint],
    { 'tokenId' : [] | [bigint], 'message' : string, 'success' : boolean }
  >,
  'purchasePlant' : ActorMethod<
    [PlantId, PaymentToken, bigint],
    PurchasePlantResult
  >,
  'purchasePlantICPay' : ActorMethod<[PlantId, string], PurchasePlantResult>,
  'redeemBatchClaim' : ActorMethod<
    [ClaimTokenId],
    { 'ok' : BatchGiftPackPublic } |
      { 'err' : string }
  >,
  'redeemClaim' : ActorMethod<
    [string],
    { 'tokenId' : [] | [bigint], 'message' : string, 'success' : boolean }
  >,
  'refreshTokenPrices' : ActorMethod<[], boolean>,
  'rejectOffer' : ActorMethod<[string], Offer>,
  'removeAdmin' : ActorMethod<[Principal], undefined>,
  'removePlant' : ActorMethod<[PlantId], boolean>,
  'removePlantPhoto' : ActorMethod<[PlantId, string], undefined>,
  'removeVariety' : ActorMethod<[bigint], boolean>,
  'removeZonePhoto' : ActorMethod<[TrayId, string], undefined>,
  'resetOrphanPoolNFT' : ActorMethod<[bigint], boolean>,
  'resetPoolNFT' : ActorMethod<
    [bigint],
    { 'ok' : string } |
      { 'err' : string }
  >,
  'saveCallerUserProfile' : ActorMethod<[SaveProfileInput], undefined>,
  'saveSchedule' : ActorMethod<[string, Array<string>], ScheduleId>,
  'searchVarieties' : ActorMethod<[string], Array<VarietyPublic>>,
  'seedDefaultRecipes' : ActorMethod<[], undefined>,
  'setForSale' : ActorMethod<[PlantId, boolean], undefined>,
  'setICPaySecretKey' : ActorMethod<[string], undefined>,
  'setPlantNFT' : ActorMethod<[PlantId, string], undefined>,
  'storeArtworkFile' : ActorMethod<
    [string, Uint8Array | number[], string],
    StoredFile
  >,
  'submitOffer' : ActorMethod<[SubmitOfferInput], Offer>,
  'toggleCooked' : ActorMethod<[PlantId], undefined>,
  'toggleRecipeFeatured' : ActorMethod<[RecipeId], [] | [Recipe]>,
  'transplantCell' : ActorMethod<[TransplantInput], PlantPublic>,
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
  'unfollowUser' : ActorMethod<[Principal], undefined>,
  'unlikePost' : ActorMethod<[PostId], bigint>,
  'updateCellData' : ActorMethod<[UpdateCellDataInput], undefined>,
  'updateNimsPlantStage' : ActorMethod<[PlantId, PlantStage], boolean>,
  'updateOrderStatus' : ActorMethod<[OrderId, OrderStatus], undefined>,
  'updatePlantMetadata' : ActorMethod<[UpdatePlantMetadataInput], undefined>,
  'updatePlantPrice' : ActorMethod<[PlantId, bigint], boolean>,
  'updatePlantStage' : ActorMethod<[PlantId, PlantStage, string], undefined>,
  'updateProduct' : ActorMethod<[UpdateProductInput], undefined>,
  'updateRecipe' : ActorMethod<[UpdateRecipeInput], [] | [Recipe]>,
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
  'voteOnProposal' : ActorMethod<[ProposalId, bigint], undefined>,
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
export type PaymentToken = { 'ICP' : null } |
  { 'ckBTC' : null } |
  { 'ckETH' : null } |
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
export type PlantStage = { 'Seedling' : null } |
  { 'Seed' : null } |
  { 'Mature' : null };
export interface PlantTimeline {
  'stage_history' : Array<StageHistory>,
  'feedings' : Array<FeedingPublic>,
  'plant' : PlantPublic,
}
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
  'image_key' : [] | [string],
  'like_count' : bigint,
  'created_at' : Timestamp,
  'author_principal' : [] | [Principal],
  'author_username' : [] | [string],
  'is_anonymous' : boolean,
  'caller_liked' : boolean,
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
export type ProposalId = bigint;
export interface ProposalPublic {
  'id' : ProposalId,
  'title' : string,
  'vote_counts' : Array<bigint>,
  'ends_at' : Timestamp,
  'description' : string,
  'created_at' : Timestamp,
  'created_by' : Principal,
  'voter_count' : bigint,
  'caller_vote' : [] | [bigint],
  'options' : Array<string>,
  'proposal_type' : ProposalType,
}
export type ProposalType = { 'General' : null } |
  { 'Seasoning' : null } |
  { 'PlantVariety' : null };
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
export type RarityTier = { 'Rare' : null } |
  { 'Founder' : null } |
  { 'Uncommon' : null } |
  { 'Common' : null };
export interface Recipe {
  'id' : RecipeId,
  'updated_at' : Timestamp,
  'photo_key' : [] | [string],
  'name' : string,
  'tags' : Array<string>,
  'description' : string,
  'created_at' : Timestamp,
  'instructions' : Array<string>,
  'is_featured' : boolean,
  'shop_link' : [] | [string],
  'shop_link_label' : [] | [string],
  'application_notes' : string,
  'full_name' : string,
  'ingredients' : Array<string>,
}
export type RecipeId = bigint;
export interface ResaleListingPublic {
  'id' : string,
  'seller' : Principal,
  'is_active' : boolean,
  'price_icp' : number,
  'rarity_tier' : RarityTier,
  'listed_at' : Timestamp,
  'plant_id' : PlantId,
}
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
}
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
export interface StageHistory {
  'stage' : PlantStage,
  'notes' : string,
  'timestamp' : Timestamp,
}
export interface StoredFile {
  'data' : Uint8Array | number[],
  'path' : string,
  'size' : bigint,
  'mime_type' : string,
  'layer' : string,
  'filename' : string,
  'uploaded_at' : Timestamp,
}
export type Subaccount = Uint8Array | number[];
export interface SubmitOfferInput {
  'nft_id' : string,
  'offered_token' : OfferToken,
  'offered_amount' : bigint,
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
export type TrayId = bigint;
export interface TrayPublic {
  'id' : TrayId,
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
export interface UpdateProductInput {
  'active' : [] | [boolean],
  'product_id' : ProductId,
  'image_key' : [] | [string],
  'name' : [] | [string],
  'price_cents' : [] | [bigint],
  'description' : [] | [string],
  'image_keys' : [] | [Array<string>],
}
export interface UpdateRecipeInput {
  'id' : RecipeId,
  'photo_key' : [] | [string],
  'name' : [] | [string],
  'tags' : [] | [Array<string>],
  'description' : [] | [string],
  'instructions' : [] | [Array<string>],
  'is_featured' : [] | [boolean],
  'shop_link' : [] | [string],
  'shop_link_label' : [] | [string],
  'application_notes' : [] | [string],
  'full_name' : [] | [string],
  'ingredients' : [] | [Array<string>],
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
  'avatar_key' : [] | [string],
  'following_count' : bigint,
  'created_at' : Timestamp,
  'follower_count' : bigint,
  'principal_id' : Principal,
}
export type UserRole = { 'admin' : null } |
  { 'user' : null } |
  { 'guest' : null };
export type Value = { 'Int' : bigint } |
  { 'Map' : Array<[string, Value]> } |
  { 'Nat' : bigint } |
  { 'Blob' : Uint8Array | number[] } |
  { 'Text' : string } |
  { 'Array' : Array<Value> };
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
export interface http_header { 'value' : string, 'name' : string }
export interface http_request_result {
  'status' : bigint,
  'body' : Uint8Array | number[],
  'headers' : Array<http_header>,
}
export interface _SERVICE extends ICSpicy {}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
