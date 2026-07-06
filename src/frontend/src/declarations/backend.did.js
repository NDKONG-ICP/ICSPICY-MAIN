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
  const PostId = IDL.Nat;
  const CommentId = IDL.Nat;
  const CommentPublic = IDL.Record({
    'id' : CommentId,
    'post_id' : PostId,
    'content' : IDL.Text,
    'author_text' : IDL.Text,
    'like_count' : IDL.Nat,
    'created_at' : Timestamp,
    'author' : IDL.Principal,
    'author_username' : IDL.Opt(IDL.Text),
    'is_anonymous' : IDL.Bool,
    'caller_liked' : IDL.Bool,
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
  const AddPlantResult = IDL.Record({
    'claimToken' : IDL.Text,
    'nftTokenId' : IDL.Nat,
    'plantId' : PlantId,
  });
  const PlantSeedResult = IDL.Record({ 'plantId' : PlantId });
  const SeedSource = IDL.Variant({
    'Gift' : IDL.Null,
    'OwnHarvest' : IDL.Null,
    'Trade' : IDL.Null,
    'Vendor' : IDL.Null,
    'Cross' : IDL.Null,
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
  const AdminUserRow = IDL.Record({
    'username' : IDL.Text,
    'avatar_key' : IDL.Opt(IDL.Text),
    'raven_tier' : IDL.Text,
    'created_at' : IDL.Int,
    'last_active' : IDL.Opt(IDL.Int),
    'nft_count' : IDL.Nat,
    'follower_count' : IDL.Nat,
    'principal_id' : IDL.Principal,
    'location' : IDL.Opt(IDL.Text),
  });
  const AdminUserPage = IDL.Record({
    'total' : IDL.Nat,
    'rows' : IDL.Vec(AdminUserRow),
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
  const Subaccount = IDL.Vec(IDL.Nat8);
  const Account = IDL.Record({
    'owner' : IDL.Principal,
    'subaccount' : IDL.Opt(Subaccount),
  });
  const AdminWithdrawTokensResult = IDL.Record({
    'blockIndex' : IDL.Opt(IDL.Nat),
    'message' : IDL.Text,
    'success' : IDL.Bool,
  });
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
    'inventory_quantity' : IDL.Opt(IDL.Nat),
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
    'inventory_remaining' : IDL.Opt(IDL.Nat),
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
    'RAVEN' : IDL.Null,
    'ckUSDC' : IDL.Null,
    'ckUSDT' : IDL.Null,
  });
  const BuyListedNftResult = IDL.Record({
    'message' : IDL.Text,
    'success' : IDL.Bool,
  });
  const YieldEstimate = IDL.Record({
    'estimatedLbsMax' : IDL.Float64,
    'estimatedLbsMin' : IDL.Float64,
    'spacingPenaltyPct' : IDL.Float64,
    'companionBonusPct' : IDL.Float64,
    'notes' : IDL.Text,
    'totalPlantCount' : IDL.Nat,
  });
  const StructurePlacement = IDL.Record({
    'x' : IDL.Float64,
    'y' : IDL.Float64,
    'id' : IDL.Nat,
    'rotation' : IDL.Float64,
    'color' : IDL.Text,
    'width' : IDL.Float64,
    'depth' : IDL.Float64,
    'structureType' : IDL.Text,
  });
  const PlantPlacement = IDL.Record({
    'x' : IDL.Float64,
    'y' : IDL.Float64,
    'id' : IDL.Nat,
    'rotation' : IDL.Float64,
    'plantLabel' : IDL.Text,
    'icon' : IDL.Text,
    'color' : IDL.Text,
    'scale' : IDL.Float64,
    'varietyId' : IDL.Opt(IDL.Nat),
  });
  const GardenDesignInput = IDL.Record({
    'structures' : IDL.Vec(StructurePlacement),
    'plants' : IDL.Vec(PlantPlacement),
    'widthMeters' : IDL.Float64,
    'name' : IDL.Text,
    'description' : IDL.Opt(IDL.Text),
    'gridSizeMeters' : IDL.Float64,
    'depthMeters' : IDL.Float64,
    'isPublic' : IDL.Bool,
  });
  const ProposalId = IDL.Nat;
  const PlantingEventType = IDL.Variant({
    'directSow' : IDL.Null,
    'startIndoors' : IDL.Null,
    'harvest' : IDL.Null,
    'transplantOutdoors' : IDL.Null,
  });
  const PlantingEvent = IDL.Record({
    'id' : IDL.Nat,
    'owner' : IDL.Principal,
    'name' : IDL.Text,
    'completed' : IDL.Bool,
    'created_at' : Timestamp,
    'emoji' : IDL.Text,
    'notes' : IDL.Text,
    'scheduled_at' : Timestamp,
    'completed_at' : IDL.Opt(Timestamp),
    'event_type' : PlantingEventType,
  });
  const ConfirmOrderPaymentDirectResult = IDL.Record({
    'claim_tokens' : IDL.Vec(IDL.Text),
    'message' : IDL.Text,
    'nft_token_ids' : IDL.Vec(IDL.Nat),
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
  const CreateCommentInput = IDL.Record({
    'post_id' : PostId,
    'content' : IDL.Text,
    'anonymous' : IDL.Bool,
  });
  const ProposalCategory = IDL.Variant({
    'VarietyVote' : IDL.Null,
    'ProductVote' : IDL.Null,
    'FeatureRequest' : IDL.Null,
    'CommunityDecision' : IDL.Null,
    'TreasurySpend' : IDL.Null,
    'GrowerProposal' : IDL.Null,
  });
  const ProposalOptionInput = IDL.Record({
    'description' : IDL.Opt(IDL.Text),
    'option_label' : IDL.Text,
  });
  const CreateProposalInput = IDL.Record({
    'title' : IDL.Text,
    'publish_now' : IDL.Bool,
    'description' : IDL.Text,
    'voting_ends_at' : Timestamp,
    'category' : ProposalCategory,
    'voting_starts_at' : Timestamp,
    'options' : IDL.Vec(ProposalOptionInput),
  });
  const ProposalStatus = IDL.Variant({
    'Closed' : IDL.Null,
    'Active' : IDL.Null,
    'Draft' : IDL.Null,
    'Cancelled' : IDL.Null,
  });
  const ProposalOptionPublic = IDL.Record({
    'id' : IDL.Nat,
    'description' : IDL.Opt(IDL.Text),
    'option_label' : IDL.Text,
    'vote_count' : IDL.Nat,
  });
  const ProposalPublic = IDL.Record({
    'id' : ProposalId,
    'status' : ProposalStatus,
    'title' : IDL.Text,
    'updated_at' : Timestamp,
    'creator' : IDL.Principal,
    'description' : IDL.Text,
    'created_at' : Timestamp,
    'voting_ends_at' : Timestamp,
    'category' : ProposalCategory,
    'total_votes' : IDL.Nat,
    'voting_starts_at' : Timestamp,
    'caller_vote' : IDL.Opt(IDL.Nat),
    'options' : IDL.Vec(ProposalOptionPublic),
  });
  const CreateGardenDesignResult = IDL.Record({ 'designId' : IDL.Nat });
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
  const CreatePlantingEventInput = IDL.Record({
    'name' : IDL.Text,
    'emoji' : IDL.Text,
    'notes' : IDL.Text,
    'scheduled_at' : Timestamp,
    'event_type' : PlantingEventType,
  });
  const CreatePostInput = IDL.Record({
    'content' : IDL.Text,
    'nft_token_id' : IDL.Opt(IDL.Nat),
    'image_key' : IDL.Opt(IDL.Text),
    'image_keys' : IDL.Vec(IDL.Text),
    'anonymous' : IDL.Bool,
    'plant_id' : IDL.Opt(IDL.Nat),
  });
  const PostPublic = IDL.Record({
    'id' : PostId,
    'updated_at' : Timestamp,
    'content' : IDL.Text,
    'author_text' : IDL.Text,
    'comment_count' : IDL.Nat,
    'nft_token_id' : IDL.Opt(IDL.Nat),
    'image_key' : IDL.Opt(IDL.Text),
    'like_count' : IDL.Nat,
    'created_at' : Timestamp,
    'author_principal' : IDL.Opt(IDL.Principal),
    'image_keys' : IDL.Vec(IDL.Text),
    'tip_count' : IDL.Nat,
    'author_username' : IDL.Opt(IDL.Text),
    'is_anonymous' : IDL.Bool,
    'caller_liked' : IDL.Bool,
    'plant_id' : IDL.Opt(IDL.Nat),
  });
  const Difficulty = IDL.Variant({
    'Beginner' : IDL.Null,
    'Advanced' : IDL.Null,
    'Intermediate' : IDL.Null,
  });
  const RecipeStep = IDL.Record({
    'duration' : IDL.Opt(IDL.Text),
    'image_key' : IDL.Opt(IDL.Text),
    'tips' : IDL.Opt(IDL.Text),
    'step_number' : IDL.Nat,
    'instruction' : IDL.Text,
  });
  const RecipeCategory = IDL.Variant({
    'KNF' : IDL.Null,
    'Composting' : IDL.Null,
    'SoilAmendment' : IDL.Null,
    'FermentedInputs' : IDL.Null,
    'PestControl' : IDL.Null,
    'PlantExtracts' : IDL.Null,
    'MicrobialCultures' : IDL.Null,
    'JADAM' : IDL.Null,
    'Other' : IDL.Null,
  });
  const Ingredient = IDL.Record({
    'name' : IDL.Text,
    'notes' : IDL.Opt(IDL.Text),
    'is_optional' : IDL.Bool,
    'amount' : IDL.Text,
  });
  const CreateRecipeInput = IDL.Record({
    'title' : IDL.Text,
    'fermentation_time' : IDL.Opt(IDL.Text),
    'image_key' : IDL.Opt(IDL.Text),
    'difficulty' : Difficulty,
    'slug' : IDL.Text,
    'tags' : IDL.Vec(IDL.Text),
    'tips' : IDL.Vec(IDL.Text),
    'best_for' : IDL.Vec(IDL.Text),
    'description' : IDL.Text,
    'safety_notes' : IDL.Vec(IDL.Text),
    'total_time' : IDL.Opt(IDL.Text),
    'is_published' : IDL.Bool,
    'steps' : IDL.Vec(RecipeStep),
    'application_frequency' : IDL.Opt(IDL.Text),
    'category' : RecipeCategory,
    'display_order' : IDL.Nat,
    'related_recipe_ids' : IDL.Vec(IDL.Nat),
    'ingredients' : IDL.Vec(Ingredient),
    'prep_time' : IDL.Opt(IDL.Text),
    'application_rate' : IDL.Opt(IDL.Text),
  });
  const RecipeId = IDL.Nat;
  const CreateTrayInput = IDL.Record({
    'name' : IDL.Text,
    'planting_date' : Timestamp,
    'nft_standard' : NFTStandard,
  });
  const TrayPublic = IDL.Record({
    'id' : TrayId,
    'creator' : IDL.Principal,
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
  const FinishVideoUploadResult = IDL.Record({
    'posterKey' : IDL.Opt(IDL.Text),
    'videoKey' : IDL.Text,
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
  const AdminOrderItemPublic = IDL.Record({
    'product_id' : ProductId,
    'price_cents' : IDL.Nat,
    'product_name' : IDL.Text,
    'quantity' : IDL.Nat,
    'plant_id' : IDL.Opt(PlantId),
  });
  const AdminOrderPublic = IDL.Record({
    'id' : OrderId,
    'status' : OrderStatus,
    'is_paid' : IDL.Bool,
    'subtotal_cents' : IDL.Nat,
    'pickup_claim_tokens' : IDL.Vec(IDL.Text),
    'shipping_address' : IDL.Opt(IDL.Text),
    'shipping_cents' : IDL.Nat,
    'shipping' : IDL.Opt(ShippingAddress),
    'created_at' : Timestamp,
    'pickup' : IDL.Bool,
    'line_nft_token_ids' : IDL.Vec(IDL.Nat),
    'buyer' : IDL.Principal,
    'items' : IDL.Vec(AdminOrderItemPublic),
    'total_cents' : IDL.Nat,
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
    'is_admin' : IDL.Bool,
    'avatar_key' : IDL.Opt(IDL.Text),
    'following_count' : IDL.Nat,
    'post_count' : IDL.Nat,
    'created_at' : Timestamp,
    'caller_following' : IDL.Bool,
    'follower_count' : IDL.Nat,
    'principal_id' : IDL.Principal,
    'location' : IDL.Opt(IDL.Text),
  });
  const Health = IDL.Record({
    'heapSize' : IDL.Nat,
    'isHealthy' : IDL.Bool,
    'cyclesBalance' : IDL.Nat,
    'memoryUsed' : IDL.Nat,
  });
  const CanisterTreasuryBalance = IDL.Record({
    'balance' : IDL.Nat,
    'ledgerCanisterId' : IDL.Text,
    'symbol' : IDL.Text,
  });
  const ShopListingFile = IDL.Record({
    'data' : IDL.Vec(IDL.Nat8),
    'mime_type' : IDL.Text,
  });
  const RecipePublic = IDL.Record({
    'id' : RecipeId,
    'title' : IDL.Text,
    'updated_at' : Timestamp,
    'fermentation_time' : IDL.Opt(IDL.Text),
    'image_key' : IDL.Opt(IDL.Text),
    'difficulty' : Difficulty,
    'slug' : IDL.Text,
    'tags' : IDL.Vec(IDL.Text),
    'tips' : IDL.Vec(IDL.Text),
    'best_for' : IDL.Vec(IDL.Text),
    'description' : IDL.Text,
    'safety_notes' : IDL.Vec(IDL.Text),
    'created_at' : Timestamp,
    'author' : IDL.Principal,
    'total_time' : IDL.Opt(IDL.Text),
    'is_published' : IDL.Bool,
    'steps' : IDL.Vec(RecipeStep),
    'application_frequency' : IDL.Opt(IDL.Text),
    'category' : RecipeCategory,
    'display_order' : IDL.Nat,
    'related_recipe_ids' : IDL.Vec(IDL.Nat),
    'caller_favorited' : IDL.Bool,
    'favorite_count' : IDL.Nat,
    'ingredients' : IDL.Vec(Ingredient),
    'prep_time' : IDL.Opt(IDL.Text),
    'application_rate' : IDL.Opt(IDL.Text),
  });
  const FleetEntry = IDL.Record({
    'name' : IDL.Text,
    'isHealthy' : IDL.Bool,
    'cyclesBalance' : IDL.Nat,
    'memorySize' : IDL.Nat,
    'canisterId' : IDL.Text,
  });
  const GardenDesign = IDL.Record({
    'id' : IDL.Nat,
    'structures' : IDL.Vec(StructurePlacement),
    'plants' : IDL.Vec(PlantPlacement),
    'owner' : IDL.Principal,
    'widthMeters' : IDL.Float64,
    'name' : IDL.Text,
    'createdAt' : Timestamp,
    'description' : IDL.Opt(IDL.Text),
    'gridSizeMeters' : IDL.Float64,
    'nftTokenId' : IDL.Opt(IDL.Nat),
    'updatedAt' : Timestamp,
    'depthMeters' : IDL.Float64,
    'isPublic' : IDL.Bool,
  });
  const GrowerProvenanceMeta = IDL.Record({
    'grower' : IDL.Principal,
    'mintedAt' : IDL.Int,
    'plantId' : IDL.Nat,
    'growerName' : IDL.Text,
    'variety' : IDL.Text,
  });
  const Icrc7PoolStats = IDL.Record({
    'total' : IDL.Nat,
    'pepperhead_total' : IDL.Nat,
    'assigned_to_plants' : IDL.Nat,
    'assigned_to_products' : IDL.Nat,
    'pepperhead_sold' : IDL.Nat,
    'in_canister_pool' : IDL.Nat,
    'pepperhead_in_pool' : IDL.Nat,
    'missing_owner' : IDL.Nat,
    'sold_to_customers' : IDL.Nat,
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
  const CoopSeatPublic = IDL.Record({
    'revoked' : IDL.Bool,
    'activatedAt' : IDL.Int,
    'growerLocation' : IDL.Opt(IDL.Text),
    'licenseInfo' : IDL.Opt(IDL.Text),
    'growerName' : IDL.Opt(IDL.Text),
  });
  const CoopStatus = IDL.Record({
    'tokenId' : IDL.Nat,
    'seat' : CoopSeatPublic,
  });
  const BreedingCrossPublic = IDL.Record({
    'id' : IDL.Nat,
    'motherVarietyId' : IDL.Nat,
    'owner' : IDL.Principal,
    'fatherPlantId' : IDL.Opt(PlantId),
    'name' : IDL.Text,
    'createdAt' : Timestamp,
    'generation' : IDL.Text,
    'expectedTraits' : IDL.Opt(IDL.Text),
    'fatherVarietyId' : IDL.Nat,
    'crossDate' : Timestamp,
    'notes' : IDL.Opt(IDL.Text),
    'observedTraits' : IDL.Opt(IDL.Text),
    'motherPlantId' : IDL.Opt(PlantId),
    'seedLotId' : IDL.Opt(IDL.Nat),
    'photos' : IDL.Vec(IDL.Text),
  });
  const NotificationKind = IDL.Variant({
    'tip' : IDL.Null,
    'like' : IDL.Null,
    'orderPlaced' : IDL.Null,
    'comment' : IDL.Null,
    'airdrop' : IDL.Null,
    'follow' : IDL.Null,
    'newUser' : IDL.Null,
  });
  const NotificationPublic = IDL.Record({
    'id' : IDL.Nat,
    'kind' : NotificationKind,
    'read' : IDL.Bool,
    'created_at' : IDL.Int,
    'sender' : IDL.Opt(IDL.Principal),
    'message' : IDL.Text,
    'ref_id' : IDL.Opt(IDL.Text),
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
  const SeedLotPublic = IDL.Record({
    'id' : IDL.Nat,
    'germinationRate' : IDL.Opt(IDL.Nat),
    'acquiredDate' : Timestamp,
    'source' : SeedSource,
    'owner' : IDL.Principal,
    'createdAt' : Timestamp,
    'generation' : IDL.Opt(IDL.Text),
    'isActive' : IDL.Bool,
    'parentPlantId' : IDL.Opt(PlantId),
    'vendorId' : IDL.Opt(IDL.Nat),
    'notes' : IDL.Opt(IDL.Text),
    'quantity' : IDL.Opt(IDL.Nat),
    'varietyId' : IDL.Nat,
    'harvestDate' : IDL.Opt(Timestamp),
    'crossId' : IDL.Opt(IDL.Nat),
  });
  const SeedVendorPublic = IDL.Record({
    'id' : IDL.Nat,
    'owner' : IDL.Principal,
    'name' : IDL.Text,
    'createdAt' : Timestamp,
    'website' : IDL.Opt(IDL.Text),
    'notes' : IDL.Opt(IDL.Text),
  });
  const DashboardStats = IDL.Record({
    'needsAttention' : IDL.Nat,
    'germinatedToday' : IDL.Nat,
    'lastWateredMsAgo' : IDL.Opt(IDL.Nat),
    'totalPlants' : IDL.Nat,
  });
  const PlantCountStats = IDL.Record({
    'total' : IDL.Nat,
    'sold' : IDL.Nat,
    'byStage' : IDL.Vec(IDL.Tuple(PlantStage, IDL.Nat)),
    'forSale' : IDL.Nat,
  });
  const PlantHealth = IDL.Record({
    'daysSinceFeed' : IDL.Opt(IDL.Nat),
    'needsAttention' : IDL.Bool,
    'daysSinceWater' : IDL.Opt(IDL.Nat),
    'healthScore' : IDL.Nat,
    'lastFed' : IDL.Opt(Timestamp),
    'lastWatered' : IDL.Opt(Timestamp),
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
  const PostWithComments = IDL.Record({
    'post' : PostPublic,
    'has_liked' : IDL.Bool,
    'comments' : IDL.Vec(CommentPublic),
  });
  const ProposalResultOption = IDL.Record({
    'option_label' : IDL.Text,
    'vote_count' : IDL.Nat,
    'percentage' : IDL.Nat,
  });
  const ProposalResults = IDL.Record({
    'winner' : IDL.Opt(IDL.Text),
    'total_votes' : IDL.Nat,
    'options' : IDL.Vec(ProposalResultOption),
  });
  const Top8Entry = IDL.Record({
    'username' : IDL.Text,
    'avatar_key' : IDL.Opt(IDL.Text),
    'principal_id' : IDL.Principal,
  });
  const PublicProfileFull = IDL.Record({
    'is_raven' : IDL.Bool,
    'wallpaper_key' : IDL.Opt(IDL.Text),
    'banner_key' : IDL.Opt(IDL.Text),
    'top8' : IDL.Vec(Top8Entry),
    'plants_growing' : IDL.Nat,
    'nft_count' : IDL.Nat,
    'is_pepperhead' : IDL.Bool,
    'profile' : UserProfilePublic,
  });
  const ActivityEntry = IDL.Record({
    'plantName' : IDL.Text,
    'actionType' : IDL.Text,
    'detail' : IDL.Text,
    'author' : IDL.Principal,
    'plantId' : PlantId,
    'timestamp' : Timestamp,
  });
  const ScheduleEntry = IDL.Record({
    'timing' : IDL.Text,
    'dilution' : IDL.Text,
    'stage' : IDL.Text,
    'notes' : IDL.Text,
    'frequency' : IDL.Text,
    'input_name' : IDL.Text,
  });
  const SeedBankStats = IDL.Record({
    'totalLots' : IDL.Nat,
    'activeCrosses' : IDL.Nat,
    'varietyCount' : IDL.Nat,
  });
  const TokenPrice = IDL.Record({
    'token' : OracleToken,
    'price_in_icp_e8s' : IDL.Nat,
    'last_updated' : Timestamp,
  });
  const CellStatus = IDL.Variant({
    'Empty' : IDL.Null,
    'Dead' : IDL.Null,
    'Germinated' : IDL.Null,
    'Planted' : IDL.Null,
    'Transplanted' : IDL.Null,
  });
  const TrayCellPublic = IDL.Record({
    'status' : CellStatus,
    'containerLabel' : IDL.Opt(IDL.Text),
    'plantedAt' : IDL.Opt(Timestamp),
    'inventoryPlantId' : IDL.Opt(PlantId),
    'varietyName' : IDL.Opt(IDL.Text),
    'nftTokenId' : IDL.Opt(IDL.Nat),
    'plantId' : IDL.Opt(PlantId),
    'position' : IDL.Nat,
    'daysSincePlanted' : IDL.Opt(IDL.Nat),
    'germinatedAt' : IDL.Opt(Timestamp),
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
  const DayBucket = IDL.Nat;
  const DailyFeatureStat = IDL.Record({
    'day' : DayBucket,
    'action' : IDL.Text,
    'feature' : IDL.Text,
    'count' : IDL.Nat,
    'uniqueUsers' : IDL.Nat,
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
  const GuideSection = IDL.Record({
    'id' : IDL.Text,
    'title' : IDL.Text,
    'content' : IDL.Text,
    'timing' : IDL.Opt(IDL.Text),
    'icon' : IDL.Text,
  });
  const VarietyGuide = IDL.Record({
    'recipeRefs' : IDL.Vec(IDL.Nat),
    'generatedAt' : Timestamp,
    'zone' : IDL.Text,
    'version' : IDL.Nat,
    'sections' : IDL.Vec(GuideSection),
    'varietyId' : IDL.Nat,
  });
  const VarietySource = IDL.Record({
    'url' : IDL.Text,
    'vendorName' : IDL.Text,
  });
  const VarietyProvenancePublic = IDL.Record({
    'breederLocation' : IDL.Opt(IDL.Text),
    'heatClass' : IDL.Opt(IDL.Text),
    'origin' : IDL.Opt(IDL.Text),
    'photoKey' : IDL.Opt(IDL.Text),
    'variety_id' : IDL.Nat,
    'photoCredit' : IDL.Opt(IDL.Text),
    'sources' : IDL.Vec(VarietySource),
    'species' : IDL.Opt(IDL.Text),
    'breeder' : IDL.Opt(IDL.Text),
  });
  const ZoneRecommendation = IDL.Record({
    'name' : IDL.Text,
    'emoji' : IDL.Text,
    'notes' : IDL.Text,
    'event_type' : PlantingEventType,
  });
  const ZoneSchedule = IDL.Record({
    'month' : IDL.Nat,
    'recommendations' : IDL.Vec(ZoneRecommendation),
    'zone_label' : IDL.Text,
  });
  const ZoneCalendar = IDL.Record({
    'zone_label' : IDL.Text,
    'months' : IDL.Vec(ZoneSchedule),
  });
  const CallerVoteInfo = IDL.Record({
    'nft_token_id' : IDL.Nat,
    'option_id' : IDL.Nat,
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
  const AdminOrderStatusFilter = IDL.Variant({
    'All' : IDL.Null,
    'Paid' : IDL.Null,
    'PickedUp' : IDL.Null,
    'Cancelled' : IDL.Null,
    'Shipped' : IDL.Null,
    'Pending' : IDL.Null,
  });
  const ClaimTokenAdminPublic = IDL.Record({
    'token' : IDL.Text,
    'token_id' : IDL.Nat,
    'redeemed' : IDL.Bool,
    'plant_id' : IDL.Opt(PlantId),
  });
  const GrowerDirectoryEntry = IDL.Record({
    'tokenId' : IDL.Nat,
    'growerLocation' : IDL.Opt(IDL.Text),
    'memberSince' : IDL.Int,
    'profilePrincipal' : IDL.Principal,
    'growerName' : IDL.Text,
    'plantCount' : IDL.Nat,
    'provenanceMinted' : IDL.Nat,
  });
  const Icrc7TokenFilter = IDL.Variant({
    'All' : IDL.Null,
    'Missing' : IDL.Null,
    'Available' : IDL.Null,
    'Sold' : IDL.Null,
    'PepperHead' : IDL.Null,
    'Assigned' : IDL.Null,
  });
  const Icrc7TokenAdminPublic = IDL.Record({
    'token_id' : IDL.Nat,
    'product_id' : IDL.Opt(ProductId),
    'owner' : IDL.Text,
    'rarity_label' : IDL.Text,
    'is_canister_pool' : IDL.Bool,
    'is_pepperhead' : IDL.Bool,
    'plant_id' : IDL.Opt(PlantId),
  });
  const LoadStaticMetadataResult = IDL.Record({
    'skipped' : IDL.Nat,
    'errors' : IDL.Vec(IDL.Tuple(IDL.Nat, IDL.Text)),
    'loaded' : IDL.Nat,
  });
  const DeathCause = IDL.Variant({
    'DampingOff' : IDL.Null,
    'PestDamage' : IDL.Null,
    'Disease' : IDL.Null,
    'Overwatering' : IDL.Null,
    'Unknown' : IDL.Null,
    'Other' : IDL.Null,
    'Drought' : IDL.Null,
  });
  const MintDesignNftResult = IDL.Record({ 'nftTokenId' : IDL.Nat });
  const MintGrowerProvenanceResult = IDL.Record({
    'tokenId' : IDL.Opt(IDL.Nat),
    'message' : IDL.Text,
    'success' : IDL.Bool,
  });
  const MintRWAProvenanceInput = IDL.Record({
    'custom_notes' : IDL.Text,
    'artwork_layer_id' : ArtworkLayerId,
    'rarity_tier' : IDL.Nat,
    'plant_id' : PlantId,
  });
  const PurchaseCoopSeatResult = IDL.Record({
    'tokenId' : IDL.Opt(IDL.Nat),
    'message' : IDL.Text,
    'success' : IDL.Bool,
  });
  const PurchasePlantResult = IDL.Record({
    'claimToken' : IDL.Opt(ClaimTokenId),
    'nftTokenId' : IDL.Opt(IDL.Nat),
    'message' : IDL.Text,
    'success' : IDL.Bool,
  });
  const RecordTipInput = IDL.Record({
    'post_id' : PostId,
    'block_index' : IDL.Nat,
    'ledger_canister_id' : IDL.Text,
    'amount' : IDL.Nat,
  });
  const SaveProfileInput = IDL.Record({
    'bio' : IDL.Text,
    'username' : IDL.Text,
    'avatar_key' : IDL.Opt(IDL.Text),
    'location' : IDL.Opt(IDL.Text),
  });
  const VarietyProvenance = IDL.Record({
    'breederLocation' : IDL.Opt(IDL.Text),
    'heatClass' : IDL.Opt(IDL.Text),
    'origin' : IDL.Opt(IDL.Text),
    'photoKey' : IDL.Opt(IDL.Text),
    'photoCredit' : IDL.Opt(IDL.Text),
    'sources' : IDL.Vec(VarietySource),
    'species' : IDL.Opt(IDL.Text),
    'breeder' : IDL.Opt(IDL.Text),
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
  const UpdatePlantingEventInput = IDL.Record({
    'id' : IDL.Nat,
    'name' : IDL.Text,
    'emoji' : IDL.Text,
    'notes' : IDL.Text,
    'scheduled_at' : Timestamp,
    'event_type' : PlantingEventType,
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
  const UpdateProposalInput = IDL.Record({
    'title' : IDL.Opt(IDL.Text),
    'description' : IDL.Opt(IDL.Text),
    'voting_ends_at' : IDL.Opt(Timestamp),
    'category' : IDL.Opt(ProposalCategory),
    'voting_starts_at' : IDL.Opt(Timestamp),
    'options' : IDL.Opt(IDL.Vec(ProposalOptionInput)),
  });
  const UpdateRecipeInput = IDL.Record({
    'id' : RecipeId,
    'title' : IDL.Opt(IDL.Text),
    'fermentation_time' : IDL.Opt(IDL.Text),
    'image_key' : IDL.Opt(IDL.Text),
    'difficulty' : IDL.Opt(Difficulty),
    'slug' : IDL.Opt(IDL.Text),
    'tags' : IDL.Opt(IDL.Vec(IDL.Text)),
    'tips' : IDL.Opt(IDL.Vec(IDL.Text)),
    'best_for' : IDL.Opt(IDL.Vec(IDL.Text)),
    'description' : IDL.Opt(IDL.Text),
    'safety_notes' : IDL.Opt(IDL.Vec(IDL.Text)),
    'total_time' : IDL.Opt(IDL.Text),
    'is_published' : IDL.Opt(IDL.Bool),
    'steps' : IDL.Opt(IDL.Vec(RecipeStep)),
    'application_frequency' : IDL.Opt(IDL.Text),
    'category' : IDL.Opt(RecipeCategory),
    'display_order' : IDL.Opt(IDL.Nat),
    'related_recipe_ids' : IDL.Opt(IDL.Vec(IDL.Nat)),
    'ingredients' : IDL.Opt(IDL.Vec(Ingredient)),
    'prep_time' : IDL.Opt(IDL.Text),
    'application_rate' : IDL.Opt(IDL.Text),
  });
  const ValidationSeverity = IDL.Variant({
    'Error' : IDL.Null,
    'Info' : IDL.Null,
    'Warning' : IDL.Null,
  });
  const ValidationWarning = IDL.Record({
    'code' : IDL.Text,
    'plantId' : IDL.Opt(IDL.Nat),
    'message' : IDL.Text,
    'severity' : ValidationSeverity,
    'relatedPlantId' : IDL.Opt(IDL.Nat),
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
    'addComment' : IDL.Func([PostId, IDL.Text, IDL.Bool], [CommentPublic], []),
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
          IDL.Opt(ContainerSize),
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
    'addPurchasedPlantToNims' : IDL.Func(
        [IDL.Nat, ContainerSize, IDL.Opt(IDL.Text)],
        [PlantSeedResult],
        [],
      ),
    'addSeedLot' : IDL.Func(
        [
          IDL.Nat,
          SeedSource,
          IDL.Opt(IDL.Nat),
          IDL.Opt(IDL.Nat),
          IDL.Opt(IDL.Text),
        ],
        [IDL.Nat],
        [],
      ),
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
    'addVendor' : IDL.Func(
        [IDL.Text, IDL.Opt(IDL.Text), IDL.Opt(IDL.Text)],
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
    'adminBatchAirdrop' : IDL.Func(
        [IDL.Vec(IDL.Principal), IDL.Bool, IDL.Opt(IDL.Nat)],
        [
          IDL.Vec(
            IDL.Record({
              'token_id' : IDL.Nat,
              'recipient' : IDL.Principal,
              'message' : IDL.Text,
              'success' : IDL.Bool,
            })
          ),
        ],
        [],
      ),
    'adminDeleteComment' : IDL.Func([CommentId], [IDL.Bool], []),
    'adminDeletePost' : IDL.Func([PostId], [IDL.Bool], []),
    'adminDeleteVarietyGuide' : IDL.Func([IDL.Nat, IDL.Text], [IDL.Bool], []),
    'adminListUsers' : IDL.Func(
        [IDL.Nat, IDL.Nat, IDL.Text],
        [AdminUserPage],
        ['query'],
      ),
    'adminReturnToPool' : IDL.Func([IDL.Nat], [TransferResult], []),
    'adminRevokeSeat' : IDL.Func([IDL.Nat, IDL.Text], [IDL.Bool], []),
    'adminRunDailyWeatherCapture' : IDL.Func([], [IDL.Nat], []),
    'adminSendNotification' : IDL.Func(
        [IDL.Principal, IDL.Text],
        [IDL.Bool],
        [],
      ),
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
    'adminUnstickPepperHead' : IDL.Func(
        [IDL.Nat],
        [IDL.Record({ 'message' : IDL.Text, 'success' : IDL.Bool })],
        [],
      ),
    'adminWithdrawTokens' : IDL.Func(
        [IDL.Text, IDL.Principal, IDL.Nat],
        [AdminWithdrawTokensResult],
        [],
      ),
    'airdropNFT' : IDL.Func([IDL.Text, IDL.Principal], [], []),
    'assignCallerUserRole' : IDL.Func([IDL.Principal, UserRole], [], []),
    'assignPoolNFT' : IDL.Func([IDL.Nat, AssignAction], [], []),
    'backfillWeatherHistory' : IDL.Func(
        [PlantId, IDL.Text, IDL.Text],
        [IDL.Nat],
        [],
      ),
    'banUser' : IDL.Func([IDL.Principal], [], []),
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
    'batchFeed' : IDL.Func(
        [IDL.Vec(PlantId), IDL.Text, IDL.Text, IDL.Text, IDL.Opt(IDL.Text)],
        [IDL.Nat],
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
    'batchWater' : IDL.Func(
        [IDL.Vec(PlantId), IDL.Nat, IDL.Opt(IDL.Float64), IDL.Opt(IDL.Text)],
        [IDL.Nat],
        [],
      ),
    'beginArtworkUpload' : IDL.Func([IDL.Nat], [], []),
    'beginVideoUpload' : IDL.Func([IDL.Text, IDL.Nat], [IDL.Nat], []),
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
    'calculateGardenYield' : IDL.Func(
        [IDL.Nat],
        [IDL.Opt(YieldEstimate)],
        ['query'],
      ),
    'calculateGardenYieldInput' : IDL.Func(
        [GardenDesignInput],
        [YieldEstimate],
        ['query'],
      ),
    'cancelOffer' : IDL.Func([IDL.Text], [Offer], []),
    'cancelProposal' : IDL.Func([ProposalId], [IDL.Bool], []),
    'cancelResaleListing' : IDL.Func(
        [IDL.Text],
        [IDL.Variant({ 'ok' : IDL.Null, 'err' : IDL.Text })],
        [],
      ),
    'cancelVideoUpload' : IDL.Func([IDL.Nat], [], []),
    'castVote' : IDL.Func([ProposalId, IDL.Nat], [IDL.Bool], []),
    'clearArtworkFiles' : IDL.Func([], [], []),
    'closeProposal' : IDL.Func([ProposalId], [IDL.Bool], []),
    'completeEvent' : IDL.Func([IDL.Nat], [PlantingEvent], []),
    'confirmICPayPayment' : IDL.Func(
        [IDL.Nat, IDL.Text],
        [IDL.Record({ 'message' : IDL.Text, 'success' : IDL.Bool })],
        [],
      ),
    'confirmOrderPaymentDirect' : IDL.Func(
        [IDL.Nat, IDL.Text, IDL.Nat],
        [ConfirmOrderPaymentDirectResult],
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
    'createGardenDesign' : IDL.Func(
        [GardenDesignInput],
        [CreateGardenDesignResult],
        [],
      ),
    'createGrowerProposal' : IDL.Func(
        [CreateProposalInput],
        [IDL.Record({ 'proposalId' : IDL.Nat })],
        [],
      ),
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
    'createPlantingEvent' : IDL.Func(
        [CreatePlantingEventInput],
        [PlantingEvent],
        [],
      ),
    'createPost' : IDL.Func([CreatePostInput], [PostPublic], []),
    'createProduct' : IDL.Func([CreateProductInput], [ProductPublic], []),
    'createProposal' : IDL.Func(
        [CreateProposalInput],
        [IDL.Record({ 'proposalId' : IDL.Nat })],
        [],
      ),
    'createRecipe' : IDL.Func(
        [CreateRecipeInput],
        [IDL.Record({ 'recipe_id' : RecipeId })],
        [],
      ),
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
    'deleteComment' : IDL.Func([CommentId], [IDL.Bool], []),
    'deleteGardenDesign' : IDL.Func([IDL.Nat], [IDL.Bool], []),
    'deletePlantingEvent' : IDL.Func([IDL.Nat], [], []),
    'deletePost' : IDL.Func([PostId], [IDL.Bool], []),
    'deleteProduct' : IDL.Func([ProductId], [], []),
    'deleteRecipe' : IDL.Func([RecipeId], [IDL.Bool], []),
    'deleteTray' : IDL.Func([TrayId], [], []),
    'delistNft' : IDL.Func([IDL.Nat], [IDL.Bool], []),
    'delistPlant' : IDL.Func([PlantId], [IDL.Bool], []),
    'designateCoopSeats' : IDL.Func(
        [IDL.Vec(IDL.Nat)],
        [
          IDL.Record({
            'messages' : IDL.Vec(IDL.Text),
            'skipped' : IDL.Nat,
            'designated' : IDL.Nat,
          }),
        ],
        [],
      ),
    'editPost' : IDL.Func([PostId, IDL.Text], [IDL.Bool], []),
    'ensureAdminProfile' : IDL.Func([], [], []),
    'ensureCallerProfile' : IDL.Func([], [], []),
    'feedEntireTray' : IDL.Func(
        [TrayId, IDL.Text, IDL.Text, IDL.Text, IDL.Opt(IDL.Text)],
        [IDL.Nat],
        [],
      ),
    'finalizeArtworkUpload' : IDL.Func([], [UploadResult], []),
    'finishVideoUpload' : IDL.Func(
        [IDL.Nat, IDL.Opt(IDL.Vec(IDL.Nat8))],
        [FinishVideoUploadResult],
        [],
      ),
    'fixTransplantedPlant' : IDL.Func(
        [PlantId, ContainerSize, IDL.Opt(PlantId)],
        [IDL.Bool],
        [],
      ),
    'followUser' : IDL.Func([IDL.Principal], [IDL.Bool], []),
    'generateAllPoolNFTs' : IDL.Func([], [IDL.Nat], []),
    'generateClaimToken' : IDL.Func([IDL.Nat], [IDL.Text], []),
    'generateClaimTokens' : IDL.Func(
        [IDL.Vec(IDL.Nat)],
        [IDL.Vec(IDL.Record({ 'tokenId' : IDL.Nat, 'claimToken' : IDL.Text }))],
        [],
      ),
    'generateCoopClaimToken' : IDL.Func([PlantId], [IDL.Text], []),
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
    'getAdminOrder' : IDL.Func(
        [OrderId],
        [IDL.Opt(AdminOrderPublic)],
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
    'getAvatarFile' : IDL.Func(
        [IDL.Text],
        [IDL.Opt(IDL.Vec(IDL.Nat8))],
        ['query'],
      ),
    'getBatchGiftPack' : IDL.Func(
        [ClaimTokenId],
        [IDL.Opt(BatchGiftPackPublic)],
        ['query'],
      ),
    'getCallerDaoNftCount' : IDL.Func([], [IDL.Nat], ['query']),
    'getCallerDiscount' : IDL.Func([], [CallerDiscount], ['query']),
    'getCallerMembership' : IDL.Func(
        [],
        [IDL.Opt(MembershipNFTPublic)],
        ['query'],
      ),
    'getCallerProfile' : IDL.Func([], [IDL.Opt(UserProfilePublic)], ['query']),
    'getCallerUserProfile' : IDL.Func(
        [],
        [IDL.Opt(UserProfilePublic)],
        ['query'],
      ),
    'getCallerUserRole' : IDL.Func([], [UserRole], ['query']),
    'getCanisterHealth' : IDL.Func([], [Health], ['query']),
    'getCanisterId' : IDL.Func([], [IDL.Text], ['query']),
    'getCanisterTreasuryBalances' : IDL.Func(
        [],
        [IDL.Vec(CanisterTreasuryBalance)],
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
    'getCommunityImageFile' : IDL.Func(
        [IDL.Text],
        [IDL.Opt(ShopListingFile)],
        ['query'],
      ),
    'getCoopSeatPriceCents' : IDL.Func([], [IDL.Nat], ['query']),
    'getCoopSeatsRemaining' : IDL.Func(
        [],
        [IDL.Record({ 'total' : IDL.Nat, 'available' : IDL.Nat })],
        ['query'],
      ),
    'getCycleBalance' : IDL.Func([], [IDL.Nat], ['query']),
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
            'uniqueVoters' : IDL.Nat,
            'callerVotes' : IDL.Nat,
            'activeProposals' : IDL.Nat,
          }),
        ],
        ['query'],
      ),
    'getFeaturedRecipes' : IDL.Func(
        [IDL.Nat],
        [IDL.Vec(RecipePublic)],
        ['query'],
      ),
    'getFleetCanisterHealth' : IDL.Func([], [IDL.Vec(FleetEntry)], []),
    'getFollowers' : IDL.Func(
        [IDL.Principal, IDL.Nat, IDL.Nat],
        [IDL.Vec(UserProfilePublic)],
        ['query'],
      ),
    'getFollowersCount' : IDL.Func([IDL.Principal], [IDL.Nat], ['query']),
    'getFollowing' : IDL.Func(
        [IDL.Principal, IDL.Nat, IDL.Nat],
        [IDL.Vec(UserProfilePublic)],
        ['query'],
      ),
    'getFollowingCount' : IDL.Func([IDL.Principal], [IDL.Nat], ['query']),
    'getFollowingFeed' : IDL.Func(
        [IDL.Nat, IDL.Nat],
        [IDL.Vec(PostPublic)],
        ['query'],
      ),
    'getForSalePlants' : IDL.Func([], [IDL.Vec(PlantPublic)], ['query']),
    'getGardenDesign' : IDL.Func([IDL.Nat], [IDL.Opt(GardenDesign)], ['query']),
    'getGardenDesignForUser' : IDL.Func(
        [IDL.Nat],
        [IDL.Opt(GardenDesign)],
        ['query'],
      ),
    'getGlobalFeed' : IDL.Func(
        [IDL.Nat, IDL.Nat],
        [IDL.Vec(PostPublic)],
        ['query'],
      ),
    'getGrowerProvenanceMeta' : IDL.Func(
        [IDL.Nat],
        [IDL.Opt(GrowerProvenanceMeta)],
        ['query'],
      ),
    'getIcrc7PoolStatsAdmin' : IDL.Func([], [Icrc7PoolStats], ['query']),
    'getLatestNurseryWeather' : IDL.Func(
        [],
        [IDL.Opt(WeatherSnapshot)],
        ['query'],
      ),
    'getLinkedWallets' : IDL.Func([], [IDL.Vec(IDL.Principal)], ['query']),
    'getListedNfts' : IDL.Func(
        [IDL.Opt(IDL.Bool)],
        [IDL.Vec(NftListingPublic)],
        ['query'],
      ),
    'getLoadedMetadataCount' : IDL.Func([], [IDL.Nat], ['query']),
    'getMembershipPriceInToken' : IDL.Func([OracleToken], [IDL.Nat], ['query']),
    'getMyCoopStatus' : IDL.Func([], [IDL.Opt(CoopStatus)], ['query']),
    'getMyCrosses' : IDL.Func([], [IDL.Vec(BreedingCrossPublic)], ['query']),
    'getMyDesigns' : IDL.Func([], [IDL.Vec(GardenDesign)], ['query']),
    'getMyFavorites' : IDL.Func(
        [IDL.Nat, IDL.Nat],
        [IDL.Vec(RecipePublic)],
        ['query'],
      ),
    'getMyNftListings' : IDL.Func([], [IDL.Vec(NftListingPublic)], ['query']),
    'getMyNotifications' : IDL.Func(
        [IDL.Nat, IDL.Nat],
        [IDL.Vec(NotificationPublic)],
        ['query'],
      ),
    'getMyOffers' : IDL.Func([], [IDL.Vec(Offer)], ['query']),
    'getMyPlantsNims' : IDL.Func([], [IDL.Vec(PlantLifecycle)], []),
    'getMyResaleListings' : IDL.Func(
        [],
        [IDL.Vec(ResaleListingPublic)],
        ['query'],
      ),
    'getMySchedule' : IDL.Func(
        [Timestamp, Timestamp],
        [IDL.Vec(PlantingEvent)],
        ['query'],
      ),
    'getMySchedules' : IDL.Func([], [IDL.Vec(SavedSchedule)], []),
    'getMySeedBank' : IDL.Func([], [IDL.Vec(SeedLotPublic)], ['query']),
    'getMyTrays' : IDL.Func([], [IDL.Vec(TrayPublic)], ['query']),
    'getMyVendors' : IDL.Func([], [IDL.Vec(SeedVendorPublic)], ['query']),
    'getMyWeatherRecords' : IDL.Func([IDL.Nat], [IDL.Vec(WeatherRecord)], []),
    'getNewOrderCount' : IDL.Func([], [IDL.Nat], ['query']),
    'getNftPoolStatus' : IDL.Func(
        [],
        [IDL.Record({ 'total' : IDL.Nat, 'available' : IDL.Nat })],
        ['query'],
      ),
    'getNimsDashboardStats' : IDL.Func([], [DashboardStats], ['query']),
    'getNimsPhotoFile' : IDL.Func(
        [IDL.Text],
        [IDL.Opt(ShopListingFile)],
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
    'getOverdueEvents' : IDL.Func([], [IDL.Vec(PlantingEvent)], ['query']),
    'getPlant' : IDL.Func([PlantId], [IDL.Opt(PlantPublic)], ['query']),
    'getPlantByNft' : IDL.Func([IDL.Nat], [IDL.Opt(PlantLifecycle)], ['query']),
    'getPlantClaimToken' : IDL.Func([PlantId], [IDL.Opt(IDL.Text)], ['query']),
    'getPlantCount' : IDL.Func([], [PlantCountStats], ['query']),
    'getPlantHealth' : IDL.Func([PlantId], [IDL.Opt(PlantHealth)], ['query']),
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
    'getPlantingEvent' : IDL.Func(
        [IDL.Nat],
        [IDL.Opt(PlantingEvent)],
        ['query'],
      ),
    'getPlantsByContainer' : IDL.Func(
        [ContainerSize],
        [IDL.Vec(PlantLifecycle)],
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
    'getPostWithComments' : IDL.Func(
        [PostId],
        [IDL.Opt(PostWithComments)],
        ['query'],
      ),
    'getProduct' : IDL.Func([ProductId], [IDL.Opt(ProductPublic)], ['query']),
    'getProfile' : IDL.Func(
        [IDL.Principal],
        [IDL.Opt(UserProfilePublic)],
        ['query'],
      ),
    'getProposal' : IDL.Func(
        [ProposalId],
        [IDL.Opt(ProposalPublic)],
        ['query'],
      ),
    'getProposalResults' : IDL.Func(
        [ProposalId],
        [IDL.Opt(ProposalResults)],
        ['query'],
      ),
    'getProposals' : IDL.Func(
        [IDL.Opt(ProposalStatus), IDL.Opt(ProposalCategory), IDL.Nat, IDL.Nat],
        [IDL.Vec(ProposalPublic)],
        ['query'],
      ),
    'getPublicDesigns' : IDL.Func(
        [IDL.Nat, IDL.Nat],
        [IDL.Vec(GardenDesign)],
        ['query'],
      ),
    'getPublicProfile' : IDL.Func(
        [IDL.Principal],
        [IDL.Opt(UserProfilePublic)],
        ['query'],
      ),
    'getPublicProfileFull' : IDL.Func(
        [IDL.Principal],
        [IDL.Opt(PublicProfileFull)],
        ['query'],
      ),
    'getRavenDiscountPercent' : IDL.Func([], [IDL.Nat], ['query']),
    'getRecentActivity' : IDL.Func(
        [IDL.Nat],
        [IDL.Vec(ActivityEntry)],
        ['query'],
      ),
    'getRecipe' : IDL.Func([RecipeId], [IDL.Opt(RecipePublic)], ['query']),
    'getRecipeBySlug' : IDL.Func(
        [IDL.Text],
        [IDL.Opt(RecipePublic)],
        ['query'],
      ),
    'getRecipeCategories' : IDL.Func(
        [],
        [IDL.Vec(IDL.Tuple(RecipeCategory, IDL.Nat))],
        ['query'],
      ),
    'getRecipeSeoContent' : IDL.Func(
        [RecipeId],
        [
          IDL.Record({
            'faqs' : IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text)),
            'intro' : IDL.Opt(IDL.Text),
          }),
        ],
        ['query'],
      ),
    'getRecipeVideoUrl' : IDL.Func([RecipeId], [IDL.Opt(IDL.Text)], ['query']),
    'getRecipes' : IDL.Func(
        [IDL.Opt(RecipeCategory), IDL.Opt(IDL.Text), IDL.Nat, IDL.Nat],
        [IDL.Vec(RecipePublic)],
        ['query'],
      ),
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
    'getSeedBankStats' : IDL.Func([], [SeedBankStats], ['query']),
    'getSeedLotsByVariety' : IDL.Func(
        [IDL.Nat],
        [IDL.Vec(SeedLotPublic)],
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
    'getTrayGrid' : IDL.Func([TrayId], [IDL.Vec(TrayCellPublic)], ['query']),
    'getTreasuryBalance' : IDL.Func([TreasuryToken], [IDL.Nat], ['query']),
    'getTreasuryBalances' : IDL.Func([], [IDL.Vec(TreasuryBalance)], ['query']),
    'getTreasuryLedger' : IDL.Func(
        [],
        [IDL.Vec(TreasuryTransaction)],
        ['query'],
      ),
    'getTrendingPosts' : IDL.Func([IDL.Nat], [IDL.Vec(PostPublic)], ['query']),
    'getUnreadCount' : IDL.Func([], [IDL.Nat], ['query']),
    'getUpcomingEvents' : IDL.Func([], [IDL.Vec(PlantingEvent)], ['query']),
    'getUpgradeHistory' : IDL.Func(
        [PlantId],
        [IDL.Vec(LifecycleUpgradeEvent)],
        ['query'],
      ),
    'getUploadsCanisterId' : IDL.Func([], [IDL.Opt(IDL.Text)], ['query']),
    'getUsageRollups' : IDL.Func(
        [IDL.Nat],
        [IDL.Vec(DailyFeatureStat)],
        ['query'],
      ),
    'getUserPlantsPublic' : IDL.Func(
        [IDL.Principal, IDL.Nat, IDL.Nat],
        [IDL.Vec(PlantPublic)],
        ['query'],
      ),
    'getUserPosts' : IDL.Func(
        [IDL.Principal, IDL.Nat, IDL.Nat],
        [IDL.Vec(PostPublic)],
        ['query'],
      ),
    'getVariety' : IDL.Func([IDL.Nat], [IDL.Opt(VarietyPublic)], ['query']),
    'getVarietyGuide' : IDL.Func(
        [IDL.Nat, IDL.Text],
        [IDL.Opt(VarietyGuide)],
        ['query'],
      ),
    'getVarietyIntro' : IDL.Func([IDL.Nat], [IDL.Opt(IDL.Text)], ['query']),
    'getVarietyProvenance' : IDL.Func(
        [IDL.Nat],
        [IDL.Opt(VarietyProvenancePublic)],
        ['query'],
      ),
    'getWeatherDebug' : IDL.Func(
        [],
        [
          IDL.Record({
            'activeCount' : IDL.Nat,
            'lastError' : IDL.Text,
            'lastUrl' : IDL.Text,
          }),
        ],
        ['query'],
      ),
    'getZoneCalendar' : IDL.Func([IDL.Text], [ZoneCalendar], ['query']),
    'getZoneSchedule' : IDL.Func(
        [IDL.Text, IDL.Nat],
        [ZoneSchedule],
        ['query'],
      ),
    'harvestSeeds' : IDL.Func(
        [PlantId, IDL.Opt(IDL.Nat), IDL.Opt(IDL.Text)],
        [IDL.Nat],
        [],
      ),
    'hasDAOAccess' : IDL.Func([], [IDL.Bool], ['query']),
    'hasLikedPost' : IDL.Func([PostId], [IDL.Bool], ['query']),
    'hasMembership' : IDL.Func([], [IDL.Bool], ['query']),
    'hasVoted' : IDL.Func([ProposalId], [IDL.Opt(CallerVoteInfo)], ['query']),
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
    'isFollowing' : IDL.Func([IDL.Principal], [IDL.Bool], ['query']),
    'isGrowerProvenanceToken' : IDL.Func([IDL.Nat], [IDL.Bool], ['query']),
    'isPepperHead' : IDL.Func([IDL.Nat], [IDL.Bool], ['query']),
    'isPepperHeadAvailable' : IDL.Func([], [IDL.Nat], ['query']),
    'isUserBanned' : IDL.Func([IDL.Principal], [IDL.Bool], ['query']),
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
    'likeComment' : IDL.Func([CommentId], [IDL.Bool], []),
    'likePost' : IDL.Func([PostId], [IDL.Bool], []),
    'linkWallet' : IDL.Func([IDL.Principal], [IDL.Bool], []),
    'listAllOrdersAdmin' : IDL.Func(
        [AdminOrderStatusFilter],
        [IDL.Vec(AdminOrderPublic)],
        ['query'],
      ),
    'listAllPostsAdmin' : IDL.Func(
        [IDL.Nat, IDL.Nat],
        [IDL.Vec(PostPublic)],
        ['query'],
      ),
    'listArtworkFiles' : IDL.Func(
        [],
        [IDL.Vec(IDL.Tuple(IDL.Text, IDL.Nat))],
        ['query'],
      ),
    'listArtworkLayers' : IDL.Func([], [IDL.Vec(ArtworkLayer)], []),
    'listClaimTokensAdmin' : IDL.Func(
        [IDL.Opt(IDL.Text)],
        [IDL.Vec(ClaimTokenAdminPublic)],
        ['query'],
      ),
    'listCommentsByPost' : IDL.Func(
        [PostId],
        [IDL.Vec(CommentPublic)],
        ['query'],
      ),
    'listDAOProposals' : IDL.Func([], [IDL.Vec(ProposalPublic)], ['query']),
    'listGrowerDirectory' : IDL.Func(
        [],
        [IDL.Vec(GrowerDirectoryEntry)],
        ['query'],
      ),
    'listIcrc7PoolTokensAdmin' : IDL.Func(
        [Icrc7TokenFilter, IDL.Nat, IDL.Nat],
        [IDL.Vec(Icrc7TokenAdminPublic)],
        ['query'],
      ),
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
    'listRecipeSeoContent' : IDL.Func(
        [],
        [
          IDL.Vec(
            IDL.Tuple(
              RecipeId,
              IDL.Text,
              IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text)),
            )
          ),
        ],
        ['query'],
      ),
    'listRecipeVideoUrls' : IDL.Func(
        [],
        [IDL.Vec(IDL.Tuple(RecipeId, IDL.Text))],
        ['query'],
      ),
    'listRecipes' : IDL.Func([], [IDL.Vec(RecipePublic)], ['query']),
    'listRecipesAdmin' : IDL.Func([], [IDL.Vec(RecipePublic)], ['query']),
    'listTrays' : IDL.Func([], [IDL.Vec(TrayPublic)], ['query']),
    'listVarieties' : IDL.Func([], [IDL.Vec(VarietyPublic)], ['query']),
    'listVarietyIntros' : IDL.Func(
        [],
        [IDL.Vec(IDL.Tuple(IDL.Nat, IDL.Text))],
        ['query'],
      ),
    'listVarietyProvenance' : IDL.Func(
        [IDL.Nat, IDL.Nat],
        [IDL.Vec(VarietyProvenancePublic)],
        ['query'],
      ),
    'loadStaticMetadata' : IDL.Func(
        [IDL.Vec(IDL.Tuple(IDL.Nat, IDL.Vec(IDL.Nat8)))],
        [LoadStaticMetadataResult],
        [],
      ),
    'logFeeding' : IDL.Func(
        [PlantId, IDL.Text, IDL.Text, IDL.Text, IDL.Opt(IDL.Text)],
        [IDL.Bool],
        [],
      ),
    'logPest' : IDL.Func(
        [PlantId, IDL.Text, IDL.Text, IDL.Opt(IDL.Text), IDL.Opt(IDL.Text)],
        [IDL.Bool],
        [],
      ),
    'logWatering' : IDL.Func(
        [PlantId, IDL.Nat, IDL.Opt(IDL.Float64), IDL.Opt(IDL.Text)],
        [IDL.Bool],
        [],
      ),
    'markCellDead' : IDL.Func(
        [TrayId, IDL.Nat, DeathCause, IDL.Opt(IDL.Text), IDL.Opt(IDL.Text)],
        [IDL.Bool],
        [],
      ),
    'markCellGerminated' : IDL.Func(
        [TrayId, IDL.Nat, IDL.Opt(Timestamp)],
        [AddPlantResult],
        [],
      ),
    'markNotificationsRead' : IDL.Func([IDL.Nat], [], []),
    'markOrdersSeen' : IDL.Func([OrderId], [], []),
    'markPlantDead' : IDL.Func(
        [PlantId, DeathCause, IDL.Opt(IDL.Text), IDL.Opt(IDL.Text)],
        [IDL.Bool],
        [],
      ),
    'markPlantGerminated' : IDL.Func([PlantId, Timestamp], [], []),
    'mintDesignAsNft' : IDL.Func([IDL.Nat], [MintDesignNftResult], []),
    'mintEXT' : IDL.Func(
        [IDL.Nat, IDL.Text, IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text))],
        [IDL.Text],
        [],
      ),
    'mintGrowerProvenanceToken' : IDL.Func(
        [PlantId],
        [MintGrowerProvenanceResult],
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
    'plantSeed' : IDL.Func(
        [TrayId, IDL.Nat, IDL.Nat, IDL.Opt(Timestamp)],
        [PlantSeedResult],
        [],
      ),
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
    'pruneUsageData' : IDL.Func([], [], []),
    'publishProposal' : IDL.Func([ProposalId], [IDL.Bool], []),
    'publishRecipe' : IDL.Func([RecipeId], [IDL.Bool], []),
    'purchaseCoopSeat' : IDL.Func([IDL.Text], [PurchaseCoopSeatResult], []),
    'purchaseCoopSeatDirect' : IDL.Func(
        [IDL.Text, IDL.Nat],
        [PurchaseCoopSeatResult],
        [],
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
    'purchasePepperHeadDirect' : IDL.Func(
        [IDL.Text, IDL.Nat],
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
    'recordCross' : IDL.Func(
        [
          IDL.Text,
          IDL.Nat,
          IDL.Nat,
          IDL.Opt(PlantId),
          IDL.Opt(PlantId),
          IDL.Opt(Timestamp),
          IDL.Opt(IDL.Text),
          IDL.Opt(IDL.Text),
          IDL.Opt(IDL.Text),
        ],
        [IDL.Nat],
        [],
      ),
    'recordTip' : IDL.Func([RecordTipInput], [IDL.Bool], []),
    'recordUsageEvent' : IDL.Func([IDL.Text, IDL.Text], [], []),
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
    'refreshRavenBalance' : IDL.Func([], [], []),
    'refreshTokenPrices' : IDL.Func([], [IDL.Bool], []),
    'rejectOffer' : IDL.Func([IDL.Text], [Offer], []),
    'removeAdmin' : IDL.Func([IDL.Principal], [], []),
    'removePlant' : IDL.Func([PlantId], [IDL.Bool], []),
    'removePlantPhoto' : IDL.Func([PlantId, IDL.Text], [], []),
    'removeVariety' : IDL.Func([IDL.Nat], [IDL.Bool], []),
    'removeZonePhoto' : IDL.Func([TrayId, IDL.Text], [], []),
    'reorderRecipes' : IDL.Func([IDL.Vec(RecipeId)], [IDL.Bool], []),
    'resetOrphanPoolNFT' : IDL.Func([IDL.Nat], [IDL.Bool], []),
    'resetPoolNFT' : IDL.Func(
        [IDL.Nat],
        [IDL.Variant({ 'ok' : IDL.Text, 'err' : IDL.Text })],
        [],
      ),
    'resolveUsername' : IDL.Func(
        [IDL.Text],
        [IDL.Opt(IDL.Principal)],
        ['query'],
      ),
    'revivePlant' : IDL.Func([PlantId], [IDL.Bool], []),
    'revokeClaimTokenAdmin' : IDL.Func([IDL.Text], [IDL.Bool], []),
    'runDailyWeatherCapture' : IDL.Func([], [IDL.Nat], []),
    'saveCallerUserProfile' : IDL.Func([SaveProfileInput], [IDL.Bool], []),
    'saveProfile' : IDL.Func([SaveProfileInput], [IDL.Bool], []),
    'saveSchedule' : IDL.Func([IDL.Text, IDL.Vec(IDL.Text)], [ScheduleId], []),
    'saveVarietyGuide' : IDL.Func(
        [IDL.Nat, IDL.Text, IDL.Vec(GuideSection), IDL.Vec(IDL.Nat)],
        [IDL.Bool],
        [],
      ),
    'searchRecipes' : IDL.Func(
        [IDL.Text, IDL.Nat],
        [IDL.Vec(RecipePublic)],
        ['query'],
      ),
    'searchUsers' : IDL.Func(
        [IDL.Text, IDL.Nat],
        [IDL.Vec(UserProfilePublic)],
        ['query'],
      ),
    'searchVarieties' : IDL.Func(
        [IDL.Text],
        [IDL.Vec(VarietyPublic)],
        ['query'],
      ),
    'seedDefaultRecipes' : IDL.Func([], [], []),
    'setCoopSeatPriceCents' : IDL.Func([IDL.Nat], [], []),
    'setForSale' : IDL.Func([PlantId, IDL.Bool], [], []),
    'setICPaySecretKey' : IDL.Func([IDL.Text], [], []),
    'setPlantNFT' : IDL.Func([PlantId, IDL.Text], [], []),
    'setProfileBanner' : IDL.Func([IDL.Text], [], []),
    'setProfileWallpaper' : IDL.Func([IDL.Text], [], []),
    'setRecipeFaqs' : IDL.Func(
        [RecipeId, IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text))],
        [IDL.Bool],
        [],
      ),
    'setRecipeIntro' : IDL.Func([RecipeId, IDL.Text], [IDL.Bool], []),
    'setRecipeVideoUrl' : IDL.Func(
        [RecipeId, IDL.Opt(IDL.Text)],
        [IDL.Bool],
        [],
      ),
    'setTop8' : IDL.Func([IDL.Vec(IDL.Principal)], [], []),
    'setUploadsCanisterId' : IDL.Func([IDL.Text], [], []),
    'setVarietyIntro' : IDL.Func([IDL.Nat, IDL.Text], [IDL.Bool], []),
    'setVarietyProvenance' : IDL.Func(
        [IDL.Nat, VarietyProvenance],
        [IDL.Bool],
        [],
      ),
    'storeArtworkFile' : IDL.Func(
        [IDL.Text, IDL.Vec(IDL.Nat8), IDL.Text],
        [StoredFile],
        [],
      ),
    'storeAvatarFile' : IDL.Func([IDL.Vec(IDL.Nat8)], [IDL.Text], []),
    'storeCommunityImage' : IDL.Func(
        [IDL.Text, IDL.Vec(IDL.Nat8), IDL.Text],
        [StoredFile],
        [],
      ),
    'storeNimsPhotoFile' : IDL.Func(
        [IDL.Text, IDL.Vec(IDL.Nat8), IDL.Text],
        [StoredFile],
        [],
      ),
    'storeProfileBannerFile' : IDL.Func([IDL.Vec(IDL.Nat8)], [IDL.Text], []),
    'storeProfileWallpaperFile' : IDL.Func([IDL.Vec(IDL.Nat8)], [IDL.Text], []),
    'submitOffer' : IDL.Func([SubmitOfferInput], [Offer], []),
    'toggleCooked' : IDL.Func([PlantId], [], []),
    'toggleFavorite' : IDL.Func([RecipeId], [IDL.Bool], []),
    'toggleRecipeFeatured' : IDL.Func([RecipeId], [IDL.Bool], []),
    'transplantCell' : IDL.Func([TransplantInput], [PlantPublic], []),
    'transplantPlant' : IDL.Func(
        [PlantId, ContainerSize, IDL.Opt(IDL.Text)],
        [IDL.Bool],
        [],
      ),
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
    'unbanUser' : IDL.Func([IDL.Principal], [], []),
    'unfollowUser' : IDL.Func([IDL.Principal], [], []),
    'unlikePost' : IDL.Func([PostId], [IDL.Nat], []),
    'unlinkWallet' : IDL.Func([IDL.Principal], [IDL.Bool], []),
    'updateCellData' : IDL.Func([UpdateCellDataInput], [], []),
    'updateGardenDesign' : IDL.Func(
        [IDL.Nat, GardenDesignInput],
        [IDL.Bool],
        [],
      ),
    'updateMyGrowerProfile' : IDL.Func(
        [IDL.Text, IDL.Text, IDL.Text],
        [IDL.Bool],
        [],
      ),
    'updateNimsPlantStage' : IDL.Func([PlantId, PlantStage], [IDL.Bool], []),
    'updateOrderStatus' : IDL.Func([OrderId, OrderStatus], [], []),
    'updateOrderStatusAdmin' : IDL.Func([OrderId, OrderStatus], [], []),
    'updatePlantMetadata' : IDL.Func([UpdatePlantMetadataInput], [], []),
    'updatePlantPrice' : IDL.Func([PlantId, IDL.Nat], [IDL.Bool], []),
    'updatePlantStage' : IDL.Func([PlantId, PlantStage, IDL.Text], [], []),
    'updatePlantingEvent' : IDL.Func(
        [UpdatePlantingEventInput],
        [PlantingEvent],
        [],
      ),
    'updateProduct' : IDL.Func([UpdateProductInput], [], []),
    'updateProposal' : IDL.Func(
        [ProposalId, UpdateProposalInput],
        [IDL.Bool],
        [],
      ),
    'updateRecipe' : IDL.Func([UpdateRecipeInput], [IDL.Bool], []),
    'updateSeedLot' : IDL.Func(
        [
          IDL.Nat,
          IDL.Opt(IDL.Nat),
          IDL.Opt(Timestamp),
          IDL.Opt(IDL.Text),
          IDL.Opt(IDL.Nat),
          IDL.Opt(IDL.Text),
          IDL.Opt(IDL.Bool),
          IDL.Opt(IDL.Nat),
        ],
        [IDL.Bool],
        [],
      ),
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
    'uploadVideoChunk' : IDL.Func(
        [IDL.Nat, IDL.Nat, IDL.Vec(IDL.Nat8)],
        [],
        [],
      ),
    'validateGardenDesign' : IDL.Func(
        [IDL.Nat],
        [IDL.Vec(ValidationWarning)],
        ['query'],
      ),
    'validateGardenDesignInput' : IDL.Func(
        [GardenDesignInput],
        [IDL.Vec(ValidationWarning)],
        ['query'],
      ),
    'voteOnProposal' : IDL.Func([ProposalId, IDL.Nat], [], []),
    'waterEntireTray' : IDL.Func(
        [TrayId, IDL.Nat, IDL.Opt(IDL.Float64), IDL.Opt(IDL.Text)],
        [IDL.Nat],
        [],
      ),
    'weatherProvenanceTransform' : IDL.Func(
        [
          IDL.Record({
            'context' : IDL.Vec(IDL.Nat8),
            'response' : http_request_result,
          }),
        ],
        [http_request_result],
        ['query'],
      ),
  });
  return ICSpicy;
};
export const init = ({ IDL }) => { return []; };
