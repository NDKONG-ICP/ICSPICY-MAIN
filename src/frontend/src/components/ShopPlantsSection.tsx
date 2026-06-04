import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@tanstack/react-router";
import { Crown, MapPin, ShoppingCart } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { PlantStage as BackendPlantStage } from "../backend";
import { ProductCategory } from "../backend";
import { StageBadge } from "../components/ui/StageBadge";
import type { PlantStage } from "../declarations/backend.did";
import { useProducts } from "../hooks/useBackend";
import { useCart } from "../hooks/useCart";
import { useNftDiscount } from "../hooks/useNftDiscount";
import {
  formatCents,
  nftImageUrl,
  stageDefaultPrice,
  stageLabel,
  unwrapOpt,
  usePepperHeadAvailable,
  usePlantsForSale,
  useVarieties,
} from "../hooks/useNims";
import {
  discountedUnitPriceCents,
  formatDiscountedPriceDisplay,
} from "../lib/discount-utils";
import {
  CATEGORY_DISPLAY,
  type ShopProduct,
  filterActiveShopProducts,
  filterLivePlantProducts,
  getProductImageKeys,
  productToCartItem,
  productUnitPrice,
} from "../lib/shop-products";
import { ShopListingImage } from "./ShopListingImage";

function CatalogLivePlantCard({
  product,
  discountPercent,
  onSelect,
}: {
  product: ShopProduct;
  discountPercent: number;
  onSelect?: () => void;
}) {
  const addItem = useCart((s) => s.addItem);
  const imageKeys = getProductImageKeys(product);
  const unitPrice = productUnitPrice(product);
  const hasDiscount = discountPercent > 0;
  const displayPriceCents = discountedUnitPriceCents(
    unitPrice,
    discountPercent,
  );
  const displayPrice = Number(displayPriceCents) / 100;
  const listPrice = Number(unitPrice) / 100;
  const cfg = CATEGORY_DISPLAY[ProductCategory.LivePlant];

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    addItem(productToCartItem(product, 1));
    toast.success(`Added ${product.name} to cart`);
  };

  return (
    <div
      className="rounded-xl border border-border bg-card overflow-hidden flex flex-col cursor-pointer hover:shadow-elevated transition-smooth"
      onClick={onSelect}
    >
      <div className="aspect-[4/3] bg-muted relative">
        <ShopListingImage
          path={imageKeys[0]}
          alt={product.name}
          className="w-full h-full object-cover"
          fallback="🪴"
        />
        {cfg && (
          <span
            className={`absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium ${cfg.color}`}
          >
            {cfg.label}
          </span>
        )}
        {product.nft_token_id !== undefined && (
          <Badge variant="secondary" className="absolute top-2 right-2 text-xs">
            NFT #{product.nft_token_id.toString()}
          </Badge>
        )}
      </div>
      <div className="p-4 flex-1 flex flex-col gap-2">
        <h3 className="font-semibold text-lg">{product.name}</h3>
        {product.variety && (
          <p className="text-xs text-muted-foreground">{product.variety}</p>
        )}
        <p className="text-xs text-muted-foreground">
          {hasDiscount ? (
            <>
              <span className="text-primary font-medium">
                Your price: ${displayPrice.toFixed(2)}
              </span>{" "}
              <span className="line-through">${listPrice.toFixed(2)}</span>
            </>
          ) : (
            <>${listPrice.toFixed(2)}</>
          )}
        </p>
        <p className="text-xs text-muted-foreground flex-1 line-clamp-3">
          {product.description}
        </p>
        <div className="flex gap-2 pt-2">
          {onSelect && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={(e) => {
                e.stopPropagation();
                onSelect();
              }}
            >
              Details
            </Button>
          )}
          <Button size="sm" className="flex-1" onClick={handleAdd}>
            <ShoppingCart className="w-3 h-3 mr-1" /> Buy
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ShopPlantsSection({
  onSelectProduct,
}: {
  onSelectProduct?: (product: ShopProduct) => void;
}) {
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [varietyFilter, setVarietyFilter] = useState<string>("all");
  const stage: PlantStage | undefined = useMemo(() => {
    if (stageFilter === "Seed") return { Seed: null };
    if (stageFilter === "Seedling") return { Seedling: null };
    if (stageFilter === "Mature") return { Mature: null };
    return undefined;
  }, [stageFilter]);
  const varietyId = varietyFilter === "all" ? undefined : BigInt(varietyFilter);
  const { data: nimsPlants = [], isLoading: nimsLoading } = usePlantsForSale(
    stage,
    varietyId,
  );
  const { data: allProducts = [], isLoading: productsLoading } = useProducts();
  const { data: varieties = [] } = useVarieties();
  const { data: phAvailable } = usePepperHeadAvailable();
  const { discountPercent } = useNftDiscount();

  const catalogLivePlants = useMemo(() => {
    const active = filterActiveShopProducts(allProducts as ShopProduct[]);
    let live = filterLivePlantProducts(active);
    if (varietyFilter !== "all") {
      const varietyName = varieties.find(
        (v) => v.id.toString() === varietyFilter,
      )?.name;
      if (varietyName) {
        live = live.filter(
          (p) =>
            p.variety?.toLowerCase() === varietyName.toLowerCase() ||
            p.name.toLowerCase().includes(varietyName.toLowerCase()),
        );
      }
    }
    return live;
  }, [allProducts, varietyFilter, varieties]);

  const isLoading = nimsLoading || productsLoading;
  const totalCount = nimsPlants.length + catalogLivePlants.length;

  return (
    <section className="space-y-8">
      <div className="text-center space-y-3 py-6">
        <h2 className="text-3xl font-display font-bold">
          IC SPICY Nursery — Live Pepper Plants
        </h2>
        <p className="text-muted-foreground max-w-xl mx-auto">
          NIMS-tracked plants with full lifecycle provenance, plus catalog live
          plants added directly to the shop — every purchase includes an NFT.
        </p>
        <Badge variant="outline" className="gap-1">
          <MapPin className="w-3 h-3" /> Port Charlotte, FL — Local Pickup
        </Badge>
      </div>

      <div className="flex flex-wrap gap-3 justify-center">
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Stage" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All stages</SelectItem>
            <SelectItem value="Seed">Germinated ($5)</SelectItem>
            <SelectItem value="Seedling">1-Gallon ($25)</SelectItem>
            <SelectItem value="Mature">5-Gallon ($45)</SelectItem>
          </SelectContent>
        </Select>
        <Select value={varietyFilter} onValueChange={setVarietyFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Variety" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All varieties</SelectItem>
            {varieties.map((v) => (
              <SelectItem key={v.id.toString()} value={v.id.toString()}>
                {v.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <Skeleton className="h-48" />
      ) : totalCount === 0 ? (
        <p className="text-center text-muted-foreground py-12">
          No plants available right now — check back soon!
        </p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {nimsPlants.map((lc) => {
            const tokenId = unwrapOpt(lc.nftTokenId);
            const price =
              unwrapOpt(lc.priceCents) ??
              BigInt(stageDefaultPrice(lc.plant.stage) * 100);
            const hasDiscount = discountPercent > 0;
            const priceDisplay = hasDiscount
              ? formatDiscountedPriceDisplay(price, discountPercent)
              : null;
            const feedingCount = lc.feedingLog.length;
            return (
              <div
                key={`nims-${lc.plant.id.toString()}`}
                className="rounded-xl border border-border bg-card overflow-hidden flex flex-col"
              >
                <div className="aspect-[4/3] bg-muted relative">
                  <img
                    src={nftImageUrl(tokenId)}
                    alt={lc.plant.variety}
                    className="w-full h-full object-cover"
                  />
                  <StageBadge
                    stage={lc.plant.stage as unknown as BackendPlantStage}
                    className="absolute top-2 left-2"
                  />
                </div>
                <div className="p-4 flex-1 flex flex-col gap-2">
                  <h3 className="font-semibold text-lg">{lc.plant.variety}</h3>
                  <p className="text-xs text-muted-foreground">
                    {stageLabel(lc.plant.stage)}
                    {hasDiscount && priceDisplay ? (
                      <>
                        {" · "}
                        <span className="text-primary font-medium">
                          Your price: {priceDisplay.yourPrice}
                        </span>{" "}
                        <span className="line-through">
                          {priceDisplay.listPrice}
                        </span>
                      </>
                    ) : (
                      <> · {formatCents(price)}</>
                    )}
                  </p>
                  {tokenId !== undefined && (
                    <Badge variant="secondary" className="w-fit text-xs">
                      IC SPICY #{tokenId.toString()}
                    </Badge>
                  )}
                  <p className="text-xs text-muted-foreground flex-1">
                    {feedingCount} feeding{feedingCount !== 1 ? "s" : ""} logged
                    {unwrapOpt(lc.plant.germination_date) &&
                      ` · Germinated ${new Date(Number(unwrapOpt(lc.plant.germination_date)! / 1_000_000n)).toLocaleDateString()}`}
                  </p>
                  <div className="flex gap-2 pt-2">
                    <Link
                      to="/plants/$plantId"
                      params={{ plantId: lc.plant.id.toString() }}
                      className="flex-1"
                    >
                      <Button variant="outline" size="sm" className="w-full">
                        Details
                      </Button>
                    </Link>
                    <Link
                      to="/checkout"
                      search={{ plantId: lc.plant.id.toString() }}
                      className="flex-1"
                    >
                      <Button size="sm" className="w-full">
                        <ShoppingCart className="w-3 h-3 mr-1" /> Buy
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
          {catalogLivePlants.map((product) => (
            <CatalogLivePlantCard
              key={`catalog-${product.id.toString()}`}
              product={product}
              discountPercent={discountPercent}
              onSelect={
                onSelectProduct ? () => onSelectProduct(product) : undefined
              }
            />
          ))}
        </div>
      )}

      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-6 text-center space-y-3">
        <Crown className="w-8 h-8 mx-auto text-amber-400" />
        <h3 className="text-xl font-semibold">Join PepperHead — $25</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          DAO access, 10% shop discount, and premium provenance rights. Digital
          membership NFT.
        </p>
        <p className="text-sm font-medium">
          {phAvailable !== undefined
            ? `${phAvailable.toString()} / 888 remaining`
            : "888 membership NFTs"}
        </p>
        <Link to="/checkout" search={{ pepperHead: "1" }}>
          <Button variant="secondary">Buy PepperHead</Button>
        </Link>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        FDACS registered nursery · Port Charlotte, Florida
      </p>
    </section>
  );
}
