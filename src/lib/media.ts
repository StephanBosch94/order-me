import "server-only";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { getDataMode } from "@/lib/config";
import { getServiceClient } from "@/lib/supabase/admin";

const TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const MAX_BYTES = 2 * 1024 * 1024;

export async function storeImage(organizationId: string, file: File) {
  if (!file || file.size === 0) return null;
  if (file.size > MAX_BYTES) {
    throw new Error("Slika može imati najviše 2 MB.");
  }
  const extension = TYPES[file.type];
  if (!extension) {
    throw new Error("Dozvoljeni formati slike su JPG, PNG i WebP.");
  }

  const id = randomUUID();
  const bytes = Buffer.from(await file.arrayBuffer());

  if (getDataMode() === "supabase") {
    const storagePath = `${organizationId}/${id}.${extension}`;
    const { error } = await getServiceClient()
      .storage
      .from("product-images")
      .upload(storagePath, bytes, { contentType: file.type, upsert: false });
    if (error) throw new Error("Čuvanje slike nije uspelo.");
    const { data } = getServiceClient().storage.from("product-images").getPublicUrl(storagePath);
    return data.publicUrl;
  }

  const dir = path.join(process.cwd(), ".data", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, `${id}.${extension}`), bytes);
  return `/api/media/${id}.${extension}`;
}
