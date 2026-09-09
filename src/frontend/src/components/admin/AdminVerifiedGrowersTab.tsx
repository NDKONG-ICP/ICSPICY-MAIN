import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  getGrowerOfTheMonth,
  slugifyGrowerName,
  useAdminDeleteVerifiedGrower,
  useAdminSetGrowerOfTheMonth,
  useAdminUpsertVerifiedGrower,
  useUploadVerifiedGrowerImage,
  useVerifiedGrowers,
  type VerifiedGrowerView,
} from "@/hooks/useVerifiedGrowers";
import type { VerifiedGrowerUpsert } from "@/declarations/backend.did";
import { uploadsUrl } from "@/lib/uploads-canister";
import {
  BadgeCheck,
  ExternalLink,
  Pencil,
  Sprout,
  Star,
  Trash2,
  Upload,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

const CATEGORY_PRESETS = [
  "Hot Sauce",
  "Rubs & Seasoning",
  "Seeds",
  "Smoked Salts",
] as const;

const EMPTY_STAT = { label: "", value: "" };

type FormState = {
  id: string;
  name: string;
  owners: string;
  tagline: string;
  description: string;
  story: string;
  url: string;
  categories: string[];
  stats: { label: string; value: string }[];
  imageKey: string;
  growerOfTheMonth: boolean;
  monthLabel: string;
  establishedYear: string;
  sortOrder: string;
};

function defaultForm(): FormState {
  return {
    id: "",
    name: "",
    owners: "",
    tagline: "",
    description: "",
    story: "",
    url: "https://",
    categories: [],
    stats: [
      { ...EMPTY_STAT },
      { ...EMPTY_STAT },
      { ...EMPTY_STAT },
      { ...EMPTY_STAT },
    ],
    imageKey: "",
    growerOfTheMonth: false,
    monthLabel: "",
    establishedYear: "",
    sortOrder: "0",
  };
}

function growerToForm(g: VerifiedGrowerView): FormState {
  const stats = [...g.stats];
  while (stats.length < 4) stats.push({ ...EMPTY_STAT });
  return {
    id: g.id,
    name: g.name,
    owners: g.owners,
    tagline: g.tagline,
    description: g.description,
    story: g.story,
    url: g.url,
    categories: [...g.categories],
    stats: stats.slice(0, 4),
    imageKey: g.imageKey,
    growerOfTheMonth: Boolean(g.growerOfTheMonth),
    monthLabel: g.growerOfTheMonth ?? "",
    establishedYear: g.establishedYear ? String(g.establishedYear) : "",
    sortOrder: String(g.sortOrder),
  };
}

function buildUpsert(form: FormState): VerifiedGrowerUpsert {
  const stats = form.stats
    .filter((s) => s.label.trim() && s.value.trim())
    .map((s) => ({ statLabel: s.label.trim(), value: s.value.trim() }));
  const year = form.establishedYear.trim();
  return {
    id: form.id.trim(),
    name: form.name.trim(),
    owners: form.owners.trim(),
    tagline: form.tagline.trim(),
    description: form.description.trim(),
    story: form.story.trim(),
    url: form.url.trim(),
    categories: form.categories,
    stats,
    imageKey: form.imageKey.trim(),
    growerOfTheMonth:
      form.growerOfTheMonth && form.monthLabel.trim()
        ? [form.monthLabel.trim()]
        : [],
    establishedYear: year ? [BigInt(year)] : [],
    sortOrder: BigInt(form.sortOrder.trim() || "0"),
  };
}

function GrowerPreviewCard({ grower }: { grower: VerifiedGrowerView }) {
  return (
    <div className="overflow-hidden rounded-xl border border-emerald-500/30 bg-card">
      <div className="relative aspect-[16/9] bg-muted">
        {grower.imageUrl ? (
          <img
            src={grower.imageUrl}
            alt=""
            className="h-full w-full object-cover object-top"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            No preview image
          </div>
        )}
        {grower.growerOfTheMonth ? (
          <Badge className="absolute left-3 top-3 gap-1 bg-amber-950/90 text-amber-100">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            {grower.growerOfTheMonth}
          </Badge>
        ) : null}
      </div>
      <div className="space-y-2 p-4">
        <p className="text-xs uppercase tracking-wide text-fire">{grower.owners}</p>
        <h4 className="font-display text-lg font-bold">{grower.name}</h4>
        <p className="text-sm text-muted-foreground line-clamp-3">
          {grower.description}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {grower.categories.map((c) => (
            <Badge key={c} variant="outline" className="text-[10px]">
              {c}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AdminVerifiedGrowersTab() {
  const { data: growers, isPending, refetch } = useVerifiedGrowers();
  const upsert = useAdminUpsertVerifiedGrower();
  const remove = useAdminDeleteVerifiedGrower();
  const setFeatured = useAdminSetGrowerOfTheMonth();
  const uploadImage = useUploadVerifiedGrowerImage();
  const fileRef = useRef<HTMLInputElement>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(defaultForm);
  const [customCategory, setCustomCategory] = useState("");
  const [lockSlug, setLockSlug] = useState(false);

  const featured = useMemo(() => getGrowerOfTheMonth(growers), [growers]);

  useEffect(() => {
    if (editingId && growers) {
      const g = growers.find((x) => x.id === editingId);
      if (g) {
        setForm(growerToForm(g));
        setLockSlug(true);
      }
    }
  }, [editingId, growers]);

  const previewGrower: VerifiedGrowerView | null = useMemo(() => {
    if (!form.name.trim()) return null;
    const stats = form.stats.filter((s) => s.label.trim() && s.value.trim());
    return {
      id: form.id || slugifyGrowerName(form.name),
      name: form.name,
      owners: form.owners,
      tagline: form.tagline,
      description: form.description,
      story: form.story,
      url: form.url,
      categories: form.categories,
      stats,
      imageKey: form.imageKey,
      imageUrl: form.imageKey ? uploadsUrl(form.imageKey) : "",
      growerOfTheMonth:
        form.growerOfTheMonth && form.monthLabel.trim()
          ? form.monthLabel.trim()
          : undefined,
      establishedYear: form.establishedYear
        ? Number(form.establishedYear)
        : undefined,
      sortOrder: Number(form.sortOrder) || 0,
    };
  }, [form]);

  const resetForm = () => {
    setEditingId(null);
    setForm(defaultForm());
    setLockSlug(false);
    setCustomCategory("");
  };

  const handleNameChange = (name: string) => {
    setForm((prev) => ({
      ...prev,
      name,
      id: lockSlug ? prev.id : slugifyGrowerName(name),
      imageKey:
        lockSlug || prev.imageKey
          ? prev.imageKey
          : name.trim()
            ? `verified-growers/${slugifyGrowerName(name)}.jpg`
            : "",
    }));
  };

  const toggleCategory = (cat: string) => {
    setForm((prev) => {
      const has = prev.categories.includes(cat);
      if (has) {
        return {
          ...prev,
          categories: prev.categories.filter((c) => c !== cat),
        };
      }
      if (prev.categories.length >= 6) return prev;
      return { ...prev, categories: [...prev.categories, cat] };
    });
  };

  const addCustomCategory = () => {
    const cat = customCategory.trim();
    if (!cat) return;
    setForm((prev) => {
      if (prev.categories.includes(cat) || prev.categories.length >= 6) {
        return prev;
      }
      return { ...prev, categories: [...prev.categories, cat] };
    });
    setCustomCategory("");
  };

  const handleSave = async () => {
    try {
      const payload = buildUpsert(form);
      if (!payload.id) {
        toast.error("Slug is required.");
        return;
      }
      await upsert.mutateAsync(payload);
      if (form.growerOfTheMonth && form.monthLabel.trim()) {
        await setFeatured.mutateAsync({
          id: payload.id,
          monthLabel: form.monthLabel.trim(),
        });
      }
      toast.success(editingId ? "Grower updated." : "Grower created.");
      resetForm();
      void refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(`Delete verified grower "${id}"?`)) return;
    try {
      await remove.mutateAsync(id);
      toast.success("Grower deleted.");
      if (editingId === id) resetForm();
      void refetch();
    } catch {
      toast.error("Delete failed.");
    }
  };

  const handleSetFeatured = async (g: VerifiedGrowerView) => {
    const monthLabel = prompt(
      "Grower of the Month label (e.g. August 2026):",
      g.growerOfTheMonth ?? "",
    );
    if (!monthLabel?.trim()) return;
    try {
      await setFeatured.mutateAsync({ id: g.id, monthLabel: monthLabel.trim() });
      toast.success("Grower of the Month updated.");
      void refetch();
    } catch {
      toast.error("Failed to set Grower of the Month.");
    }
  };

  const handleImagePick = async (file: File | undefined) => {
    if (!file) return;
    const slug = form.id.trim() || slugifyGrowerName(form.name);
    if (!slug) {
      toast.error("Enter a name or slug before uploading.");
      return;
    }
    try {
      const key = await uploadImage.mutateAsync({ slug, file });
      setForm((prev) => ({ ...prev, id: slug, imageKey: key }));
      toast.success("Preview image uploaded.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed.");
    }
  };

  return (
    <div className="space-y-8" data-ocid="admin-verified-growers-tab">
      <div>
        <h2 className="font-display font-semibold text-lg flex items-center gap-2">
          <Sprout className="w-5 h-5 text-primary" />
          Verified Growers
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Onboard trusted partner farms for the public{" "}
          <a
            href="/growers"
            className="text-emerald-400 underline"
            target="_blank"
            rel="noreferrer"
          >
            /growers
          </a>{" "}
          showcase. Changes appear without redeploying the frontend.
        </p>
      </div>

      <div className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-xl border border-border bg-card p-5 space-y-5">
          <h3 className="text-sm font-medium">
            {editingId ? `Edit ${editingId}` : "Add verified grower"}
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="vg-name">Name</Label>
              <Input
                id="vg-name"
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Plant Some Kindness"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vg-slug">Slug (URL id)</Label>
              <Input
                id="vg-slug"
                value={form.id}
                disabled={lockSlug}
                onChange={(e) =>
                  setForm((p) => ({ ...p, id: e.target.value }))
                }
                className="font-mono text-xs"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vg-sort">Sort order</Label>
              <Input
                id="vg-sort"
                type="number"
                min={0}
                value={form.sortOrder}
                onChange={(e) =>
                  setForm((p) => ({ ...p, sortOrder: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="vg-owners">Owners</Label>
              <Input
                id="vg-owners"
                value={form.owners}
                onChange={(e) =>
                  setForm((p) => ({ ...p, owners: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="vg-tagline">Tagline</Label>
              <Input
                id="vg-tagline"
                value={form.tagline}
                onChange={(e) =>
                  setForm((p) => ({ ...p, tagline: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="vg-desc">Description (tile)</Label>
              <Textarea
                id="vg-desc"
                rows={3}
                value={form.description}
                onChange={(e) =>
                  setForm((p) => ({ ...p, description: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="vg-story">Story (featured hero)</Label>
              <Textarea
                id="vg-story"
                rows={4}
                value={form.story}
                onChange={(e) =>
                  setForm((p) => ({ ...p, story: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="vg-url">Website URL</Label>
              <Input
                id="vg-url"
                value={form.url}
                onChange={(e) => setForm((p) => ({ ...p, url: e.target.value }))}
                placeholder="https://example.com/"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vg-year">Established year</Label>
              <Input
                id="vg-year"
                type="number"
                value={form.establishedYear}
                onChange={(e) =>
                  setForm((p) => ({ ...p, establishedYear: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vg-image-key">Image key</Label>
              <Input
                id="vg-image-key"
                value={form.imageKey}
                readOnly
                className="font-mono text-xs"
                placeholder="verified-growers/slug.jpg"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Categories (1–6)</Label>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_PRESETS.map((cat) => (
                <Button
                  key={cat}
                  type="button"
                  size="sm"
                  variant={
                    form.categories.includes(cat) ? "default" : "outline"
                  }
                  onClick={() => toggleCategory(cat)}
                >
                  {cat}
                </Button>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="Custom category"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCustomCategory();
                  }
                }}
              />
              <Button type="button" variant="secondary" onClick={addCustomCategory}>
                Add
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Stats (1–4)</Label>
            <div className="grid gap-2">
              {form.stats.map((stat, i) => (
                <div key={i} className="grid grid-cols-2 gap-2">
                  <Input
                    value={stat.label}
                    placeholder="Label"
                    onChange={(e) =>
                      setForm((p) => {
                        const stats = [...p.stats];
                        stats[i] = { ...stats[i]!, label: e.target.value };
                        return { ...p, stats };
                      })
                    }
                  />
                  <Input
                    value={stat.value}
                    placeholder="Value"
                    onChange={(e) =>
                      setForm((p) => {
                        const stats = [...p.stats];
                        stats[i] = { ...stats[i]!, value: e.target.value };
                        return { ...p, stats };
                      })
                    }
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border/60 p-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="vg-gotm"
                checked={form.growerOfTheMonth}
                onCheckedChange={(v) =>
                  setForm((p) => ({ ...p, growerOfTheMonth: v === true }))
                }
              />
              <Label htmlFor="vg-gotm">Grower of the Month</Label>
            </div>
            {form.growerOfTheMonth ? (
              <Input
                className="max-w-xs"
                value={form.monthLabel}
                onChange={(e) =>
                  setForm((p) => ({ ...p, monthLabel: e.target.value }))
                }
                placeholder="August 2026"
              />
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => void handleImagePick(e.target.files?.[0])}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileRef.current?.click()}
              disabled={uploadImage.isPending}
            >
              <Upload className="w-4 h-4 mr-1.5" />
              {uploadImage.isPending ? "Uploading…" : "Upload preview image"}
            </Button>
            <Button
              type="button"
              onClick={() => void handleSave()}
              disabled={upsert.isPending}
            >
              {upsert.isPending ? "Saving…" : editingId ? "Update grower" : "Create grower"}
            </Button>
            {editingId ? (
              <Button type="button" variant="ghost" onClick={resetForm}>
                Cancel edit
              </Button>
            ) : null}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-medium">Live preview</h3>
          {previewGrower ? (
            <GrowerPreviewCard grower={previewGrower} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Enter a name to preview the directory tile.
            </p>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-medium">Published growers</h3>
          {featured ? (
            <Badge variant="secondary" className="gap-1">
              <Star className="h-3 w-3" />
              Featured: {featured.name} ({featured.growerOfTheMonth})
            </Badge>
          ) : null}
        </div>

        {isPending ? (
          <Skeleton className="h-32 w-full" />
        ) : growers && growers.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {growers.map((g) => (
              <div
                key={g.id}
                className="rounded-xl border border-border bg-card p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-display font-semibold">{g.name}</span>
                      <Badge variant="outline" className="gap-1 text-[10px]">
                        <BadgeCheck className="h-3 w-3" />
                        {g.id}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {g.owners} · sort {g.sortOrder}
                    </p>
                  </div>
                  <a
                    href={g.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-400"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
                {g.imageUrl ? (
                  <img
                    src={g.imageUrl}
                    alt=""
                    className="h-24 w-full rounded-lg object-cover object-top"
                  />
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingId(g.id)}
                  >
                    <Pencil className="w-3.5 h-3.5 mr-1" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void handleSetFeatured(g)}
                  >
                    <Star className="w-3.5 h-3.5 mr-1" />
                    Set GOTM
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => void handleDelete(g.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No verified growers yet. After backend upgrade, Plant Some Kindness
            seeds automatically on first deploy.
          </p>
        )}
      </div>
    </div>
  );
}
