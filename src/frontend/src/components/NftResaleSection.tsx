import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@tanstack/react-router";
import { ArrowLeftRight, Loader2, Tag, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { PaymentToken } from "../declarations/backend.did";
import { useActorReady } from "../hooks/useActorReady";
import { useAuth } from "../hooks/useAuth";
import { useMyNftTokenIds } from "../hooks/useMyNftIds";
import {
  type NftListingPublic,
  centsToStablecoinBase,
  formatUsdCents,
  useBuyListedNft,
  useDelistNft,
  useListNftForSale,
  useListedNfts,
  useMyNftListings,
} from "../hooks/useNftResale";
import { nftImageUrl, unwrapOpt } from "../hooks/useNims";
import { getNftImageUrl } from "../lib/nft-config";

function truncatePrincipal(p: string) {
  return `${p.slice(0, 8)}…${p.slice(-5)}`;
}

function isPepperHead(tokenId: bigint): boolean {
  const n = Number(tokenId);
  return n >= 7839 && n <= 8726;
}

function ListingCard({
  listing,
  callerPrincipal,
}: {
  listing: NftListingPublic;
  callerPrincipal: string | null;
}) {
  const buy = useBuyListedNft();
  const [payToken, setPayToken] = useState<"ckUSDC" | "ckUSDT">("ckUSDC");
  const isSeller = callerPrincipal === listing.seller.toText();
  const plantId = unwrapOpt(listing.plantId);
  const amount = centsToStablecoinBase(listing.priceUsdCents);

  const handleBuy = async () => {
    try {
      const token: PaymentToken =
        payToken === "ckUSDC" ? { ckUSDC: null } : { ckUSDT: null };
      await buy.mutateAsync({
        tokenId: listing.tokenId,
        token,
        amount,
      });
      toast.success(`NFT #${listing.tokenId} purchased!`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Purchase failed");
    }
  };

  return (
    <div className="rounded-xl bg-card border border-border overflow-hidden shadow-subtle hover:shadow-elevated transition-smooth">
      <img
        src={getNftImageUrl(listing.tokenId)}
        alt={`IC SPICY #${listing.tokenId}`}
        className="aspect-square w-full object-cover bg-muted"
      />
      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <p className="font-display font-semibold text-sm">
            IC SPICY #{listing.tokenId.toString()}
          </p>
          {isPepperHead(listing.tokenId) ? (
            <Badge variant="outline" className="text-xs">
              PepperHead
            </Badge>
          ) : plantId !== undefined ? (
            <Badge variant="outline" className="text-xs">
              Plant NFT
            </Badge>
          ) : null}
        </div>
        {plantId !== undefined && (
          <Link
            to="/plants/$plantId"
            params={{ plantId: plantId.toString() }}
            className="text-xs text-primary hover:underline"
          >
            View plant #{plantId.toString()}
          </Link>
        )}
        <p className="text-lg font-bold text-primary">
          {formatUsdCents(listing.priceUsdCents)}
        </p>
        <p className="text-xs text-muted-foreground">
          Seller: {truncatePrincipal(listing.seller.toText())}
        </p>
        {isSeller ? (
          <p className="text-xs text-center text-muted-foreground py-2 border border-border rounded-lg">
            Your listing
          </p>
        ) : (
          <div className="space-y-2">
            <Select
              value={payToken}
              onValueChange={(v) => setPayToken(v as "ckUSDC" | "ckUSDT")}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ckUSDC">ckUSDC</SelectItem>
                <SelectItem value="ckUSDT">ckUSDT</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              className="w-full"
              disabled={buy.isPending}
              onClick={handleBuy}
            >
              {buy.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <ArrowLeftRight className="w-3.5 h-3.5 mr-1" />
                  Buy Now
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function ListNftDialog({
  open,
  onClose,
  ownedIds,
}: {
  open: boolean;
  onClose: () => void;
  ownedIds: bigint[];
}) {
  const [tokenId, setTokenId] = useState("");
  const [priceUsd, setPriceUsd] = useState("");
  const list = useListNftForSale();

  const handleSubmit = async () => {
    const id = BigInt(tokenId);
    const cents = BigInt(Math.round(Number.parseFloat(priceUsd) * 100));
    if (cents <= 0n) {
      toast.error("Enter a valid price");
      return;
    }
    try {
      await list.mutateAsync({ tokenId: id, priceUsdCents: cents });
      toast.success("NFT listed for sale");
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to list");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>List NFT for Sale</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs">Your NFT</Label>
            <Select value={tokenId} onValueChange={setTokenId}>
              <SelectTrigger>
                <SelectValue placeholder="Select token" />
              </SelectTrigger>
              <SelectContent>
                {ownedIds.map((id) => (
                  <SelectItem key={id.toString()} value={id.toString()}>
                    IC SPICY #{id.toString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Price (USD)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={priceUsd}
              onChange={(e) => setPriceUsd(e.target.value)}
              placeholder="25.00"
            />
          </div>
          <Button
            className="w-full"
            disabled={!tokenId || !priceUsd || list.isPending}
            onClick={handleSubmit}
          >
            {list.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "List for Sale"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MyListingRow({ listing }: { listing: NftListingPublic }) {
  const delist = useDelistNft();
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
      <div className="flex items-center gap-3">
        <img
          src={nftImageUrl(listing.tokenId)}
          alt=""
          className="w-12 h-12 rounded-lg object-cover"
        />
        <div>
          <p className="text-sm font-medium">
            #{listing.tokenId.toString()} —{" "}
            {formatUsdCents(listing.priceUsdCents)}
          </p>
          <p className="text-xs text-muted-foreground">
            {listing.isActive ? "Active" : "Delisted"}
          </p>
        </div>
      </div>
      {listing.isActive && (
        <Button
          size="sm"
          variant="outline"
          disabled={delist.isPending}
          onClick={async () => {
            try {
              await delist.mutateAsync(listing.tokenId);
              toast.success("Listing removed");
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Delist failed");
            }
          }}
        >
          {delist.isPending ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <>
              <X className="w-3 h-3 mr-1" />
              Delist
            </>
          )}
        </Button>
      )}
    </div>
  );
}

export function NftResaleSection() {
  const { isAuthenticated, login, principal } = useAuth();
  const { actorReady } = useActorReady();
  const [filter, setFilter] = useState<"all" | "plants" | "pepperheads">("all");
  const [listOpen, setListOpen] = useState(false);
  const pepperHeadOnly = filter === "pepperheads" ? true : undefined;
  const {
    data: allListings = [],
    isLoading: listingsLoading,
    isFetching: listingsFetching,
    isFetched: listingsFetched,
  } = useListedNfts(pepperHeadOnly);
  const { data: myListings = [] } = useMyNftListings();
  const { data: ownedIds = [] } = useMyNftTokenIds();
  const callerPrincipal = principal?.toText() ?? null;

  const browsePending =
    listingsLoading ||
    listingsFetching ||
    (isAuthenticated && !actorReady) ||
    !listingsFetched;

  const filtered = useMemo(() => {
    if (filter !== "plants") return allListings;
    return allListings.filter((l) => l.plantId.length > 0);
  }, [allListings, filter]);

  return (
    <section className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-display font-bold flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-primary" />
            NFT Resale Marketplace
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Peer-to-peer sales — payment goes directly to the seller.
          </p>
        </div>
        {isAuthenticated ? (
          <Button
            onClick={() => setListOpen(true)}
            disabled={ownedIds.length === 0}
          >
            <Tag className="w-4 h-4 mr-1" />
            List an NFT
          </Button>
        ) : (
          <Button variant="outline" onClick={login}>
            Sign in to list
          </Button>
        )}
      </div>

      <div className="flex gap-2 flex-wrap">
        {(
          [
            ["all", "All"],
            ["plants", "Plant NFTs"],
            ["pepperheads", "PepperHeads"],
          ] as const
        ).map(([value, label]) => (
          <Button
            key={value}
            size="sm"
            variant={filter === value ? "default" : "outline"}
            onClick={() => setFilter(value)}
          >
            {label}
          </Button>
        ))}
      </div>

      {isAuthenticated && myListings.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">My Listings</h3>
          {myListings.map((l) => (
            <MyListingRow key={l.tokenId.toString()} listing={l} />
          ))}
        </div>
      )}

      {browsePending ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="aspect-square rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg mb-2">No listings yet</p>
          <p className="text-sm">
            Own an IC SPICY NFT? List it here for other collectors to buy.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {filtered.map((listing) => (
            <ListingCard
              key={listing.tokenId.toString()}
              listing={listing}
              callerPrincipal={callerPrincipal}
            />
          ))}
        </div>
      )}

      {listOpen && (
        <ListNftDialog
          open={listOpen}
          onClose={() => setListOpen(false)}
          ownedIds={ownedIds}
        />
      )}
    </section>
  );
}
