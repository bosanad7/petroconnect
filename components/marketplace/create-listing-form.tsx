"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  CopyCheck,
  ImagePlus,
  Loader2,
  Sparkles,
  TriangleAlert,
  Wand2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CONDITIONS, KUWAIT_AREAS } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import { uploadListingImages } from "@/lib/supabase/storage";
import { formatKWD } from "@/lib/utils/format";
import type {
  Category,
  ListingCondition,
  ListingKind,
} from "@/types/database";

interface Props {
  categories: Category[];
  initialKind?: ListingKind;
}

interface PriceSuggestion {
  low: number | null;
  median: number | null;
  high: number | null;
  sample_count: number;
  source: "semantic" | "category";
}

interface DuplicateHit {
  id: string;
  title: string;
  seller_id: string;
  seller_full_name: string | null;
  price_kwd: number | null;
  similarity: number;
  created_at: string;
  reason: "fingerprint" | "semantic";
}

export function CreateListingForm({ categories, initialKind = "product" }: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [kind, setKind] = useState<ListingKind>(initialKind);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [negotiable, setNegotiable] = useState(false);
  const [condition, setCondition] = useState<ListingCondition | "">("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [location, setLocation] = useState("Kuwait City");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  const [aiBusy, setAiBusy] = useState<"description" | "category" | "title" | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [titleOptions, setTitleOptions] = useState<string[]>([]);
  const [priceSuggestion, setPriceSuggestion] = useState<PriceSuggestion | null>(null);
  const [priceBusy, setPriceBusy] = useState(false);

  const [duplicateHits, setDuplicateHits] = useState<DuplicateHit[]>([]);
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [overrideDuplicate, setOverrideDuplicate] = useState(false);

  const filteredCategories = useMemo(
    () =>
      categories.filter((c) =>
        kind === "product" ? c.kind === "product" : c.kind === "service",
      ),
    [categories, kind],
  );

  // ------ Debounced price suggestion -------------------------------------
  useEffect(() => {
    if (kind !== "product") {
      setPriceSuggestion(null);
      return;
    }
    if (title.length < 8 || description.length < 30) {
      setPriceSuggestion(null);
      return;
    }
    if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") return;

    const handle = setTimeout(async () => {
      setPriceBusy(true);
      try {
        const res = await fetch("/api/ai/suggest-price", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            description,
            category_id: categoryId || null,
            kind,
          }),
        });
        if (!res.ok) return;
        const data = await res.json();
        setPriceSuggestion(data.suggestion ?? null);
      } finally {
        setPriceBusy(false);
      }
    }, 800);
    return () => clearTimeout(handle);
  }, [title, description, categoryId, kind]);

  function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const list = Array.from(e.target.files ?? []).slice(0, 8 - files.length);
    if (!list.length) return;
    setFiles((p) => [...p, ...list]);
    setPreviews((p) => [...p, ...list.map((f) => URL.createObjectURL(f))]);
  }

  function removeFile(i: number) {
    setFiles((p) => p.filter((_, idx) => idx !== i));
    setPreviews((p) => p.filter((_, idx) => idx !== i));
  }

  async function generateDescription() {
    if (!title) {
      toast.error("Add a title first");
      return;
    }
    setAiBusy("description");
    try {
      const res = await fetch("/api/ai/generate-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          kind,
          category:
            filteredCategories.find((c) => c.id === categoryId)?.name ?? null,
          condition,
        }),
      });
      const data = await res.json();
      if (res.status === 503) {
        toast.error(data.error ?? "AI is not configured");
      } else if (data.description) {
        setDescription(data.description);
      } else {
        toast.error(data.error ?? "AI did not return anything");
      }
    } catch {
      toast.error("AI request failed");
    } finally {
      setAiBusy(null);
    }
  }

  async function generateTitles() {
    if (description.length < 20) {
      toast.error("Write a description first (at least 20 characters)");
      return;
    }
    setAiBusy("title");
    setTitleOptions([]);
    try {
      const res = await fetch("/api/ai/generate-title", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description,
          kind,
          category:
            filteredCategories.find((c) => c.id === categoryId)?.name ?? null,
        }),
      });
      const data = await res.json();
      if (res.status === 503) {
        toast.error(data.error ?? "AI is not configured");
      } else if (Array.isArray(data.titles) && data.titles.length) {
        setTitleOptions(data.titles);
      } else {
        toast.error(data.error ?? "AI did not return titles");
      }
    } catch {
      toast.error("AI request failed");
    } finally {
      setAiBusy(null);
    }
  }

  async function suggestCategory() {
    if (!title) {
      toast.error("Add a title first");
      return;
    }
    setAiBusy("category");
    try {
      const res = await fetch("/api/ai/suggest-category", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          kind,
          categories: filteredCategories.map((c) => ({
            id: c.id,
            slug: c.slug,
            name: c.name,
          })),
        }),
      });
      const data = await res.json();
      if (res.status === 503) {
        toast.error(data.error ?? "AI is not configured");
      } else if (data.categoryId) {
        setCategoryId(data.categoryId);
        toast.success("Category suggested");
      } else {
        toast.error(data.error ?? "AI did not return a category");
      }
    } catch {
      toast.error("AI request failed");
    } finally {
      setAiBusy(null);
    }
  }

  async function runDuplicateCheck(): Promise<DuplicateHit[]> {
    try {
      const res = await fetch("/api/ai/check-duplicate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, threshold: 0.86 }),
      });
      if (!res.ok) return [];
      const data = await res.json();
      return (data.duplicates ?? []) as DuplicateHit[];
    } catch {
      return [];
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !description) {
      toast.error("Title and description are required");
      return;
    }

    if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
      toast.success("Demo mode — listing previewed but not saved");
      router.push("/marketplace");
      return;
    }

    // Step 1: duplicate gate (unless user has already chosen to override)
    if (!overrideDuplicate) {
      const hits = await runDuplicateCheck();
      if (hits.length > 0) {
        setDuplicateHits(hits);
        setDuplicateOpen(true);
        return;
      }
    }

    setSubmitting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Sign in required");
        return;
      }

      const images =
        files.length > 0 ? await uploadListingImages(user.id, files) : [];

      // Background fraud check (non-blocking, fails open)
      let aiScore: number | null = null;
      let aiFlags: Record<string, unknown> | null = null;
      try {
        const res = await fetch("/api/ai/detect-fraud", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            description,
            price: Number(price) || null,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          aiScore = typeof data.score === "number" ? data.score : null;
          aiFlags = {
            flags: Array.isArray(data.flags) ? data.flags : [],
            rationale:
              typeof data.rationale === "string" ? data.rationale : null,
            scored_at: new Date().toISOString(),
          };
        }
      } catch {
        /* ignore */
      }

      const { data: row, error } = await supabase
        .from("listings")
        .insert({
          seller_id: user.id,
          kind,
          title,
          description,
          category_id: categoryId || null,
          condition: kind === "product" ? condition || null : null,
          price_kwd: price ? Number(price) : null,
          is_negotiable: negotiable,
          location,
          images,
          status: "active",
          ai_score: aiScore,
          ai_flags: aiFlags,
        })
        .select("id")
        .single();

      if (error || !row) {
        toast.error(error?.message ?? "Could not publish listing");
        return;
      }

      // Compute + persist the listing's embedding so future searches and
      // dedupe checks include it. Best-effort, non-blocking.
      void fetch("/api/ai/embed-listing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listing_id: row.id }),
      });

      toast.success("Listing published");
      router.push(`/listings/${row.id}`);
    } finally {
      setSubmitting(false);
    }
  }

  function priceHint(): string | null {
    if (kind !== "product") return null;
    if (!priceSuggestion?.median) return null;
    const lo = priceSuggestion.low ?? priceSuggestion.median;
    const hi = priceSuggestion.high ?? priceSuggestion.median;
    return `${formatKWD(lo)}–${formatKWD(hi)}`;
  }

  return (
    <>
      <form onSubmit={submit} className="space-y-6">
        <Card>
          <CardContent className="p-5 space-y-5">
            <Tabs value={kind} onValueChange={(v) => setKind(v as ListingKind)}>
              <TabsList>
                <TabsTrigger value="product">Product</TabsTrigger>
                <TabsTrigger value="service">Service offer</TabsTrigger>
                <TabsTrigger value="service_request">Service request</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Title with AI titles generator */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="title">Title</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="glass"
                  onClick={generateTitles}
                  disabled={aiBusy !== null}
                >
                  {aiBusy === "title" ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Wand2 className="size-3.5" />
                  )}
                  AI titles
                </Button>
              </div>
              <Input
                id="title"
                placeholder={
                  kind === "product"
                    ? "e.g. Toyota Land Cruiser GXR 2018 — 90k km"
                    : "e.g. Engineering CAD tutoring (weekday evenings)"
                }
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
              {titleOptions.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <p className="text-[11px] text-muted-foreground">
                    AI suggestions — click to use one
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {titleOptions.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          setTitle(t);
                          setTitleOptions([]);
                        }}
                        className="text-xs px-2.5 py-1.5 rounded-lg glass hover:bg-muted transition text-left"
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="description">Description</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="glass"
                  onClick={generateDescription}
                  disabled={aiBusy !== null}
                >
                  {aiBusy === "description" ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="size-3.5" />
                  )}
                  AI write
                </Button>
              </div>
              <Textarea
                id="description"
                placeholder="Describe the condition, accessories, history, or what you can offer…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={6}
                required
              />
            </div>

            {/* Images */}
            <div className="space-y-2">
              <Label>Photos ({files.length}/8)</Label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {previews.map((src, i) => (
                  <div
                    key={src}
                    className="relative aspect-square rounded-xl overflow-hidden glass"
                  >
                    <Image src={src} alt="" fill className="object-cover" />
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="absolute top-1.5 right-1.5 size-6 grid place-items-center rounded-full bg-black/60 hover:bg-black/80"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                ))}
                {files.length < 8 && (
                  <label className="aspect-square rounded-xl border border-dashed border-border grid place-items-center cursor-pointer hover:bg-muted/60 transition">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={onFiles}
                    />
                    <div className="text-center text-xs text-muted-foreground">
                      <ImagePlus className="size-5 mx-auto mb-1" />
                      Add
                    </div>
                  </label>
                )}
              </div>
            </div>

            {/* Category */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Category</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={suggestCategory}
                    disabled={aiBusy !== null}
                    className="text-xs h-7"
                  >
                    {aiBusy === "category" ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <Sparkles className="size-3" />
                    )}
                    AI suggest
                  </Button>
                </div>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose category" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredCategories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {kind === "product" && (
                <div className="space-y-2">
                  <Label>Condition</Label>
                  <Select
                    value={condition}
                    onValueChange={(v) => setCondition(v as ListingCondition)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose condition" />
                    </SelectTrigger>
                    <SelectContent>
                      {CONDITIONS.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Price + location */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Price (KWD)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.001"
                  min="0"
                  placeholder="e.g. 25.000"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={negotiable}
                    onChange={(e) => setNegotiable(e.target.checked)}
                    className="accent-primary"
                  />
                  Price is negotiable
                </label>
                {(priceBusy || priceHint()) && (
                  <div className="flex items-center gap-2 text-[11px]">
                    {priceBusy ? (
                      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                        <Loader2 className="size-3 animate-spin" />
                        Estimating fair price…
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md glass border border-primary/20 text-primary">
                        <Sparkles className="size-3" />
                        AI suggests {priceHint()}
                        <span className="text-muted-foreground">
                          · {priceSuggestion?.sample_count ?? 0} similar
                          {priceSuggestion?.source === "category" && " · same category"}
                        </span>
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Select value={location} onValueChange={setLocation}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {KUWAIT_AREAS.map((a) => (
                      <SelectItem key={a} value={a}>
                        {a}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3 flex-wrap">
          <Badge variant="outline" className="text-[10px]">
            <Sparkles className="size-3" /> AI fraud + duplicate check on publish
          </Badge>
          <Button type="submit" size="lg" disabled={submitting}>
            {submitting && <Loader2 className="size-4 animate-spin" />}
            Publish listing
          </Button>
        </div>
      </form>

      <Dialog open={duplicateOpen} onOpenChange={setDuplicateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TriangleAlert className="size-5 text-amber-400" />
              Looks similar to an existing listing
            </DialogTitle>
            <DialogDescription>
              We found {duplicateHits.length} active listing
              {duplicateHits.length === 1 ? "" : "s"} that overlap with yours. Continue
              only if your listing is genuinely different.
            </DialogDescription>
          </DialogHeader>

          <ul className="divide-y divide-border rounded-xl glass">
            {duplicateHits.map((h) => (
              <li key={h.id} className="p-3 flex items-center gap-3">
                <CopyCheck className="size-4 text-amber-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{h.title}</p>
                  <p className="text-[11px] text-muted-foreground">
                    by {h.seller_full_name ?? "Member"}
                    {h.price_kwd != null && (
                      <> · {formatKWD(h.price_kwd)}</>
                    )}
                    {" · "}
                    {(h.similarity * 100).toFixed(0)}% match
                    {h.reason === "fingerprint" && " · exact"}
                  </p>
                </div>
                <a
                  href={`/listings/${h.id}`}
                  target="_blank"
                  className="text-xs text-primary hover:underline shrink-0"
                  rel="noopener noreferrer"
                >
                  View
                </a>
              </li>
            ))}
          </ul>

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              variant="ghost"
              onClick={() => setDuplicateOpen(false)}
            >
              Edit listing
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setOverrideDuplicate(true);
                setDuplicateOpen(false);
                // Re-run submit with the override flag set
                setTimeout(() => {
                  document
                    .querySelector<HTMLFormElement>("form")
                    ?.requestSubmit();
                }, 0);
              }}
            >
              Publish anyway
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
