"use client";

import { createClient } from "./client";

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB per image
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

function safeExt(file: File) {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]{2,5}$/.test(fromName)) return fromName;
  const fromType = file.type.split("/").pop()?.toLowerCase();
  return fromType ?? "bin";
}

function validate(file: File) {
  if (file.size > MAX_BYTES) {
    throw new Error(`"${file.name}" is over 8 MB`);
  }
  if (file.type && !ALLOWED_TYPES.has(file.type)) {
    throw new Error(`"${file.name}" is not a supported image format`);
  }
}

export async function uploadListingImages(
  userId: string,
  files: File[],
  opts: { onProgress?: (done: number, total: number) => void } = {},
): Promise<string[]> {
  if (!files.length) return [];
  const supabase = createClient();
  const urls: string[] = [];

  for (const [i, file] of files.entries()) {
    validate(file);
    const path = `${userId}/${crypto.randomUUID()}.${safeExt(file)}`;
    const { error } = await supabase.storage
      .from("listing-images")
      .upload(path, file, {
        upsert: false,
        contentType: file.type || "application/octet-stream",
        cacheControl: "31536000",
      });
    if (error) throw error;
    const { data } = supabase.storage.from("listing-images").getPublicUrl(path);
    urls.push(data.publicUrl);
    opts.onProgress?.(i + 1, files.length);
  }
  return urls;
}

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  validate(file);
  const supabase = createClient();
  const path = `${userId}/avatar.${safeExt(file)}`;
  const { error } = await supabase.storage
    .from("avatars")
    .upload(path, file, {
      upsert: true,
      contentType: file.type || "application/octet-stream",
      cacheControl: "3600",
    });
  if (error) throw error;
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  // Cache-bust on update
  return `${data.publicUrl}?v=${Date.now()}`;
}
