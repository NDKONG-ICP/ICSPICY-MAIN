export type VerifiedGrowerCategory =
  | "Hot Sauce"
  | "Rubs & Seasoning"
  | "Seeds"
  | "Smoked Salts";

export type VerifiedGrowerStat = {
  label: string;
  value: string;
};

export type VerifiedGrower = {
  id: string;
  name: string;
  owners: string;
  tagline: string;
  description: string;
  story: string;
  url: string;
  categories: VerifiedGrowerCategory[];
  stats: VerifiedGrowerStat[];
  imageKey: string;
  imageUrl: string;
  growerOfTheMonth?: string;
  establishedYear?: number;
  sortOrder: number;
};
