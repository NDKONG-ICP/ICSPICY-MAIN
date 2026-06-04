import { getNftImageUrl } from "@/lib/nft-config";
import { uploadsUrl } from "@/lib/uploads-canister";
import { useMemo, useState } from "react";
import type { PlantPhotoEntry } from "../declarations/backend.did";
import { FlipCard } from "./FlipCard";

function latestPlantPhoto(photos: PlantPhotoEntry[]): PlantPhotoEntry | null {
  if (photos.length === 0) return null;
  return photos.reduce((best, photo) =>
    photo.timestamp > best.timestamp ? photo : best,
  );
}

function PlantPhotoPlaceholder() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-zinc-800 text-zinc-400">
      <span className="mb-2 text-4xl" aria-hidden>
        📸
      </span>
      <span className="text-sm">No plant photo yet</span>
      <span className="mt-1 text-xs">Add one in NIMS</span>
    </div>
  );
}

interface NftPlantFlipCardProps {
  tokenId: bigint;
  photos: PlantPhotoEntry[];
  alt: string;
  className?: string;
  "data-ocid"?: string;
}

export function NftPlantFlipCard({
  tokenId,
  photos,
  alt,
  className,
  "data-ocid": dataOcid,
}: NftPlantFlipCardProps) {
  const [nftErrored, setNftErrored] = useState(false);
  const [photoErrored, setPhotoErrored] = useState(false);
  const latestPhoto = useMemo(() => latestPlantPhoto(photos), [photos]);

  return (
    <FlipCard
      className={className}
      data-ocid={dataOcid}
      front={
        nftErrored ? (
          <div className="flex h-full w-full flex-col items-center justify-center bg-muted text-muted-foreground">
            <span className="text-4xl">🌶️</span>
            <span className="mt-2 text-sm font-mono">
              #{tokenId.toString()}
            </span>
          </div>
        ) : (
          <img
            src={getNftImageUrl(tokenId)}
            alt={alt}
            className="absolute inset-0 h-full w-full object-cover"
            onError={() => setNftErrored(true)}
          />
        )
      }
      back={
        latestPhoto && !photoErrored ? (
          <img
            src={uploadsUrl(latestPhoto.url)}
            alt="Latest plant photo"
            className="absolute inset-0 h-full w-full object-cover"
            onError={() => setPhotoErrored(true)}
          />
        ) : (
          <PlantPhotoPlaceholder />
        )
      }
    />
  );
}
