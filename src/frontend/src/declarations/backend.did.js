export const idlFactory = ({ IDL }) => {
  const Value = IDL.Rec();
  const OfferStatus = IDL.Variant({
    'Countered' : IDL.Null,
    'Rejected' : IDL.Null,
    'Accepted' : IDL.Null,
    'Cancelled' : IDL.Null,
    'Pending' : IDL.Null,
  });
  const Timestamp = IDL.Int;
  const OfferToken = IDL.Variant({
    'ICP' : IDL.Null,
    'ckBTC' : IDL.Null,
    'ckETH' : IDL.Null,
    'ckUSDC' : IDL.Null,
    'ckUSDT' : IDL.Null,
  });
  const OfferAction = IDL.Variant({
    'Countered' : IDL.Null,
    'Rejected' : IDL.Null,
    'Accepted' : IDL.Null,
    'Cancelled' : IDL.Null,
    'Submitted' : IDL.Null,
  });
  const OfferHistoryEntry = IDL.Record({
    'by' : IDL.Principal,
    'token' : OfferToken,
    'action' : OfferAction,
    'timestamp' : Timestamp,
    'amount' : IDL.Nat,
  });
  const Offer = IDL.Record({
    'id' : IDL.Text,
    'nft_id' : IDL.Text,
    'status' : OfferStatus,
    'updated_at' : Timestamp,
    'history' : IDL.Vec(OfferHistoryEntry),
    'created_at' : Timestamp,
    'seller' : IDL.Principal,
    'offered_token' : OfferToken,
    'offered_amount' : IDL.Nat,
    'buyer' : IDL.Principal,
    'icp_equivalent' : IDL.Nat,
  });
  const ArtworkLayerId = IDL.Nat;
  const ArtworkLayer = IDL.Record({
    'id' : ArtworkLayerId,
    'layer_number' : IDL.Nat,
    'name' : IDL.Text,
    'object_key' : IDL.Text,
    'uploaded_at' : Timestamp,
  });
  const PlantId = IDL.Nat;
  const AddFeedingInput = IDL.Record({
    'dosage_amount' : IDL.Text,
    'date' : Timestamp,
    'nutrient_type' : IDL.Text,
    'product_name' : IDL.Text,
    'notes' : IDL.Opt(IDL.Text),
    'plant_id' : PlantId,
  });
  const FeedingId = IDL.Nat;
  const FeedingPublic = IDL.Record({
    'id' : FeedingId,
    'dosage_amount' : IDL.Text,
    'date' : Timestamp,
    'nutrient_type' : IDL.Text,
    'product_name' : IDL.Text,
    'notes' : IDL.Opt(IDL.Text),
    'plant_id' : PlantId,
  });
  const PlantStage = IDL.Variant({
    'Seedling' : IDL.Null,
    'Seed' : IDL.Null,
    'Mature' : IDL.Null,
  });
  const TrayId = IDL.Nat;
  const AddPlantResult = IDL.Record({
    'claimToken' : IDL.Text,
    'nftTokenId' : IDL.Nat,
    'plantId' : PlantId,
  });
  const AddWeatherRecordInput = IDL.Record({
    'latitude' : IDL.Float64,
    'temperature_max' : IDL.Float64,
    'temperature_min' : IDL.Float64,
    'precipitation' : IDL.Float64,
    'wind_speed' : IDL.Opt(IDL.Float64),
    'date' : IDL.Text,
    'humidity' : IDL.Opt(IDL.Float64),
    'longitude' : IDL.Float64,
  });
  const WeatherRecordId = IDL.Nat;
  const WeatherRecord = IDL.Record({
    'id' : WeatherRecordId,
    'latitude' : IDL.Float64,
    'temperature_max' : IDL.Float64,
    'temperature_min' : IDL.Float64,
    'precipitation' : IDL.Float64,
    'wind_speed' : IDL.Opt(IDL.Float64),
    'date' : IDL.Text,
    'user' : IDL.Principal,
    'humidity' : IDL.Opt(IDL.Float64),
    'recorded_at' : Timestamp,
    'longitude' : IDL.Float64,
  });
  const WeatherSnapshot = IDL.Record({
    'source' : IDL.Text,
    'date' : IDL.Text,
    'tempHighF' : IDL.Float64,
    'rainfallInches' : IDL.Float64,
    'uvIndex' : IDL.Float64,
    'humidity' : IDL.Float64,
    'tempLowF' : IDL.Float64,
  });
  const Subaccount = IDL.Vec(IDL.Nat8);
  const Account = IDL.Record({
    'owner' : IDL.Principal,
    'subaccount' : IDL.Opt(Subaccount),
  });
  const TransferError = IDL.Variant({
    'GenericError' : IDL.Record({
      'message' : IDL.Text,
      'error_code' : IDL.Nat,
    }),
    'Duplicate' : IDL.Record({ 'duplicate_of' : IDL.Nat }),
    'NonExistingTokenId' : IDL.Null,
    'Unauthorized' : IDL.Null,
    'CreatedInFuture' : IDL.Record({ 'ledger_time' : IDL.Nat64 }),
    'InvalidRecipient' : IDL.Null,
    'GenericBatchError' : IDL.Record({
      'message' : IDL.Text,
      'error_code' : IDL.Nat,
    }),
    'TooOld' : IDL.Null,
  });
  const TransferResult = IDL.Variant({ 'Ok' : IDL.Nat, 'Err' : TransferError });
  const UserRole = IDL.Variant({
    'admin' : IDL.Null,
    'user' : IDL.Null,
    'guest' : IDL.Null,
  });
  const AssignAction = IDL.Variant({
    'AssignToQR' : IDL.Record({ 'claim_token' : IDL.Text }),
    'ListOnShop' : IDL.Record({ 'product_id' : IDL.Nat }),
    'Airdrop' : IDL.Record({ 'to' : IDL.Principal }),
  });
  const AirdropAssignment = IDL.Record({
    'recipient' : IDL.Principal,
    'nftId' : IDL.Nat,
  });
  const QRAssignmentResult = IDL.Record({
    'claimTokenId' : IDL.Text,
    'nftId' : IDL.Nat,
  });
  const ShopAssignment = IDL.Record({ 'nftId' : IDL.Nat, 'price' : IDL.Nat });
  const RarityTier = IDL.Variant({
    'Rare' : IDL.Null,
    'Founder' : IDL.Null,
    'Uncommon' : IDL.Null,
    'Common' : IDL.Null,
  });
  const NFTStandard = IDL.Variant({
    'EXT' : IDL.Null,
    'Hedera' : IDL.Null,
    'ICRC37' : IDL.Null,
  });
  const FoundersMintInput = IDL.Record({
    'layerCombination' : IDL.Vec(IDL.Nat),
    'recipient' : IDL.Principal,
    'rarityTier' : RarityTier,
    'badgeImageKey' : IDL.Text,
    'nft_standard' : NFTStandard,
    'compositeImageKey' : IDL.Text,
  });
  const FoundersMintResult = IDL.Record({
    'tokenId' : IDL.Text,
    'recipient' : IDL.Principal,
    'standard' : NFTStandard,
  });
  const InventoryCategory = IDL.Variant({
    'OtherSize' : IDL.Text,
    'Gal1' : IDL.Null,
    'Gal3' : IDL.Null,
    'Gal5' : IDL.Null,
    'Oz16' : IDL.Null,
    'InGround' : IDL.Null,
  });
  const ProductCategory = IDL.Variant({
    'Spice' : IDL.Null,
    'Seedling' : IDL.Null,
    'GardenInputs' : IDL.Null,
    'FreshPodsFlatRate' : IDL.Null,
    'GardenAmendment' : IDL.Null,
    'FreshPodsByLb' : IDL.Null,
    'DriedPods' : IDL.Null,
    'Gallon1' : IDL.Null,
    'Gallon5' : IDL.Null,
    'LivePlant' : IDL.Null,
  });
  const CreateProductInput = IDL.Record({
    'image_key' : IDL.Opt(IDL.Text),
    'shipping_flat_rate_cents' : IDL.Opt(IDL.Nat),
    'unit_label' : IDL.Opt(IDL.Text),
    'name' : IDL.Text,
    'price_cents' : IDL.Nat,
    'description' : IDL.Text,
    'inventory_category' : IDL.Opt(InventoryCategory),
    'image_keys' : IDL.Vec(IDL.Text),
    'shippable' : IDL.Bool,
    'category' : ProductCategory,
    'variety' : IDL.Opt(IDL.Text),
    'weight_based' : IDL.Bool,
    'price_per_unit_cents' : IDL.Opt(IDL.Nat),
    'plant_id' : IDL.Opt(PlantId),
  });
  const ProductId = IDL.Nat;
  const ProductPublic = IDL.Record({
    'id' : ProductId,
    'active' : IDL.Bool,
    'nft_token_id' : IDL.Opt(IDL.Nat),
    'image_key' : IDL.Opt(IDL.Text),
    'shipping_flat_rate_cents' : IDL.Opt(IDL.Nat),
    'unit_label' : IDL.Opt(IDL.Text),
    'name' : IDL.Text,
    'price_cents' : IDL.Nat,
    'description' : IDL.Text,
    'inventory_category' : IDL.Opt(InventoryCategory),
    'image_keys' : IDL.Vec(IDL.Text),
    'shippable' : IDL.Bool,
    'category' : ProductCategory,
    'variety' : IDL.Opt(IDL.Text),
    'weight_based' : IDL.Bool,
    'price_per_unit_cents' : IDL.Nat,
    'plant_id' : IDL.Opt(PlantId),
  });
  const BulkCreateResult = IDL.Variant({
    'ok' : ProductPublic,
    'err' : IDL.Text,
  });
  const PaymentToken = IDL.Variant({
    'ICP' : IDL.Null,
    'ckBTC' : IDL.Null,
    'ckETH' : IDL.Null,
    'ckUSDC' : IDL.Null,
    'ckUSDT' : IDL.Null,
  });
  const BuyListedNftResult = IDL.Record({
    'message' : IDL.Text,
    'success' : IDL.Bool,
  });
  const CounterOfferInput = IDL.Record({
    'counter_amount' : IDL.Nat,
    'offer_id' : IDL.Text,
    'counter_token' : OfferToken,
  });
  const ClaimTokenId = IDL.Text;
  const BatchGiftPackPublic = IDL.Record({
    'id' : IDL.Text,
    'creator' : IDL.Principal,
    'plant_ids' : IDL.Vec(PlantId),
    'redeemed' : IDL.Bool,
    'created_at' : Timestamp,
    'redeemed_by' : IDL.Opt(IDL.Principal),
    'claim_token_id' : ClaimTokenId,
    'highest_rarity_pct' : IDL.Nat,
  });
  const PostId = IDL.Nat;
  const CreateCommentInput = IDL.Record({
    'post_id' : PostId,
    'content' : IDL.Text,
  });
  const CommentId = IDL.Nat;
  const CommentPublic = IDL.Record({
    'id' : CommentId,
    'post_id' : PostId,
    'content' : IDL.Text,
    'created_at' : Timestamp,
    'author' : IDL.Principal,
    'author_username' : IDL.Opt(IDL.Text),
  });
  const ProposalType = IDL.Variant({
    'General' : IDL.Null,
    'Seasoning' : IDL.Null,
    'PlantVariety' : IDL.Null,
  });
  const CreateProposalInput = IDL.Record({
    'title' : IDL.Text,
    'ends_at' : Timestamp,
    'description' : IDL.Text,
    'options' : IDL.Vec(IDL.Text),
    'proposal_type' : ProposalType,
  });
  const ProposalId = IDL.Nat;
  const ProposalPublic = IDL.Record({
    'id' : ProposalId,
    'title' : IDL.Text,
    'vote_counts' : IDL.Vec(IDL.Nat),
    'ends_at' : Timestamp,
    'description' : IDL.Text,
    'created_at' : Timestamp,
    'created_by' : IDL.Principal,
    'voter_count' : IDL.Nat,
    'caller_vote' : IDL.Opt(IDL.Nat),
    'options' : IDL.Vec(IDL.Text),
    'proposal_type' : ProposalType,
  });
  const ShippingAddress = IDL.Record({
    'zip' : IDL.Text,
    'city' : IDL.Text,
    'state' : IDL.Text,
    'street_line1' : IDL.Text,
    'street_line2' : IDL.Opt(IDL.Text),
    'phone' : IDL.Text,
    'full_name' : IDL.Text,
  });
  const OrderItem = IDL.Record({
    'product_id' : ProductId,
    'price_cents' : IDL.Nat,
    'quantity' : IDL.Nat,
    'plant_id' : IDL.Opt(PlantId),
  });
  const CreateOrderInput = IDL.Record({
    'shipping' : IDL.Opt(ShippingAddress),
    'pickup' : IDL.Bool,
    'items' : IDL.Vec(OrderItem),
  });
  const OrderId = IDL.Nat;
  const OrderStatus = IDL.Variant({
    'PickedUp' : IDL.Null,
    'Cancelled' : IDL.Null,
    'Shipped' : IDL.Null,
    'Pending' : IDL.Null,
  });
  const OrderPublic = IDL.Record({
    'id' : OrderId,
    'status' : OrderStatus,
    'subtotal_cents' : IDL.Nat,
    'shipping_address' : IDL.Opt(IDL.Text),
    'shipping_cents' : IDL.Nat,
    'shipping' : IDL.Opt(ShippingAddress),
    'created_at' : Timestamp,
    'pickup' : IDL.Bool,
    'line_nft_token_ids' : IDL.Vec(IDL.Nat),
    'buyer' : IDL.Principal,
    'items' : IDL.Vec(OrderItem),
    'total_cents' : IDL.Nat,
  });
  const ContainerSize = IDL.Variant({
    'Gal5Bucket' : IDL.Null,
    'Gal1' : IDL.Null,
    'Gal3' : IDL.Null,
    'Gal5' : IDL.Null,
    'Oz16' : IDL.Null,
    'Gal7GrowBag' : IDL.Null,
    'Cell72' : IDL.Null,
    'Pot4Inch' : IDL.Null,
    'InGround' : IDL.Null,
    'Pot6Inch' : IDL.Null,
    'Gal10GrowBag' : IDL.Null,
    'Gal1New' : IDL.Null,
    'Gal3New' : IDL.Null,
    'Gal7Pot' : IDL.Null,
    'Cell128' : IDL.Null,
    'Gal15GrowBag' : IDL.Null,
    'Gal5GrowBag' : IDL.Null,
    'Other' : IDL.Text,
  });
  const CreatePlantInput = IDL.Record({
    'container_size' : IDL.Opt(ContainerSize),
    'date_purchased' : IDL.Opt(Timestamp),
    'origin' : IDL.Opt(IDL.Text),
    'common_name' : IDL.Opt(IDL.Text),
    'source_plant_id' : IDL.Opt(PlantId),
    'cell_position' : IDL.Nat,
    'watering_schedule' : IDL.Opt(IDL.Text),
    'pest_notes' : IDL.Opt(IDL.Text),
    'tray_id' : TrayId,
    'notes' : IDL.Text,
    'planting_date' : Timestamp,
    'additional_notes' : IDL.Opt(IDL.Text),
    'genetics' : IDL.Text,
    'variety' : IDL.Text,
    'nft_standard' : NFTStandard,
    'latin_name' : IDL.Opt(IDL.Text),
  });
  const PlantPublic = IDL.Record({
    'id' : PlantId,
    'nft_id' : IDL.Opt(IDL.Text),
    'container_size' : IDL.Opt(ContainerSize),
    'origin' : IDL.Opt(IDL.Text),
    'sold' : IDL.Bool,
    'is_transplanted' : IDL.Bool,
    'common_name' : IDL.Opt(IDL.Text),
    'for_sale' : IDL.Bool,
    'created_by' : IDL.Principal,
    'is_cooked' : IDL.Bool,
    'source_plant_id' : IDL.Opt(PlantId),
    'cell_position' : IDL.Nat,
    'watering_schedule' : IDL.Opt(IDL.Text),
    'pest_notes' : IDL.Opt(IDL.Text),
    'sold_to' : IDL.Opt(IDL.Principal),
    'stage' : PlantStage,
    'germination_date' : IDL.Opt(Timestamp),
    'tray_id' : TrayId,
    'notes' : IDL.Text,
    'planting_date' : Timestamp,
    'transplant_date' : IDL.Opt(Timestamp),
    'additional_notes' : IDL.Opt(IDL.Text),
    'photo_keys' : IDL.Vec(IDL.Text),
    'genetics' : IDL.Text,
    'variety' : IDL.Text,
    'transplant_plant_id' : IDL.Opt(PlantId),
    'nft_standard' : NFTStandard,
    'photos' : IDL.Vec(IDL.Text),
    'latin_name' : IDL.Opt(IDL.Text),
  });
  const CreatePostInput = IDL.Record({
    'content' : IDL.Text,
    'image_key' : IDL.Opt(IDL.Text),
    'anonymous' : IDL.Bool,
  });
  const PostPublic = IDL.Record({
    'id' : PostId,
    'updated_at' : Timestamp,
    'content' : IDL.Text,
    'author_text' : IDL.Text,
    'comment_count' : IDL.Nat,
    'image_key' : IDL.Opt(IDL.Text),
    'like_count' : IDL.Nat,
    'created_at' : Timestamp,
    'author_principal' : IDL.Opt(IDL.Principal),
    'author_username' : IDL.Opt(IDL.Text),
    'is_anonymous' : IDL.Bool,
    'caller_liked' : IDL.Bool,
  });
  const CreateRecipeInput = IDL.Record({
    'photo_key' : IDL.Opt(IDL.Text),
    'name' : IDL.Text,
    'tags' : IDL.Vec(IDL.Text),
    'description' : IDL.Text,
    'instructions' : IDL.Vec(IDL.Text),
    'is_featured' : IDL.Bool,
    'shop_link' : IDL.Opt(IDL.Text),
    'shop_link_label' : IDL.Opt(IDL.Text),
    'application_notes' : IDL.Text,
    'full_name' : IDL.Text,
    'ingredients' : IDL.Vec(IDL.Text),
  });
  const RecipeId = IDL.Nat;
  const Recipe = IDL.Record({
    'id' : RecipeId,
    'updated_at' : Timestamp,
    'photo_key' : IDL.Opt(IDL.Text),
    'name' : IDL.Text,
    'tags' : IDL.Vec(IDL.Text),
    'description' : IDL.Text,
    'created_at' : Timestamp,
    'instructions' : IDL.Vec(IDL.Text),
    'is_featured' : IDL.Bool,
    'shop_link' : IDL.Opt(IDL.Text),
    'shop_link_label' : IDL.Opt(IDL.Text),
    'application_notes' : IDL.Text,
    'full_name' : IDL.Text,
    'ingredients' : IDL.Vec(IDL.Text),
  });
  const CreateTrayInput = IDL.Record({
    'name' : IDL.Text,
    'planting_date' : Timestamp,
    'nft_standard' : NFTStandard,
  });
  const TrayPublic = IDL.Record({
    'id' : TrayId,
    'cells' : IDL.Vec(IDL.Opt(PlantId)),
    'name' : IDL.Text,
    'sort_order' : IDL.Nat,
    'cell_count' : IDL.Nat,
    'zone_notes' : IDL.Text,
    'planting_date' : Timestamp,
    'nft_standard' : NFTStandard,
    'zone_photo_keys' : IDL.Vec(IDL.Text),
  });
  const http_header = IDL.Record({ 'value' : IDL.Text, 'name' : IDL.Text });
  const http_request_result = IDL.Record({
    'status' : IDL.Nat,
    'body' : IDL.Vec(IDL.Nat8),
    'headers' : IDL.Vec(http_header),
  });
  const LayerSummary = IDL.Record({
    'file_names' : IDL.Vec(IDL.Text),
    'layer' : IDL.Text,
    'file_count' : IDL.Nat,
  });
  const UploadResult = IDL.Record({
    'layers_detected' : IDL.Nat,
    'asset_canister_id' : IDL.Text,
    'total_files' : IDL.Nat,
    'layer_summaries' : IDL.Vec(LayerSummary),
  });
  const ResaleListingPublic = IDL.Record({
    'id' : IDL.Text,
    'seller' : IDL.Principal,
    'is_active' : IDL.Bool,
    'price_icp' : IDL.Float64,
    'rarity_tier' : RarityTier,
    'listed_at' : Timestamp,
    'plant_id' : PlantId,
  });
  const WateringEntry = IDL.Record({
    'amountMl' : IDL.Nat,
    'author' : IDL.Principal,
    'notes' : IDL.Opt(IDL.Text),
    'timestamp' : Timestamp,
    'phLevel' : IDL.Opt(IDL.Float64),
  });
  const PestEntry = IDL.Record({
    'treatment' : IDL.Opt(IDL.Text),
    'pestName' : IDL.Text,
    'author' : IDL.Principal,
    'notes' : IDL.Opt(IDL.Text),
    'timestamp' : Timestamp,
    'severity' : IDL.Text,
  });
  const PlantNote = IDL.Record({
    'text' : IDL.Text,
    'author' : IDL.Principal,
    'timestamp' : Timestamp,
  });
  const PlantPhotoEntry = IDL.Record({
    'url' : IDL.Text,
    'author' : IDL.Principal,
    'timestamp' : Timestamp,
    'caption' : IDL.Opt(IDL.Text),
  });
  const PlantLifecycle = IDL.Record({
    'wateringLog' : IDL.Vec(WateringEntry),
    'pestLog' : IDL.Vec(PestEntry),
    'soldAt' : IDL.Opt(Timestamp),
    'feedingLog' : IDL.Vec(FeedingPublic),
    'nftTokenId' : IDL.Opt(IDL.Nat),
    'notes' : IDL.Vec(PlantNote),
    'plant' : PlantPublic,
    'priceCents' : IDL.Opt(IDL.Nat),
    'varietyId' : IDL.Opt(IDL.Nat),
    'weatherSnapshots' : IDL.Vec(WeatherSnapshot),
    'photos' : IDL.Vec(PlantPhotoEntry),
  });
  const UploadSessionStatus = IDL.Record({
    'total_chunks' : IDL.Nat,
    'received' : IDL.Nat,
    'started_at' : Timestamp,
  });
  const Time = IDL.Int;
  const AuditEntry = IDL.Record({
    'ts' : Time,
    'action' : IDL.Text,
    'admin' : IDL.Principal,
    'detail' : IDL.Text,
  });
  const CallerDiscount = IDL.Record({
    'tokenId' : IDL.Opt(IDL.Nat),
    'discountPercent' : IDL.Nat,
    'rarity' : IDL.Text,
  });
  const MembershipTier = IDL.Variant({
    'Premium' : IDL.Null,
    'Standard' : IDL.Null,
  });
  const MembershipNFTPublic = IDL.Record({
    'id' : IDL.Nat,
    'nft_id' : IDL.Opt(IDL.Text),
    'issued_at' : Timestamp,
    'owner' : IDL.Principal,
    'tier' : MembershipTier,
    'is_founder' : IDL.Bool,
    'layer_combination' : IDL.Vec(IDL.Nat),
    'rarity_tier' : IDL.Opt(RarityTier),
    'nft_standard' : IDL.Variant({
      'EXT' : IDL.Null,
      'Hedera' : IDL.Null,
      'ICRC37' : IDL.Null,
    }),
  });
  const UserProfilePublic = IDL.Record({
    'bio' : IDL.Text,
    'username' : IDL.Text,
    'avatar_key' : IDL.Opt(IDL.Text),
    'following_count' : IDL.Nat,
    'created_at' : Timestamp,
    'follower_count' : IDL.Nat,
    'principal_id' : IDL.Principal,
  });
  const NftListingPublic = IDL.Record({
    'tokenId' : IDL.Nat,
    'listedAt' : Timestamp,
    'seller' : IDL.Principal,
    'isActive' : IDL.Bool,
    'plantId' : IDL.Opt(PlantId),
    'priceUsdCents' : IDL.Nat,
  });
  const OracleToken = IDL.Variant({
    'ICP' : IDL.Null,
    'ckBTC' : IDL.Null,
    'ckETH' : IDL.Null,
    'ckUSDC' : IDL.Null,
    'ckUSDT' : IDL.Null,
  });
  const ScheduleId = IDL.Text;
  const SavedSchedule = IDL.Record({
    'id' : ScheduleId,
    'owner' : IDL.Principal,
    'created_at' : Timestamp,
    'stage' : IDL.Text,
    'inputs' : IDL.Vec(IDL.Text),
    'share_token' : IDL.Text,
  });
  const PlantCountStats = IDL.Record({
    'total' : IDL.Nat,
    'sold' : IDL.Nat,
    'byStage' : IDL.Vec(IDL.Tuple(PlantStage, IDL.Nat)),
    'forSale' : IDL.Nat,
  });
  const StageHistory = IDL.Record({
    'stage' : PlantStage,
    'notes' : IDL.Text,
    'timestamp' : Timestamp,
  });
  const PlantTimeline = IDL.Record({
    'stage_history' : IDL.Vec(StageHistory),
    'feedings' : IDL.Vec(FeedingPublic),
    'plant' : PlantPublic,
  });
  const PoolDashboard = IDL.Record({
    'total' : IDL.Nat,
    'listed_on_shop' : IDL.Nat,
    'assigned_to_qr' : IDL.Nat,
    'airdropped' : IDL.Nat,
    'ready' : IDL.Nat,
  });
  const PoolNFTStatus = IDL.Variant({
    'ListedOnShop' : IDL.Record({ 'at' : Timestamp, 'product_id' : IDL.Nat }),
    'Ready' : IDL.Null,
    'AssignedToQR' : IDL.Record({ 'at' : Timestamp, 'claim_token' : IDL.Text }),
    'Airdropped' : IDL.Record({ 'at' : Timestamp, 'to' : IDL.Principal }),
  });
  const PoolNFTRarity = IDL.Variant({
    'Rare' : IDL.Null,
    'Uncommon' : IDL.Null,
    'Common' : IDL.Null,
  });
  const PoolNFTPublic = IDL.Record({
    'id' : IDL.Nat,
    'status' : PoolNFTStatus,
    'generated_at' : Timestamp,
    'token_id' : IDL.Text,
    'image_key' : IDL.Text,
    'layer_combo' : IDL.Vec(IDL.Text),
    'rarity' : PoolNFTRarity,
  });
  const PoolNFTStatus__1 = IDL.Variant({
    'Shop' : IDL.Null,
    'QRAssigned' : IDL.Null,
    'Ready' : IDL.Null,
    'Airdropped' : IDL.Null,
  });
  const PoolNFTPublic__1 = IDL.Record({
    'id' : IDL.Nat,
    'status' : PoolNFTStatus__1,
    'shopProductId' : IDL.Opt(IDL.Nat),
    'assignedAt' : IDL.Opt(Timestamp),
    'assignedTo' : IDL.Opt(IDL.Principal),
    'layerCombination' : IDL.Vec(IDL.Nat),
    'rarityTier' : RarityTier,
    'claimTokenId' : IDL.Opt(IDL.Text),
    'compositeImageKey' : IDL.Text,
  });
  const PoolStats = IDL.Record({
    'shop' : IDL.Nat,
    'totalByRarity' : IDL.Record({
      'rare' : IDL.Nat,
      'founder' : IDL.Nat,
      'common' : IDL.Nat,
      'uncommon' : IDL.Nat,
    }),
    'qrAssigned' : IDL.Nat,
    'airdropped' : IDL.Nat,
    'ready' : IDL.Nat,
  });
  const ScheduleEntry = IDL.Record({
    'timing' : IDL.Text,
    'dilution' : IDL.Text,
    'stage' : IDL.Text,
    'notes' : IDL.Text,
    'frequency' : IDL.Text,
    'input_name' : IDL.Text,
  });
  const ShopListingFile = IDL.Record({
    'data' : IDL.Vec(IDL.Nat8),
    'mime_type' : IDL.Text,
  });
  const TokenPrice = IDL.Record({
    'token' : OracleToken,
    'price_in_icp_e8s' : IDL.Nat,
    'last_updated' : Timestamp,
  });
  const TreasuryToken = IDL.Variant({
    'ICP' : IDL.Null,
    'ckBTC' : IDL.Null,
    'ckETH' : IDL.Null,
    'ckUSDC' : IDL.Null,
    'ckUSDT' : IDL.Null,
  });
  const TreasuryBalance = IDL.Record({
    'token' : TreasuryToken,
    'balance_e8s' : IDL.Nat,
  });
  const TreasuryTxType = IDL.Variant({
    'Deposit' : IDL.Null,
    'Withdrawal' : IDL.Null,
    'OfferSettlement' : IDL.Null,
    'Transfer' : IDL.Null,
  });
  const TreasuryTransaction = IDL.Record({
    'id' : IDL.Text,
    'token' : TreasuryToken,
    'to_principal' : IDL.Opt(IDL.Principal),
    'memo' : IDL.Opt(IDL.Text),
    'from_principal' : IDL.Opt(IDL.Principal),
    'amount_e8s' : IDL.Nat,
    'offer_id' : IDL.Opt(IDL.Text),
    'timestamp' : Timestamp,
    'tx_type' : TreasuryTxType,
  });
  const LifecycleUpgradeEvent = IDL.Record({
    'new_stage' : IDL.Text,
    'old_nft_id' : IDL.Opt(IDL.Text),
    'old_stage' : IDL.Text,
    'upgraded_at' : Timestamp,
    'new_nft_id' : IDL.Text,
    'plant_id' : PlantId,
  });
  const VarietyPublic = IDL.Record({
    'id' : IDL.Nat,
    'daysToMaturity' : IDL.Opt(IDL.Nat),
    'name' : IDL.Text,
    'createdAt' : Timestamp,
    'description' : IDL.Text,
    'imageUrl' : IDL.Opt(IDL.Text),
    'scovilleMax' : IDL.Nat,
    'scovilleMin' : IDL.Nat,
    'species' : IDL.Text,
    'daysToGermination' : IDL.Opt(IDL.Nat),
  });
  const ApprovalInfo = IDL.Record({
    'memo' : IDL.Opt(IDL.Vec(IDL.Nat8)),
    'from_subaccount' : IDL.Opt(IDL.Vec(IDL.Nat8)),
    'created_at_time' : IDL.Opt(IDL.Nat64),
    'expires_at' : IDL.Opt(IDL.Nat64),
    'spender' : Account,
  });
  const ApproveTokenArg = IDL.Record({
    'token_id' : IDL.Nat,
    'approval_info' : ApprovalInfo,
  });
  const ApproveTokenError = IDL.Variant({
    'GenericError' : IDL.Record({
      'message' : IDL.Text,
      'error_code' : IDL.Nat,
    }),
    'Duplicate' : IDL.Record({ 'duplicate_of' : IDL.Nat }),
    'InvalidSpender' : IDL.Null,
    'NonExistingTokenId' : IDL.Null,
    'Unauthorized' : IDL.Null,
    'CreatedInFuture' : IDL.Record({ 'ledger_time' : IDL.Nat64 }),
    'GenericBatchError' : IDL.Record({
      'message' : IDL.Text,
      'error_code' : IDL.Nat,
    }),
    'TooOld' : IDL.Null,
  });
  const ApproveTokenResult = IDL.Variant({
    'Ok' : IDL.Nat,
    'Err' : ApproveTokenError,
  });
  const TokenApproval = IDL.Record({
    'token_id' : IDL.Nat,
    'approval_info' : ApprovalInfo,
  });
  const IsApprovedArg = IDL.Record({
    'token_id' : IDL.Nat,
    'from_subaccount' : IDL.Opt(IDL.Vec(IDL.Nat8)),
    'spender' : Account,
  });
  const RevokeTokenApprovalArg = IDL.Record({
    'token_id' : IDL.Nat,
    'memo' : IDL.Opt(IDL.Vec(IDL.Nat8)),
    'from_subaccount' : IDL.Opt(IDL.Vec(IDL.Nat8)),
    'created_at_time' : IDL.Opt(IDL.Nat64),
    'spender' : IDL.Opt(Account),
  });
  const RevokeTokenApprovalError = IDL.Variant({
    'GenericError' : IDL.Record({
      'message' : IDL.Text,
      'error_code' : IDL.Nat,
    }),
    'Duplicate' : IDL.Record({ 'duplicate_of' : IDL.Nat }),
    'NonExistingTokenId' : IDL.Null,
    'Unauthorized' : IDL.Null,
    'CreatedInFuture' : IDL.Record({ 'ledger_time' : IDL.Nat64 }),
    'ApprovalDoesNotExist' : IDL.Null,
    'GenericBatchError' : IDL.Record({
      'message' : IDL.Text,
      'error_code' : IDL.Nat,
    }),
    'TooOld' : IDL.Null,
  });
  const RevokeTokenApprovalResult = IDL.Variant({
    'Ok' : IDL.Nat,
    'Err' : RevokeTokenApprovalError,
  });
  const TransferFromArg = IDL.Record({
    'to' : Account,
    'spender_subaccount' : IDL.Opt(IDL.Vec(IDL.Nat8)),
    'token_id' : IDL.Nat,
    'from' : Account,
    'memo' : IDL.Opt(IDL.Vec(IDL.Nat8)),
    'created_at_time' : IDL.Opt(IDL.Nat64),
  });
  const TransferFromError = IDL.Variant({
    'GenericError' : IDL.Record({
      'message' : IDL.Text,
      'error_code' : IDL.Nat,
    }),
    'Duplicate' : IDL.Record({ 'duplicate_of' : IDL.Nat }),
    'NonExistingTokenId' : IDL.Null,
    'Unauthorized' : IDL.Null,
    'CreatedInFuture' : IDL.Record({ 'ledger_time' : IDL.Nat64 }),
    'InvalidRecipient' : IDL.Null,
    'GenericBatchError' : IDL.Record({
      'message' : IDL.Text,
      'error_code' : IDL.Nat,
    }),
    'TooOld' : IDL.Null,
  });
  const TransferFromResult = IDL.Variant({
    'Ok' : IDL.Nat,
    'Err' : TransferFromError,
  });
  Value.fill(
    IDL.Variant({
      'Int' : IDL.Int,
      'Map' : IDL.Vec(IDL.Tuple(IDL.Text, Value)),
      'Nat' : IDL.Nat,
      'Blob' : IDL.Vec(IDL.Nat8),
      'Text' : IDL.Text,
      'Array' : IDL.Vec(Value),
    })
  );
  const TransferArgs = IDL.Record({
    'to' : Account,
    'token_id' : IDL.Nat,
    'memo' : IDL.Opt(IDL.Vec(IDL.Nat8)),
    'from_subaccount' : IDL.Opt(IDL.Vec(IDL.Nat8)),
    'created_at_time' : IDL.Opt(IDL.Nat64),
  });
  const LoadStaticMetadataResult = IDL.Record({
    'skipped' : IDL.Nat,
    'errors' : IDL.Vec(IDL.Tuple(IDL.Nat, IDL.Text)),
    'loaded' : IDL.Nat,
  });
  const MintRWAProvenanceInput = IDL.Record({
    'custom_notes' : IDL.Text,
    'artwork_layer_id' : ArtworkLayerId,
    'rarity_tier' : IDL.Nat,
    'plant_id' : PlantId,
  });
  const PurchasePlantResult = IDL.Record({
    'claimToken' : IDL.Opt(ClaimTokenId),
    'nftTokenId' : IDL.Opt(IDL.Nat),
    'message' : IDL.Text,
    'success' : IDL.Bool,
  });
  const SaveProfileInput = IDL.Record({
    'bio' : IDL.Text,
    'username' : IDL.Text,
    'avatar_key' : IDL.Opt(IDL.Text),
  });
  const StoredFile = IDL.Record({
    'data' : IDL.Vec(IDL.Nat8),
    'path' : IDL.Text,
    'size' : IDL.Nat,
    'mime_type' : IDL.Text,
    'layer' : IDL.Text,
    'filename' : IDL.Text,
    'uploaded_at' : Timestamp,
  });
  const SubmitOfferInput = IDL.Record({
    'nft_id' : IDL.Text,
    'offered_token' : OfferToken,
    'offered_amount' : IDL.Nat,
  });
  const TransplantInput = IDL.Record({
    'container_size' : ContainerSize,
    'plant_id' : PlantId,
  });
  const UpdateCellDataInput = IDL.Record({
    'origin' : IDL.Opt(IDL.Text),
    'common_name' : IDL.Opt(IDL.Text),
    'watering_schedule' : IDL.Opt(IDL.Text),
    'pest_notes' : IDL.Opt(IDL.Text),
    'notes' : IDL.Opt(IDL.Text),
    'additional_notes' : IDL.Opt(IDL.Text),
    'plant_id' : PlantId,
    'latin_name' : IDL.Opt(IDL.Text),
  });
  const UpdatePlantMetadataInput = IDL.Record({
    'notes' : IDL.Opt(IDL.Text),
    'genetics' : IDL.Opt(IDL.Text),
    'photos' : IDL.Opt(IDL.Vec(IDL.Text)),
    'plant_id' : PlantId,
  });
  const UpdateProductInput = IDL.Record({
    'active' : IDL.Opt(IDL.Bool),
    'product_id' : ProductId,
    'image_key' : IDL.Opt(IDL.Text),
    'name' : IDL.Opt(IDL.Text),
    'price_cents' : IDL.Opt(IDL.Nat),
    'description' : IDL.Opt(IDL.Text),
    'image_keys' : IDL.Opt(IDL.Vec(IDL.Text)),
  });
  const UpdateRecipeInput = IDL.Record({
    'id' : RecipeId,
    'photo_key' : IDL.Opt(IDL.Text),
    'name' : IDL.Opt(IDL.Text),
    'tags' : IDL.Opt(IDL.Vec(IDL.Text)),
    'description' : IDL.Opt(IDL.Text),
    'instructions' : IDL.Opt(IDL.Vec(IDL.Text)),
    'is_featured' : IDL.Opt(IDL.Bool),
    'shop_link' : IDL.Opt(IDL.Text),
    'shop_link_label' : IDL.Opt(IDL.Text),
    'application_notes' : IDL.Opt(IDL.Text),
    'full_name' : IDL.Opt(IDL.Text),
    'ingredients' : IDL.Opt(IDL.Vec(IDL.Text)),
  });
  const ICSpicy = IDL.Service({
    '_initializeAccessControl' : IDL.Func([], [], ['query']),
    'acceptOffer' : IDL.Func([IDL.Text], [Offer], []),
    'addAdmin' : IDL.Func([IDL.Principal], [], []),
    'addArtworkLayer' : IDL.Func(
        [IDL.Text, IDL.Text, IDL.Nat],
        [ArtworkLayer],
        [],
      ),
    'addFeedingEntry' : IDL.Func(
        [PlantId, IDL.Text, IDL.Text, IDL.Text, IDL.Opt(IDL.Text)],
        [IDL.Bool],
        [],
      ),
    'addFeedingRecord' : IDL.Func([AddFeedingInput], [FeedingPublic], []),
    'addNimsPlantPhoto' : IDL.Func(
        [PlantId, IDL.Text, IDL.Opt(IDL.Text)],
        [IDL.Bool],
        [],
      ),
    'addPestEntry' : IDL.Func(
        [PlantId, IDL.Text, IDL.Text, IDL.Opt(IDL.Text), IDL.Opt(IDL.Text)],
        [IDL.Bool],
        [],
      ),
    'addPlant' : IDL.Func(
        [
          IDL.Nat,
          PlantStage,
          IDL.Opt(TrayId),
          IDL.Opt(IDL.Nat),
          IDL.Opt(IDL.Nat),
        ],
        [AddPlantResult],
        [],
      ),
    'addPlantBatch' : IDL.Func(
        [IDL.Nat, PlantStage, IDL.Nat, IDL.Opt(TrayId)],
        [IDL.Vec(AddPlantResult)],
        [],
      ),
    'addPlantNote' : IDL.Func([PlantId, IDL.Text], [IDL.Bool], []),
    'addPlantPhoto' : IDL.Func([PlantId, IDL.Text], [], []),
    'addVariety' : IDL.Func(
        [
          IDL.Text,
          IDL.Text,
          IDL.Nat,
          IDL.Nat,
          IDL.Text,
          IDL.Opt(IDL.Text),
          IDL.Opt(IDL.Nat),
          IDL.Opt(IDL.Nat),
        ],
        [IDL.Nat],
        [],
      ),
    'addWateringEntry' : IDL.Func(
        [PlantId, IDL.Nat, IDL.Opt(IDL.Float64), IDL.Opt(IDL.Text)],
        [IDL.Bool],
        [],
      ),
    'addWeatherRecord' : IDL.Func([AddWeatherRecordInput], [WeatherRecord], []),
    'addWeatherSnapshot' : IDL.Func([PlantId, WeatherSnapshot], [IDL.Bool], []),
    'addZonePhoto' : IDL.Func([TrayId, IDL.Text], [], []),
    'adminSubmitToDAB' : IDL.Func(
        [IDL.Text, IDL.Text, IDL.Text, IDL.Opt(IDL.Text)],
        [IDL.Variant({ 'ok' : IDL.Text, 'err' : IDL.Text })],
        [],
      ),
    'adminTransferFromPool' : IDL.Func(
        [IDL.Nat, Account],
        [TransferResult],
        [],
      ),
    'adminUnstickOrder' : IDL.Func(
        [IDL.Nat],
        [IDL.Record({ 'message' : IDL.Text, 'success' : IDL.Bool })],
        [],
      ),
    'adminWithdrawTokens' : IDL.Func(
        [IDL.Text, IDL.Principal, IDL.Nat],
        [IDL.Record({
          'blockIndex' : IDL.Opt(IDL.Nat),
          'message' : IDL.Text,
          'success' : IDL.Bool,
        })],
        [],
      ),
    'adminUnstickPepperHead' : IDL.Func(
        [IDL.Nat],
        [IDL.Record({ 'message' : IDL.Text, 'success' : IDL.Bool })],
        [],
      ),
    'airdropNFT' : IDL.Func([IDL.Text, IDL.Principal], [], []),
    'assignCallerUserRole' : IDL.Func([IDL.Principal, UserRole], [], []),
    'assignPoolNFT' : IDL.Func([IDL.Nat, AssignAction], [], []),
    'batchAirdropFromPool' : IDL.Func(
        [IDL.Vec(AirdropAssignment)],
        [IDL.Record({ 'failed' : IDL.Nat, 'succeeded' : IDL.Nat })],
        [],
      ),
    'batchAssignPoolNFTs' : IDL.Func(
        [IDL.Vec(IDL.Nat), AssignAction],
        [IDL.Nat],
        [],
      ),
    'batchAssignToQR' : IDL.Func(
        [IDL.Vec(IDL.Nat)],
        [IDL.Vec(QRAssignmentResult)],
        [],
      ),
    'batchListOnShop' : IDL.Func(
        [IDL.Vec(ShopAssignment)],
        [IDL.Record({ 'failed' : IDL.Nat, 'succeeded' : IDL.Nat })],
        [],
      ),
    'batchMintFoundersCollection' : IDL.Func(
        [IDL.Vec(FoundersMintInput)],
        [IDL.Vec(FoundersMintResult)],
        [],
      ),
    'beginArtworkUpload' : IDL.Func([IDL.Nat], [], []),
    'bulkCreateProducts' : IDL.Func(
        [IDL.Vec(CreateProductInput)],
        [IDL.Vec(BulkCreateResult)],
        [],
      ),
    'buyListedNft' : IDL.Func(
        [IDL.Nat, PaymentToken, IDL.Nat],
        [BuyListedNftResult],
        [],
      ),
    'buyResaleListing' : IDL.Func(
        [IDL.Text],
        [IDL.Variant({ 'ok' : IDL.Null, 'err' : IDL.Text })],
        [],
      ),
    'cancelOffer' : IDL.Func([IDL.Text], [Offer], []),
    'cancelResaleListing' : IDL.Func(
        [IDL.Text],
        [IDL.Variant({ 'ok' : IDL.Null, 'err' : IDL.Text })],
        [],
      ),
    'clearArtworkFiles' : IDL.Func([], [], []),
    'confirmICPayPayment' : IDL.Func(
        [IDL.Nat, IDL.Text],
        [IDL.Record({ 'message' : IDL.Text, 'success' : IDL.Bool })],
        [],
      ),
    'confirmOrderPaymentDirect' : IDL.Func(
        [IDL.Nat, IDL.Text, IDL.Nat],
        [IDL.Record({
          'claim_tokens' : IDL.Vec(IDL.Text),
          'message' : IDL.Text,
          'nft_token_ids' : IDL.Vec(IDL.Nat),
          'success' : IDL.Bool,
        })],
        [],
      ),
    'counterOffer' : IDL.Func([CounterOfferInput], [Offer], []),
    'createBatchGiftPack' : IDL.Func(
        [IDL.Vec(PlantId)],
        [IDL.Variant({ 'ok' : BatchGiftPackPublic, 'err' : IDL.Text })],
        [],
      ),
    'createComment' : IDL.Func([CreateCommentInput], [CommentPublic], []),
    'createDAOProposal' : IDL.Func([CreateProposalInput], [ProposalPublic], []),
    'createNimsTray' : IDL.Func(
        [IDL.Text, Timestamp, IDL.Opt(IDL.Nat)],
        [TrayId],
        [],
      ),
    'createOrder' : IDL.Func(
        [IDL.Principal, CreateOrderInput],
        [OrderPublic],
        [],
      ),
    'createPlant' : IDL.Func([CreatePlantInput], [PlantPublic], []),
    'createPost' : IDL.Func([CreatePostInput], [PostPublic], []),
    'createProduct' : IDL.Func([CreateProductInput], [ProductPublic], []),
    'createRecipe' : IDL.Func([CreateRecipeInput], [Recipe], []),
    'createTray' : IDL.Func([CreateTrayInput], [TrayPublic], []),
    'dabTransform' : IDL.Func(
        [
          IDL.Record({
            'context' : IDL.Vec(IDL.Nat8),
            'response' : http_request_result,
          }),
        ],
        [http_request_result],
        ['query'],
      ),
    'deletePost' : IDL.Func([PostId], [], []),
    'deleteProduct' : IDL.Func([ProductId], [], []),
    'deleteRecipe' : IDL.Func([RecipeId], [IDL.Bool], []),
    'deleteTray' : IDL.Func([TrayId], [], []),
    'delistNft' : IDL.Func([IDL.Nat], [IDL.Bool], []),
    'delistPlant' : IDL.Func([PlantId], [IDL.Bool], []),
    'editPost' : IDL.Func([PostId, IDL.Text], [PostPublic], []),
    'ensureAdminProfile' : IDL.Func([], [], []),
    'ensureCallerProfile' : IDL.Func([], [], []),
    'finalizeArtworkUpload' : IDL.Func([], [UploadResult], []),
    'followUser' : IDL.Func([IDL.Principal], [], []),
    'generateAllPoolNFTs' : IDL.Func([], [IDL.Nat], []),
    'generateClaimToken' : IDL.Func([IDL.Nat], [IDL.Text], []),
    'generateClaimTokens' : IDL.Func(
        [IDL.Vec(IDL.Nat)],
        [IDL.Vec(IDL.Record({ 'tokenId' : IDL.Nat, 'claimToken' : IDL.Text }))],
        [],
      ),
    'generatePickupQRPayload' : IDL.Func([PlantId], [IDL.Text], ['query']),
    'getActiveResaleListings' : IDL.Func(
        [],
        [IDL.Vec(ResaleListingPublic)],
        ['query'],
      ),
    'getAdminInventory' : IDL.Func(
        [IDL.Opt(PlantStage), IDL.Opt(IDL.Nat), IDL.Opt(IDL.Bool)],
        [IDL.Vec(PlantLifecycle)],
        ['query'],
      ),
    'getAdmins' : IDL.Func([], [IDL.Vec(IDL.Principal)], ['query']),
    'getArtworkFile' : IDL.Func([IDL.Text], [IDL.Opt(IDL.Vec(IDL.Nat8))], []),
    'getArtworkUploadResult' : IDL.Func([], [UploadResult], ['query']),
    'getArtworkUploadStatus' : IDL.Func([], [UploadSessionStatus], ['query']),
    'getAuditLog' : IDL.Func(
        [IDL.Nat, IDL.Nat],
        [IDL.Vec(AuditEntry)],
        ['query'],
      ),
    'getBatchGiftPack' : IDL.Func(
        [ClaimTokenId],
        [IDL.Opt(BatchGiftPackPublic)],
        ['query'],
      ),
    'getCallerDiscount' : IDL.Func([], [CallerDiscount], ['query']),
    'getCallerMembership' : IDL.Func(
        [],
        [IDL.Opt(MembershipNFTPublic)],
        ['query'],
      ),
    'getCallerUserProfile' : IDL.Func(
        [],
        [IDL.Opt(UserProfilePublic)],
        ['query'],
      ),
    'getCallerUserRole' : IDL.Func([], [UserRole], ['query']),
    'getCanisterId' : IDL.Func([], [IDL.Text], ['query']),
    'getCanisterTreasuryBalances' : IDL.Func(
        [],
        [IDL.Vec(IDL.Record({
          'balance' : IDL.Nat,
          'ledgerCanisterId' : IDL.Text,
          'symbol' : IDL.Text,
        }))],
        [],
      ),
    'getClaimInfo' : IDL.Func(
        [IDL.Text],
        [
          IDL.Opt(
            IDL.Record({
              'tokenId' : IDL.Nat,
              'redeemed' : IDL.Bool,
              'photoUrl' : IDL.Opt(IDL.Text),
              'plantId' : IDL.Opt(PlantId),
              'stage' : IDL.Opt(IDL.Text),
              'nftName' : IDL.Text,
              'variety' : IDL.Opt(IDL.Text),
            })
          ),
        ],
        ['query'],
      ),
    'getDAOProposal' : IDL.Func(
        [ProposalId],
        [IDL.Opt(ProposalPublic)],
        ['query'],
      ),
    'getDAOStats' : IDL.Func(
        [],
        [
          IDL.Record({
            'totalVotes' : IDL.Nat,
            'totalProposals' : IDL.Nat,
            'activeProposals' : IDL.Nat,
          }),
        ],
        ['query'],
      ),
    'getFollowersCount' : IDL.Func([IDL.Principal], [IDL.Nat], ['query']),
    'getFollowingCount' : IDL.Func([IDL.Principal], [IDL.Nat], ['query']),
    'getForSalePlants' : IDL.Func([], [IDL.Vec(PlantPublic)], ['query']),
    'getListedNfts' : IDL.Func(
        [IDL.Opt(IDL.Bool)],
        [IDL.Vec(NftListingPublic)],
        ['query'],
      ),
    'getLoadedMetadataCount' : IDL.Func([], [IDL.Nat], ['query']),
    'getMembershipPriceInToken' : IDL.Func([OracleToken], [IDL.Nat], ['query']),
    'getMyNftListings' : IDL.Func([], [IDL.Vec(NftListingPublic)], ['query']),
    'getMyOffers' : IDL.Func([], [IDL.Vec(Offer)], ['query']),
    'getMyPlantsNims' : IDL.Func([], [IDL.Vec(PlantLifecycle)], []),
    'getMyResaleListings' : IDL.Func(
        [],
        [IDL.Vec(ResaleListingPublic)],
        ['query'],
      ),
    'getMySchedules' : IDL.Func([], [IDL.Vec(SavedSchedule)], []),
    'getMyWeatherRecords' : IDL.Func([IDL.Nat], [IDL.Vec(WeatherRecord)], []),
    'getNftPoolStatus' : IDL.Func(
        [],
        [IDL.Record({ 'total' : IDL.Nat, 'available' : IDL.Nat })],
        ['query'],
      ),
    'getOffer' : IDL.Func([IDL.Text], [IDL.Opt(Offer)], ['query']),
    'getOffersForNft' : IDL.Func([IDL.Text], [IDL.Vec(Offer)], ['query']),
    'getOffersReceived' : IDL.Func([], [IDL.Vec(Offer)], ['query']),
    'getOrder' : IDL.Func([OrderId], [IDL.Opt(OrderPublic)], ['query']),
    'getOrderPickupClaimTokens' : IDL.Func(
        [OrderId],
        [IDL.Vec(IDL.Text)],
        ['query'],
      ),
    'getPlant' : IDL.Func([PlantId], [IDL.Opt(PlantPublic)], ['query']),
    'getPlantByNft' : IDL.Func([IDL.Nat], [IDL.Opt(PlantLifecycle)], ['query']),
    'getPlantClaimToken' : IDL.Func([PlantId], [IDL.Opt(IDL.Text)], ['query']),
    'getPlantCount' : IDL.Func([], [PlantCountStats], ['query']),
    'getPlantLifecycle' : IDL.Func(
        [PlantId],
        [IDL.Opt(PlantLifecycle)],
        ['query'],
      ),
    'getPlantTimeline' : IDL.Func(
        [PlantId],
        [IDL.Opt(PlantTimeline)],
        ['query'],
      ),
    'getPlantsForSale' : IDL.Func(
        [IDL.Opt(PlantStage), IDL.Opt(IDL.Nat)],
        [IDL.Vec(PlantLifecycle)],
        ['query'],
      ),
    'getPoolDashboard' : IDL.Func([], [PoolDashboard], []),
    'getPoolNFT' : IDL.Func([IDL.Nat], [IDL.Opt(PoolNFTPublic)], ['query']),
    'getPoolNFTs' : IDL.Func(
        [IDL.Opt(PoolNFTStatus__1), IDL.Nat, IDL.Nat],
        [IDL.Vec(PoolNFTPublic__1)],
        ['query'],
      ),
    'getPoolStats' : IDL.Func([], [PoolStats], ['query']),
    'getProduct' : IDL.Func([ProductId], [IDL.Opt(ProductPublic)], ['query']),
    'getPublicProfile' : IDL.Func(
        [IDL.Principal],
        [IDL.Opt(UserProfilePublic)],
        ['query'],
      ),
    'getRecipe' : IDL.Func([RecipeId], [IDL.Opt(Recipe)], ['query']),
    'getScheduleByShareToken' : IDL.Func(
        [IDL.Text],
        [IDL.Opt(SavedSchedule)],
        ['query'],
      ),
    'getScheduleData' : IDL.Func(
        [IDL.Text, IDL.Vec(IDL.Text)],
        [IDL.Vec(ScheduleEntry)],
        ['query'],
      ),
    'getShopListingFile' : IDL.Func(
        [IDL.Text],
        [IDL.Opt(ShopListingFile)],
        ['query'],
      ),
    'getTokenPriceInIcp' : IDL.Func([OracleToken], [IDL.Nat], ['query']),
    'getTokenPrices' : IDL.Func([], [IDL.Vec(TokenPrice)], ['query']),
    'getTray' : IDL.Func([TrayId], [IDL.Opt(TrayPublic)], ['query']),
    'getTreasuryBalance' : IDL.Func([TreasuryToken], [IDL.Nat], ['query']),
    'getTreasuryBalances' : IDL.Func([], [IDL.Vec(TreasuryBalance)], ['query']),
    'getTreasuryLedger' : IDL.Func(
        [],
        [IDL.Vec(TreasuryTransaction)],
        ['query'],
      ),
    'getUpgradeHistory' : IDL.Func(
        [PlantId],
        [IDL.Vec(LifecycleUpgradeEvent)],
        ['query'],
      ),
    'getUserPosts' : IDL.Func(
        [IDL.Principal],
        [IDL.Vec(PostPublic)],
        ['query'],
      ),
    'getVariety' : IDL.Func([IDL.Nat], [IDL.Opt(VarietyPublic)], ['query']),
    'hasDAOAccess' : IDL.Func([], [IDL.Bool], ['query']),
    'hasMembership' : IDL.Func([], [IDL.Bool], ['query']),
    'icpayTransform' : IDL.Func(
        [
          IDL.Record({
            'context' : IDL.Vec(IDL.Nat8),
            'response' : http_request_result,
          }),
        ],
        [http_request_result],
        ['query'],
      ),
    'icrc10_supported_standards' : IDL.Func(
        [],
        [IDL.Vec(IDL.Record({ 'url' : IDL.Text, 'name' : IDL.Text }))],
        ['query'],
      ),
    'icrc28_trusted_origins' : IDL.Func(
        [],
        [IDL.Record({ 'trusted_origins' : IDL.Vec(IDL.Text) })],
        ['query'],
      ),
    'icrc37_approve_tokens' : IDL.Func(
        [IDL.Vec(ApproveTokenArg)],
        [IDL.Vec(IDL.Opt(ApproveTokenResult))],
        [],
      ),
    'icrc37_get_token_approvals' : IDL.Func(
        [IDL.Nat, IDL.Opt(TokenApproval), IDL.Opt(IDL.Nat)],
        [IDL.Vec(TokenApproval)],
        ['query'],
      ),
    'icrc37_is_approved' : IDL.Func(
        [IDL.Vec(IsApprovedArg)],
        [IDL.Vec(IDL.Bool)],
        ['query'],
      ),
    'icrc37_max_approvals_per_token_or_collection' : IDL.Func(
        [],
        [IDL.Opt(IDL.Nat)],
        ['query'],
      ),
    'icrc37_max_revoke_approvals' : IDL.Func([], [IDL.Opt(IDL.Nat)], ['query']),
    'icrc37_revoke_token_approvals' : IDL.Func(
        [IDL.Vec(RevokeTokenApprovalArg)],
        [IDL.Vec(IDL.Opt(RevokeTokenApprovalResult))],
        [],
      ),
    'icrc37_transfer_from' : IDL.Func(
        [IDL.Vec(TransferFromArg)],
        [IDL.Vec(IDL.Opt(TransferFromResult))],
        [],
      ),
    'icrc7_atomic_batch_transfers' : IDL.Func(
        [],
        [IDL.Opt(IDL.Bool)],
        ['query'],
      ),
    'icrc7_balance_of' : IDL.Func(
        [IDL.Vec(Account)],
        [IDL.Vec(IDL.Nat)],
        ['query'],
      ),
    'icrc7_collection_metadata' : IDL.Func(
        [],
        [IDL.Vec(IDL.Tuple(IDL.Text, Value))],
        ['query'],
      ),
    'icrc7_default_take_value' : IDL.Func([], [IDL.Opt(IDL.Nat)], ['query']),
    'icrc7_description' : IDL.Func([], [IDL.Opt(IDL.Text)], ['query']),
    'icrc7_logo' : IDL.Func([], [IDL.Opt(IDL.Text)], ['query']),
    'icrc7_max_memo_size' : IDL.Func([], [IDL.Opt(IDL.Nat)], ['query']),
    'icrc7_max_query_batch_size' : IDL.Func([], [IDL.Opt(IDL.Nat)], ['query']),
    'icrc7_max_take_value' : IDL.Func([], [IDL.Opt(IDL.Nat)], ['query']),
    'icrc7_max_update_batch_size' : IDL.Func([], [IDL.Opt(IDL.Nat)], ['query']),
    'icrc7_name' : IDL.Func([], [IDL.Text], ['query']),
    'icrc7_owner_of' : IDL.Func(
        [IDL.Vec(IDL.Nat)],
        [IDL.Vec(IDL.Opt(Account))],
        ['query'],
      ),
    'icrc7_permitted_drift' : IDL.Func([], [IDL.Opt(IDL.Nat)], ['query']),
    'icrc7_supply_cap' : IDL.Func([], [IDL.Opt(IDL.Nat)], ['query']),
    'icrc7_symbol' : IDL.Func([], [IDL.Text], ['query']),
    'icrc7_token_metadata' : IDL.Func(
        [IDL.Vec(IDL.Nat)],
        [IDL.Vec(IDL.Opt(IDL.Vec(IDL.Tuple(IDL.Text, Value))))],
        ['query'],
      ),
    'icrc7_token_metadata_certified' : IDL.Func(
        [IDL.Nat],
        [
          IDL.Record({
            'certificate' : IDL.Opt(IDL.Vec(IDL.Nat8)),
            'value' : IDL.Opt(IDL.Vec(IDL.Nat8)),
            'witness' : IDL.Vec(IDL.Nat8),
          }),
        ],
        ['query'],
      ),
    'icrc7_tokens' : IDL.Func(
        [IDL.Opt(IDL.Nat), IDL.Opt(IDL.Nat)],
        [IDL.Vec(IDL.Nat)],
        ['query'],
      ),
    'icrc7_tokens_of' : IDL.Func(
        [Account, IDL.Opt(IDL.Nat), IDL.Opt(IDL.Nat)],
        [IDL.Vec(IDL.Nat)],
        ['query'],
      ),
    'icrc7_total_supply' : IDL.Func([], [IDL.Nat], ['query']),
    'icrc7_transfer' : IDL.Func(
        [IDL.Vec(TransferArgs)],
        [IDL.Vec(IDL.Opt(TransferResult))],
        [],
      ),
    'icrc7_tx_window' : IDL.Func([], [IDL.Opt(IDL.Nat)], ['query']),
    'initializeNFTPool' : IDL.Func(
        [],
        [IDL.Record({ 'skipped' : IDL.Nat, 'initialized' : IDL.Nat })],
        [],
      ),
    'isCallerAdmin' : IDL.Func([], [IDL.Bool], ['query']),
    'isPepperHead' : IDL.Func([IDL.Nat], [IDL.Bool], ['query']),
    'isPepperHeadAvailable' : IDL.Func([], [IDL.Nat], ['query']),
    'issueMembership' : IDL.Func(
        [
          IDL.Principal,
          MembershipTier,
          IDL.Variant({
            'EXT' : IDL.Null,
            'Hedera' : IDL.Null,
            'ICRC37' : IDL.Null,
          }),
        ],
        [MembershipNFTPublic],
        [],
      ),
    'likePost' : IDL.Func([PostId], [IDL.Nat], []),
    'listArtworkFiles' : IDL.Func(
        [],
        [IDL.Vec(IDL.Tuple(IDL.Text, IDL.Nat))],
        ['query'],
      ),
    'listArtworkLayers' : IDL.Func([], [IDL.Vec(ArtworkLayer)], []),
    'listCommentsByPost' : IDL.Func(
        [PostId],
        [IDL.Vec(CommentPublic)],
        ['query'],
      ),
    'listDAOProposals' : IDL.Func([], [IDL.Vec(ProposalPublic)], ['query']),
    'listMyPlants' : IDL.Func([], [IDL.Vec(PlantPublic)], []),
    'listNFTForResale' : IDL.Func(
        [PlantId, IDL.Float64],
        [IDL.Variant({ 'ok' : ResaleListingPublic, 'err' : IDL.Text })],
        [],
      ),
    'listNftForSale' : IDL.Func([IDL.Nat, IDL.Nat], [IDL.Bool], []),
    'listOrdersByBuyer' : IDL.Func([], [IDL.Vec(OrderPublic)], ['query']),
    'listPlantForSale' : IDL.Func([PlantId, IDL.Opt(IDL.Nat)], [IDL.Bool], []),
    'listPlants' : IDL.Func([], [IDL.Vec(PlantPublic)], ['query']),
    'listPlantsByStage' : IDL.Func(
        [PlantStage],
        [IDL.Vec(PlantPublic)],
        ['query'],
      ),
    'listPoolNFTs' : IDL.Func(
        [IDL.Opt(PoolNFTStatus), IDL.Nat],
        [IDL.Vec(PoolNFTPublic)],
        [],
      ),
    'listPosts' : IDL.Func([], [IDL.Vec(PostPublic)], ['query']),
    'listProducts' : IDL.Func([], [IDL.Vec(ProductPublic)], ['query']),
    'listProductsByCategory' : IDL.Func(
        [ProductCategory],
        [IDL.Vec(ProductPublic)],
        ['query'],
      ),
    'listRecipes' : IDL.Func([], [IDL.Vec(Recipe)], ['query']),
    'listTrays' : IDL.Func([], [IDL.Vec(TrayPublic)], ['query']),
    'listVarieties' : IDL.Func([], [IDL.Vec(VarietyPublic)], ['query']),
    'loadStaticMetadata' : IDL.Func(
        [IDL.Vec(IDL.Tuple(IDL.Nat, IDL.Vec(IDL.Nat8)))],
        [LoadStaticMetadataResult],
        [],
      ),
    'markCellGerminated' : IDL.Func(
        [TrayId, IDL.Nat, IDL.Opt(Timestamp)],
        [AddPlantResult],
        [],
      ),
    'markPlantGerminated' : IDL.Func([PlantId, Timestamp], [], []),
    'mintEXT' : IDL.Func(
        [IDL.Nat, IDL.Text, IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text))],
        [IDL.Text],
        [],
      ),
    'mintHederaNFT' : IDL.Func(
        [PlantId, IDL.Opt(IDL.Text), IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text))],
        [IDL.Text],
        [],
      ),
    'mintICRC37' : IDL.Func(
        [PlantId, IDL.Opt(IDL.Text), IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text))],
        [IDL.Text],
        [],
      ),
    'mintRWAProvenance' : IDL.Func([MintRWAProvenanceInput], [IDL.Text], []),
    'placeOrder' : IDL.Func([CreateOrderInput], [OrderPublic], []),
    'preGenerateNFTPool' : IDL.Func(
        [IDL.Nat, IDL.Vec(IDL.Nat)],
        [IDL.Record({ 'ok' : IDL.Bool, 'total' : IDL.Nat })],
        [],
      ),
    'priceOracleTransform' : IDL.Func(
        [
          IDL.Record({
            'context' : IDL.Vec(IDL.Nat8),
            'response' : http_request_result,
          }),
        ],
        [http_request_result],
        ['query'],
      ),
    'purchasePepperHead' : IDL.Func(
        [IDL.Text],
        [
          IDL.Record({
            'tokenId' : IDL.Opt(IDL.Nat),
            'message' : IDL.Text,
            'success' : IDL.Bool,
          }),
        ],
        [],
      ),
    'purchasePlant' : IDL.Func(
        [PlantId, PaymentToken, IDL.Nat],
        [PurchasePlantResult],
        [],
      ),
    'purchasePlantICPay' : IDL.Func(
        [PlantId, IDL.Text],
        [PurchasePlantResult],
        [],
      ),
    'redeemBatchClaim' : IDL.Func(
        [ClaimTokenId],
        [IDL.Variant({ 'ok' : BatchGiftPackPublic, 'err' : IDL.Text })],
        [],
      ),
    'redeemClaim' : IDL.Func(
        [IDL.Text],
        [
          IDL.Record({
            'tokenId' : IDL.Opt(IDL.Nat),
            'message' : IDL.Text,
            'success' : IDL.Bool,
          }),
        ],
        [],
      ),
    'refreshTokenPrices' : IDL.Func([], [IDL.Bool], []),
    'rejectOffer' : IDL.Func([IDL.Text], [Offer], []),
    'removeAdmin' : IDL.Func([IDL.Principal], [], []),
    'removePlant' : IDL.Func([PlantId], [IDL.Bool], []),
    'removePlantPhoto' : IDL.Func([PlantId, IDL.Text], [], []),
    'removeVariety' : IDL.Func([IDL.Nat], [IDL.Bool], []),
    'removeZonePhoto' : IDL.Func([TrayId, IDL.Text], [], []),
    'resetOrphanPoolNFT' : IDL.Func([IDL.Nat], [IDL.Bool], []),
    'resetPoolNFT' : IDL.Func(
        [IDL.Nat],
        [IDL.Variant({ 'ok' : IDL.Text, 'err' : IDL.Text })],
        [],
      ),
    'saveCallerUserProfile' : IDL.Func([SaveProfileInput], [], []),
    'saveSchedule' : IDL.Func([IDL.Text, IDL.Vec(IDL.Text)], [ScheduleId], []),
    'searchVarieties' : IDL.Func(
        [IDL.Text],
        [IDL.Vec(VarietyPublic)],
        ['query'],
      ),
    'seedDefaultRecipes' : IDL.Func([], [], []),
    'setForSale' : IDL.Func([PlantId, IDL.Bool], [], []),
    'setICPaySecretKey' : IDL.Func([IDL.Text], [], []),
    'setPlantNFT' : IDL.Func([PlantId, IDL.Text], [], []),
    'storeArtworkFile' : IDL.Func(
        [IDL.Text, IDL.Vec(IDL.Nat8), IDL.Text],
        [StoredFile],
        [],
      ),
    'submitOffer' : IDL.Func([SubmitOfferInput], [Offer], []),
    'toggleCooked' : IDL.Func([PlantId], [], []),
    'toggleRecipeFeatured' : IDL.Func([RecipeId], [IDL.Opt(Recipe)], []),
    'transplantCell' : IDL.Func([TransplantInput], [PlantPublic], []),
    'treasuryDeposit' : IDL.Func(
        [TreasuryToken, IDL.Nat, IDL.Opt(IDL.Text)],
        [TreasuryTransaction],
        [],
      ),
    'treasuryTransfer' : IDL.Func(
        [
          TreasuryToken,
          IDL.Nat,
          IDL.Principal,
          IDL.Principal,
          IDL.Opt(IDL.Text),
        ],
        [TreasuryTransaction],
        [],
      ),
    'treasuryWithdraw' : IDL.Func(
        [TreasuryToken, IDL.Nat, IDL.Principal, IDL.Opt(IDL.Text)],
        [TreasuryTransaction],
        [],
      ),
    'triggerLifecycleUpgrade' : IDL.Func([PlantId, IDL.Text], [IDL.Text], []),
    'unfollowUser' : IDL.Func([IDL.Principal], [], []),
    'unlikePost' : IDL.Func([PostId], [IDL.Nat], []),
    'updateCellData' : IDL.Func([UpdateCellDataInput], [], []),
    'updateNimsPlantStage' : IDL.Func([PlantId, PlantStage], [IDL.Bool], []),
    'updateOrderStatus' : IDL.Func([OrderId, OrderStatus], [], []),
    'updatePlantMetadata' : IDL.Func([UpdatePlantMetadataInput], [], []),
    'updatePlantPrice' : IDL.Func([PlantId, IDL.Nat], [IDL.Bool], []),
    'updatePlantStage' : IDL.Func([PlantId, PlantStage, IDL.Text], [], []),
    'updateProduct' : IDL.Func([UpdateProductInput], [], []),
    'updateRecipe' : IDL.Func([UpdateRecipeInput], [IDL.Opt(Recipe)], []),
    'updateTrayName' : IDL.Func([TrayId, IDL.Text], [], []),
    'updateTrayOrder' : IDL.Func([TrayId, IDL.Nat], [], []),
    'updateVariety' : IDL.Func(
        [
          IDL.Nat,
          IDL.Opt(IDL.Text),
          IDL.Opt(IDL.Text),
          IDL.Opt(IDL.Nat),
          IDL.Opt(IDL.Nat),
          IDL.Opt(IDL.Text),
          IDL.Opt(IDL.Text),
          IDL.Opt(IDL.Nat),
          IDL.Opt(IDL.Nat),
        ],
        [IDL.Bool],
        [],
      ),
    'updateZoneNotes' : IDL.Func([TrayId, IDL.Text], [], []),
    'uploadArtworkChunk' : IDL.Func(
        [IDL.Nat, IDL.Nat, IDL.Vec(IDL.Nat8)],
        [IDL.Variant({ 'ok' : IDL.Null, 'err' : IDL.Text })],
        [],
      ),
    'voteOnProposal' : IDL.Func([ProposalId, IDL.Nat], [], []),
  });
  return ICSpicy;
};
export const init = ({ IDL }) => { return []; };
