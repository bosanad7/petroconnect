"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ImagePlus, Loader2, Sparkles, X } from "lucide-react";
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
import { CONDITIONS, KUWAIT_AREAS } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import type {
  Category,
  ListingCondition,
  ListingKind,
} from "@/types/database";

interface Props {
  categories: Category[];
  initialKind?: ListingKind;
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

  const [aiBusy, setAiBusy] = useState<"description" | "category" | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const filteredCategories = useMemo(
    () =>
      categories.filter((c) =>
        kind === "product" ? c.kind === "product" : c.kind === "service",
      ),
    [categories, kind],
  );

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
      if (data.description) setDescription(data.description);
      else toast.error("AI did not return anything");
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
      if (data.categoryId) {
        setCategoryId(data.categoryId);
        toast.success("Category suggested");
      }
    } catch {
      toast.error("AI request failed");
    } finally {
      setAiBusy(null);
    }
  }

  async function uploadImages(userId: string): Promise<string[]> {
    const urls: string[] = [];
    for (const file of files) {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("listing-images")
        .upload(path, file, { upsert: false, contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from("listing-images").getPublicUrl(path);
      urls.push(data.publicUrl);
    }
    return urls;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !description) {
      toast.error("Title and description are required");
      return;
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

      const images = files.length > 0 ? await uploadImages(user.id) : [];

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
          aiScore = data.score ?? null;
          aiFlags = data.flags ?? null;
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
      toast.success("Listing published");
      router.push(`/listings/${row.id}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
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

          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
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
          </div>

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
                <label className="aspect-square rounded-xl border border-dashed border-white/15 grid place-items-center cursor-pointer hover:bg-white/[0.04] transition">
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

      <div className="flex items-center justify-end gap-3">
        <Badge variant="outline" className="text-[10px]">
          AI fraud-check runs on publish
        </Badge>
        <Button type="submit" size="lg" disabled={submitting}>
          {submitting && <Loader2 className="size-4 animate-spin" />}
          Publish listing
        </Button>
      </div>
    </form>
  );
}
