import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  BookOpen,
  Edit2,
  ExternalLink,
  ImagePlus,
  Minus,
  Plus,
  RefreshCw,
  ShoppingBag,
  Star,
  Trash2,
  Upload,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import type { Recipe } from "../backend";
import {
  useCreateRecipe,
  useDeleteRecipe,
  useListRecipes,
  useSeedDefaultRecipes,
  useStorePhotoFile,
  useToggleRecipeFeatured,
  useUpdateRecipe,
} from "../hooks/useBackend";
import { compressImage } from "../hooks/useObjectStorage";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ListEntry {
  id: string;
  value: string;
}

function makeEntry(value = ""): ListEntry {
  return { id: `${Date.now()}-${Math.random()}`, value };
}

interface RecipeFormState {
  name: string;
  full_name: string;
  description: string;
  ingredients: ListEntry[];
  instructions: ListEntry[];
  application_notes: string;
  tags: string;
  shop_link: string;
  shop_link_label: string;
  is_featured: boolean;
  photo_key: string;
}

const EMPTY_FORM: RecipeFormState = {
  name: "",
  full_name: "",
  description: "",
  ingredients: [makeEntry()],
  instructions: [makeEntry()],
  application_notes: "",
  tags: "",
  shop_link: "",
  shop_link_label: "",
  is_featured: false,
  photo_key: "",
};

function recipeToForm(r: Recipe): RecipeFormState {
  return {
    name: r.name,
    full_name: r.full_name,
    description: r.description,
    ingredients: r.ingredients.length
      ? r.ingredients.map((v) => makeEntry(v))
      : [makeEntry()],
    instructions: r.instructions.length
      ? r.instructions.map((v) => makeEntry(v))
      : [makeEntry()],
    application_notes: r.application_notes,
    tags: r.tags.join(", "),
    shop_link: r.shop_link ?? "",
    shop_link_label: r.shop_link_label ?? "",
    is_featured: r.is_featured,
    photo_key: r.photo_key ?? "",
  };
}

// ─── Dynamic List Input ───────────────────────────────────────────────────────

function DynamicList({
  label,
  items,
  onChange,
  placeholder,
  ocidPrefix,
}: {
  label: string;
  items: ListEntry[];
  onChange: (items: ListEntry[]) => void;
  placeholder: string;
  ocidPrefix: string;
}) {
  const add = () => onChange([...items, makeEntry()]);
  const remove = (id: string) => onChange(items.filter((e) => e.id !== id));
  const update = (id: string, val: string) =>
    onChange(items.map((e) => (e.id === id ? { ...e, value: val } : e)));

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs">{label}</Label>
        <button
          type="button"
          onClick={add}
          className="text-xs text-primary hover:underline flex items-center gap-1"
          data-ocid={`${ocidPrefix}-add-btn`}
        >
          <Plus className="w-3 h-3" /> Add
        </button>
      </div>
      {items.map((entry, i) => (
        <div key={entry.id} className="flex items-center gap-2">
          <Input
            value={entry.value}
            onChange={(e) => update(entry.id, e.target.value)}
            placeholder={`${placeholder} ${i + 1}`}
            className="text-sm flex-1"
            data-ocid={`${ocidPrefix}-item-${i}`}
          />
          {items.length > 1 && (
            <button
              type="button"
              onClick={() => remove(entry.id)}
              className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
              aria-label="Remove item"
            >
              <Minus className="w-4 h-4" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Photo Upload ─────────────────────────────────────────────────────────────

function PhotoUploadField({
  photoKey,
  onChange,
}: {
  photoKey: string;
  onChange: (key: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const storePhoto = useStorePhotoFile();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setProgress(10);
    try {
      const compressed = await compressImage(file);
      setProgress(50);
      const bytes = new Uint8Array(await compressed.arrayBuffer());
      const key = await storePhoto.mutateAsync({
        pathPrefix: "photos/recipes",
        data: bytes,
        mimeType: "image/jpeg",
      });
      setProgress(100);
      onChange(key);
      toast.success("Photo uploaded!");
    } catch {
      toast.error("Photo upload failed.");
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-xs">Reference Photo (optional)</Label>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg border border-dashed border-border hover:border-primary/50 bg-muted/20 hover:bg-muted/40 transition-smooth"
          disabled={uploading}
          data-ocid="cookbook-photo-upload-btn"
        >
          {uploading ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary" />
          ) : (
            <ImagePlus className="w-3.5 h-3.5 text-muted-foreground" />
          )}
          {uploading ? `Uploading… ${progress}%` : "Choose photo"}
        </button>
        {photoKey && !uploading && (
          <div className="flex items-center gap-2">
            <img
              src={`/api/object-storage/${photoKey}`}
              alt="Recipe reference"
              className="w-10 h-10 rounded-md object-cover border border-border"
            />
            <button
              type="button"
              onClick={() => onChange("")}
              className="text-muted-foreground hover:text-destructive transition-colors"
              aria-label="Remove photo"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
      {uploading && <Progress value={progress} className="h-1.5 mt-1" />}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
        data-ocid="cookbook-photo-file-input"
      />
    </div>
  );
}

// ─── Recipe Form ──────────────────────────────────────────────────────────────

function RecipeForm({
  initial,
  onSubmit,
  onCancel,
  isSubmitting,
  submitLabel,
}: {
  initial: RecipeFormState;
  onSubmit: (form: RecipeFormState) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
  submitLabel: string;
}) {
  const [form, setForm] = useState<RecipeFormState>(initial);

  const set = <K extends keyof RecipeFormState>(
    key: K,
    val: RecipeFormState[K],
  ) => setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.full_name) return;
    await onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Basic info */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-xs">Abbreviation * (e.g. OHN)</Label>
          <Input
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="OHN"
            className="mt-1 text-sm font-mono"
            required
            data-ocid="cookbook-form-name"
          />
        </div>
        <div>
          <Label className="text-xs">Full Name *</Label>
          <Input
            value={form.full_name}
            onChange={(e) => set("full_name", e.target.value)}
            placeholder="Oriental Herbal Nutrient"
            className="mt-1 text-sm"
            required
            data-ocid="cookbook-form-full-name"
          />
        </div>
        <div className="col-span-2">
          <Label className="text-xs">Description</Label>
          <Textarea
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Brief description of this ferment and its purpose…"
            className="mt-1 text-sm resize-none"
            rows={3}
            data-ocid="cookbook-form-desc"
          />
        </div>
      </div>

      {/* Dynamic lists */}
      <DynamicList
        label="Ingredients"
        items={form.ingredients}
        onChange={(v) => set("ingredients", v)}
        placeholder="Ingredient"
        ocidPrefix="cookbook-ingredients"
      />
      <DynamicList
        label="Instructions / Steps"
        items={form.instructions}
        onChange={(v) => set("instructions", v)}
        placeholder="Step"
        ocidPrefix="cookbook-instructions"
      />

      {/* Application notes */}
      <div>
        <Label className="text-xs">Application Notes</Label>
        <Textarea
          value={form.application_notes}
          onChange={(e) => set("application_notes", e.target.value)}
          placeholder="Dilution rates, timing, best practices…"
          className="mt-1 text-sm resize-none"
          rows={2}
          data-ocid="cookbook-form-app-notes"
        />
      </div>

      {/* Tags */}
      <div>
        <Label className="text-xs">Tags (comma-separated)</Label>
        <Input
          value={form.tags}
          onChange={(e) => set("tags", e.target.value)}
          placeholder="KNF, ferment, foliar, soil-drench"
          className="mt-1 text-sm"
          data-ocid="cookbook-form-tags"
        />
      </div>

      {/* Shop link */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-xs">Shop Link (optional URL)</Label>
          <Input
            type="url"
            value={form.shop_link}
            onChange={(e) => set("shop_link", e.target.value)}
            placeholder="https://icspicy.com/shop/ohn-kit"
            className="mt-1 text-sm"
            data-ocid="cookbook-form-shop-link"
          />
        </div>
        <div>
          <Label className="text-xs">Shop Link Label</Label>
          <Input
            value={form.shop_link_label}
            onChange={(e) => set("shop_link_label", e.target.value)}
            placeholder="Buy OHN Ingredients"
            className="mt-1 text-sm"
            data-ocid="cookbook-form-shop-label"
          />
        </div>
      </div>

      {/* Photo upload */}
      <PhotoUploadField
        photoKey={form.photo_key}
        onChange={(k) => set("photo_key", k)}
      />

      {/* Featured toggle */}
      <div className="flex items-center gap-3">
        <Switch
          checked={form.is_featured}
          onCheckedChange={(v) => set("is_featured", v)}
          data-ocid="cookbook-form-featured"
        />
        <Label className="text-xs cursor-pointer">
          Featured recipe (shown prominently in CookBook)
        </Label>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <Button
          type="submit"
          size="sm"
          disabled={isSubmitting || !form.name || !form.full_name}
          className="bg-primary"
          data-ocid="cookbook-form-submit"
        >
          <Upload className="w-4 h-4" />
          {isSubmitting ? "Saving…" : submitLabel}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onCancel}
          className="border-border"
          data-ocid="cookbook-form-cancel"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

// ─── Recipe Row ───────────────────────────────────────────────────────────────

function RecipeRow({
  recipe,
  onEdit,
  onDelete,
}: {
  recipe: Recipe;
  onEdit: (r: Recipe) => void;
  onDelete: (r: Recipe) => void;
}) {
  const toggle = useToggleRecipeFeatured();

  const handleToggle = async () => {
    try {
      await toggle.mutateAsync(recipe.id);
    } catch {
      toast.error("Failed to toggle featured.");
    }
  };

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-primary/30 transition-smooth"
      data-ocid="cookbook-recipe-row"
    >
      {/* Photo thumb */}
      {recipe.photo_key ? (
        <img
          src={`/api/object-storage/${recipe.photo_key}`}
          alt={recipe.name}
          className="w-12 h-12 rounded-lg object-cover border border-border flex-shrink-0"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      ) : (
        <div className="w-12 h-12 rounded-lg bg-muted/40 border border-border flex-shrink-0 flex items-center justify-center">
          <BookOpen className="w-5 h-5 text-muted-foreground/50" />
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono font-bold text-sm text-primary">
            {recipe.name}
          </span>
          <span className="text-xs text-foreground truncate">
            {recipe.full_name}
          </span>
          {recipe.is_featured && (
            <Badge
              variant="outline"
              className="text-[10px] border-yellow-500/40 text-yellow-400 flex items-center gap-1"
            >
              <Star className="w-2.5 h-2.5" /> Featured
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">
          {recipe.description || "No description"}
          {recipe.tags.length > 0 && (
            <span className="ml-1.5 text-primary/60">
              · {recipe.tags.slice(0, 3).join(", ")}
            </span>
          )}
        </p>
        {recipe.shop_link && (
          <a
            href={recipe.shop_link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline mt-0.5"
          >
            <ShoppingBag className="w-2.5 h-2.5" />
            {recipe.shop_link_label || "Shop link"}
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          type="button"
          onClick={handleToggle}
          disabled={toggle.isPending}
          title={recipe.is_featured ? "Unfeature" : "Mark as featured"}
          className={`p-1.5 rounded-md border transition-smooth ${
            recipe.is_featured
              ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-400"
              : "bg-muted/30 border-border text-muted-foreground hover:text-yellow-400 hover:border-yellow-500/30"
          }`}
          data-ocid="cookbook-featured-toggle"
        >
          <Star className="w-3.5 h-3.5" />
        </button>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs border-border"
          onClick={() => onEdit(recipe)}
          data-ocid="cookbook-edit-btn"
        >
          <Edit2 className="w-3 h-3" />
          Edit
        </Button>
        <button
          type="button"
          onClick={() => onDelete(recipe)}
          className="text-muted-foreground hover:text-destructive transition-colors p-1.5"
          aria-label="Delete recipe"
          data-ocid="cookbook-delete-btn"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Main AdminCookBookTab ────────────────────────────────────────────────────

export default function AdminCookBookTab() {
  const { data: recipes, isLoading } = useListRecipes();
  const createRecipe = useCreateRecipe();
  const updateRecipe = useUpdateRecipe();
  const deleteRecipe = useDeleteRecipe();
  const seedDefaults = useSeedDefaultRecipes();

  const [mode, setMode] = useState<"list" | "add" | "edit">("list");
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Recipe | null>(null);

  // ── Seed defaults ────────────────────────────────────────────────────────
  const handleSeedDefaults = async () => {
    try {
      await seedDefaults.mutateAsync();
      toast.success("8 KNF recipes loaded!");
    } catch {
      toast.error("Failed to seed default recipes.");
    }
  };

  // ── Create ───────────────────────────────────────────────────────────────
  const handleCreate = async (form: RecipeFormState) => {
    const tags = form.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const ingredients = form.ingredients
      .map((e) => e.value)
      .filter((v) => v.trim());
    const instructions = form.instructions
      .map((e) => e.value)
      .filter((v) => v.trim());
    try {
      await createRecipe.mutateAsync({
        name: form.name.trim().toUpperCase(),
        full_name: form.full_name.trim(),
        description: form.description.trim(),
        ingredients,
        instructions,
        application_notes: form.application_notes.trim(),
        tags,
        shop_link: form.shop_link.trim() || undefined,
        shop_link_label: form.shop_link_label.trim() || undefined,
        is_featured: form.is_featured,
        photo_key: form.photo_key || undefined,
      });
      toast.success(`Recipe "${form.name.toUpperCase()}" created!`);
      setMode("list");
    } catch {
      toast.error("Failed to create recipe.");
    }
  };

  // ── Update ───────────────────────────────────────────────────────────────
  const handleUpdate = async (form: RecipeFormState) => {
    if (!editingRecipe) return;
    const tags = form.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const ingredients = form.ingredients
      .map((e) => e.value)
      .filter((v) => v.trim());
    const instructions = form.instructions
      .map((e) => e.value)
      .filter((v) => v.trim());
    try {
      await updateRecipe.mutateAsync({
        id: editingRecipe.id,
        name: form.name.trim().toUpperCase(),
        full_name: form.full_name.trim(),
        description: form.description.trim(),
        ingredients,
        instructions,
        application_notes: form.application_notes.trim(),
        tags,
        shop_link: form.shop_link.trim() || undefined,
        shop_link_label: form.shop_link_label.trim() || undefined,
        is_featured: form.is_featured,
        photo_key: form.photo_key || undefined,
      });
      toast.success("Recipe updated!");
      setMode("list");
      setEditingRecipe(null);
    } catch {
      toast.error("Failed to update recipe.");
    }
  };

  // ── Delete ───────────────────────────────────────────────────────────────
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteRecipe.mutateAsync(deleteTarget.id);
      toast.success(`"${deleteTarget.name}" deleted.`);
      setDeleteTarget(null);
    } catch {
      toast.error("Failed to delete recipe.");
    }
  };

  const openEdit = (r: Recipe) => {
    setEditingRecipe(r);
    setMode("edit");
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (mode === "add") {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMode("list")}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            ← Back to list
          </button>
          <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            Add New Recipe
          </h3>
        </div>
        <div className="p-5 rounded-xl bg-card border border-border">
          <RecipeForm
            initial={EMPTY_FORM}
            onSubmit={handleCreate}
            onCancel={() => setMode("list")}
            isSubmitting={createRecipe.isPending}
            submitLabel="Create Recipe"
          />
        </div>
      </div>
    );
  }

  if (mode === "edit" && editingRecipe) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setMode("list");
              setEditingRecipe(null);
            }}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            ← Back to list
          </button>
          <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
            <Edit2 className="w-4 h-4 text-primary" />
            Edit: {editingRecipe.name} — {editingRecipe.full_name}
          </h3>
        </div>
        <div className="p-5 rounded-xl bg-card border border-border">
          <RecipeForm
            initial={recipeToForm(editingRecipe)}
            onSubmit={handleUpdate}
            onCancel={() => {
              setMode("list");
              setEditingRecipe(null);
            }}
            isSubmitting={updateRecipe.isPending}
            submitLabel="Save Changes"
          />
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-5" data-ocid="admin-cookbook-tab">
      {/* Header actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            CookBook Recipes
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Natural Farming inputs: OHN, FPJ, FPE, WCA, IMO2, LAB, AEM, FFA
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="border-border text-xs h-8"
            onClick={handleSeedDefaults}
            disabled={seedDefaults.isPending}
            data-ocid="cookbook-seed-defaults-btn"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${seedDefaults.isPending ? "animate-spin" : ""}`}
            />
            {seedDefaults.isPending ? "Loading…" : "Seed Default Recipes"}
          </Button>
          <Button
            size="sm"
            className="bg-primary text-xs h-8"
            onClick={() => setMode("add")}
            data-ocid="cookbook-add-recipe-btn"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Recipe
          </Button>
        </div>
      </div>

      {/* Recipe list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((k) => (
            <Skeleton key={k} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : recipes && recipes.length > 0 ? (
        <div className="space-y-2" data-ocid="cookbook-recipe-list">
          {/* Table header */}
          <div className="hidden sm:grid grid-cols-[3fr_1fr_auto] gap-3 px-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
            <span>Recipe</span>
            <span>Featured</span>
            <span>Actions</span>
          </div>
          {recipes.map((recipe) => (
            <RecipeRow
              key={recipe.id.toString()}
              recipe={recipe}
              onEdit={openEdit}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      ) : (
        <div
          className="text-center py-14 text-muted-foreground"
          data-ocid="cookbook-empty-state"
        >
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium text-foreground">No recipes yet</p>
          <p className="text-xs mt-1.5 mb-5">
            Seed the 8 default KNF recipes or add your own.
          </p>
          <div className="flex items-center gap-2 justify-center">
            <Button
              size="sm"
              variant="outline"
              onClick={handleSeedDefaults}
              disabled={seedDefaults.isPending}
              className="border-border"
              data-ocid="cookbook-empty-seed-btn"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Seed Default Recipes
            </Button>
            <Button
              size="sm"
              className="bg-primary"
              onClick={() => setMode("add")}
              data-ocid="cookbook-empty-add-btn"
            >
              <Plus className="w-3.5 h-3.5" />
              Add First Recipe
            </Button>
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display font-bold text-foreground">
              Delete "{deleteTarget?.name}"?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-sm">
              This will permanently delete the{" "}
              <strong>{deleteTarget?.full_name}</strong> recipe. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-ocid="cookbook-confirm-delete-btn"
            >
              Delete Recipe
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
