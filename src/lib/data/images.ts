export const MAX_PRODUCT_IMAGES = 6;

export function syncProductImages(imageUrl?: string | null, imageUrls?: string[] | null) {
  const list = (imageUrls ?? []).map((url) => url.trim()).filter(Boolean);
  if (list.length === 0 && imageUrl) list.push(imageUrl);
  const unique = [...new Set(list)].slice(0, MAX_PRODUCT_IMAGES);
  return {
    imageUrl: unique[0] ?? null,
    imageUrls: unique,
  };
}
