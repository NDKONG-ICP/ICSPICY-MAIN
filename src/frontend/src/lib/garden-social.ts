const LIKES_KEY = "garden-design-likes";
const FORKS_KEY = "garden-design-forks";

type CountMap = Record<string, number>;

function readMap(key: string): CountMap {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "{}") as CountMap;
  } catch {
    return {};
  }
}

function writeMap(key: string, map: CountMap) {
  localStorage.setItem(key, JSON.stringify(map));
}

export function getLikeCount(designId: number): number {
  return readMap(LIKES_KEY)[String(designId)] ?? 0;
}

export function toggleLike(designId: number): number {
  const userKey = "garden-user-liked";
  const liked = new Set<string>(
    JSON.parse(localStorage.getItem(userKey) ?? "[]") as string[],
  );
  const id = String(designId);
  const counts = readMap(LIKES_KEY);
  if (liked.has(id)) {
    liked.delete(id);
    counts[id] = Math.max(0, (counts[id] ?? 1) - 1);
  } else {
    liked.add(id);
    counts[id] = (counts[id] ?? 0) + 1;
  }
  localStorage.setItem(userKey, JSON.stringify([...liked]));
  writeMap(LIKES_KEY, counts);
  return counts[id] ?? 0;
}

export function hasLiked(designId: number): boolean {
  const liked = JSON.parse(
    localStorage.getItem("garden-user-liked") ?? "[]",
  ) as string[];
  return liked.includes(String(designId));
}

export function incrementForkCount(sourceId: number): void {
  const counts = readMap(FORKS_KEY);
  const id = String(sourceId);
  counts[id] = (counts[id] ?? 0) + 1;
  writeMap(FORKS_KEY, counts);
}

export function getForkCount(designId: number): number {
  return readMap(FORKS_KEY)[String(designId)] ?? 0;
}

export function storeThumbnail(designId: number, dataUrl: string): void {
  try {
    localStorage.setItem(`garden-thumb-${designId}`, dataUrl);
  } catch {
    /* quota */
  }
}

export function getThumbnail(designId: number): string | null {
  return localStorage.getItem(`garden-thumb-${designId}`);
}
