"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { saveProductAction } from "@/lib/actions/catalog";
import { UNITS } from "@/lib/constants";
import { MAX_PRODUCT_IMAGES } from "@/lib/data/images";
import type { Category, Product } from "@/lib/data/types";
import { formatPriceInput } from "@/lib/format";
import { fieldErrors, productFormSchema } from "@/lib/validators";
import { ProductImage } from "@/components/catalog/product-image";
import { Button } from "@/components/ui/button";
import {
  FileDropzone,
  IMAGE_FILE_ACCEPT,
  IMAGE_FILE_TYPES,
  IMAGE_MAX_BYTES,
  IMAGE_SIZE_ERROR,
  IMAGE_TYPE_ERROR,
} from "@/components/ui/file-dropzone";
import { FieldError, Input, Label, Select, Textarea } from "@/components/ui/fields";

type GallerySlot =
  | { id: string; kind: "kept"; url: string }
  | { id: string; kind: "new"; file: File; preview: string };

function initialSlots(product?: Product): GallerySlot[] {
  const urls = product?.imageUrls?.length ? product.imageUrls : product?.imageUrl ? [product.imageUrl] : [];
  return urls.map((url, index) => ({
    id: `kept-${index}-${url}`,
    kind: "kept" as const,
    url,
  }));
}

const moveButtonClass =
  "inline-flex h-7 flex-1 items-center justify-center rounded-md border border-border bg-card text-foreground transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-40";

export function ProductForm({
  product,
  categories,
  shop = true,
}: {
  product?: Product;
  categories: Category[];
  shop?: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [slots, setSlots] = useState<GallerySlot[]>(() => initialSlots(product));
  const slotsRef = useRef(slots);
  slotsRef.current = slots;

  useEffect(() => {
    return () => {
      for (const slot of slotsRef.current) {
        if (slot.kind === "new") URL.revokeObjectURL(slot.preview);
      }
    };
  }, []);

  const pendingFiles = useMemo(
    () => slots.flatMap((slot) => (slot.kind === "new" ? [slot.file] : [])),
    [slots],
  );
  const keptCount = slots.reduce((count, slot) => count + (slot.kind === "kept" ? 1 : 0), 0);

  function onFilesChange(files: File[]) {
    const current = slotsRef.current;
    const known = new Set(current.flatMap((slot) => (slot.kind === "new" ? [slot.file] : [])));
    const room = Math.max(0, MAX_PRODUCT_IMAGES - current.length);
    const created = files
      .filter((file) => !known.has(file))
      .slice(0, room)
      .map((file) => ({
        id: `new-${crypto.randomUUID()}`,
        kind: "new" as const,
        file,
        preview: URL.createObjectURL(file),
      }));
    if (created.length === 0) return;
    setSlots((existing) => {
      const existingFiles = new Set(existing.flatMap((slot) => (slot.kind === "new" ? [slot.file] : [])));
      const fresh = created
        .filter((slot) => !existingFiles.has(slot.file))
        .slice(0, Math.max(0, MAX_PRODUCT_IMAGES - existing.length));
      return fresh.length === 0 ? existing : [...existing, ...fresh];
    });
  }

  function moveSlot(index: number, direction: -1 | 1) {
    setSlots((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = current.slice();
      const [item] = next.splice(index, 1);
      next.splice(target, 0, item);
      return next;
    });
  }

  function removeSlot(id: string) {
    const slot = slotsRef.current.find((item) => item.id === id);
    if (slot?.kind === "new") URL.revokeObjectURL(slot.preview);
    setSlots((current) => current.filter((item) => item.id !== id));
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const values = {
      name: String(formData.get("name") ?? ""),
      sku: String(formData.get("sku") ?? ""),
      description: String(formData.get("description") ?? ""),
      categoryId: String(formData.get("categoryId") ?? ""),
      newCategory: String(formData.get("newCategory") ?? ""),
      unit: String(formData.get("unit") ?? ""),
      price: String(formData.get("price") ?? ""),
      salePrice: String(formData.get("salePrice") ?? ""),
      minQuantity: String(formData.get("minQuantity") ?? ""),
      active: formData.get("active") === "on",
    };
    const parsed = productFormSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      setFormError(parsed.error.issues[0]?.message ?? "Proverite podatke o proizvodu.");
      return;
    }
    formData.set("active", values.active ? "true" : "false");
    if (product) formData.set("id", product.id);
    setPending(true);
    const result = await saveProductAction(formData);
    setPending(false);
    if (!result.ok) {
      setFormError(result.error ?? "Čuvanje nije uspelo.");
      setErrors(result.fieldErrors ?? {});
      return;
    }
    toast.success(result.message ?? "Proizvod je sačuvan.");
    router.push("/products");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="max-w-2xl space-y-5" noValidate>
      {formError ? (
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {formError}
        </p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="name">Naziv proizvoda</Label>
          <Input id="name" name="name" defaultValue={product?.name} className="mt-1.5" required />
          <FieldError message={errors.name} />
        </div>
        <div>
          <Label htmlFor="sku">Šifra</Label>
          <Input id="sku" name="sku" defaultValue={product?.sku} className="mt-1.5" placeholder="Interna šifra" />
          <FieldError message={errors.sku} />
        </div>
        <div>
          <Label htmlFor="unit">Jedinica mere</Label>
          <Select id="unit" name="unit" defaultValue={product?.unit ?? "komad"} className="mt-1.5">
            {UNITS.map((unit) => (
              <option key={unit.value} value={unit.value}>
                {unit.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="price">Cena po jedinici (RSD)</Label>
          <Input id="price" name="price" defaultValue={product ? formatPriceInput(product.pricePara) : ""} className="mt-1.5" inputMode="decimal" required />
          <FieldError message={errors.price} />
        </div>
        <div>
          <Label htmlFor="salePrice">Akcijska cena (RSD)</Label>
          <Input
            id="salePrice"
            name="salePrice"
            defaultValue={product?.salePricePara ? formatPriceInput(product.salePricePara) : ""}
            className="mt-1.5"
            inputMode="decimal"
            placeholder="Opciono"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            {shop
              ? "Ako je niža od redovne, proizvod ide u sekciju Akcije."
              : "Ako je niža od redovne, kupac plaća ovu cenu."}
          </p>
          <FieldError message={errors.salePrice} />
        </div>
        <div>
          <Label htmlFor="minQuantity">Minimalna količina</Label>
          <Input id="minQuantity" name="minQuantity" defaultValue={product ? String(product.minQuantity).replace(".", ",") : "1"} className="mt-1.5" inputMode="decimal" required />
          <FieldError message={errors.minQuantity} />
        </div>
        <div>
          <Label htmlFor="categoryId">Kategorija</Label>
          <Select id="categoryId" name="categoryId" defaultValue={product?.categoryId ?? ""} className="mt-1.5">
            <option value="">Bez kategorije</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="newCategory">Nova kategorija</Label>
          <Input id="newCategory" name="newCategory" className="mt-1.5" placeholder="Opciono, umesto izbora iznad" />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="description">Opis</Label>
          <Textarea id="description" name="description" defaultValue={product?.description} className="mt-1.5" />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="images">Slike</Label>
          {slots.length ? (
            <ul className="mt-2 grid grid-cols-3 gap-3" aria-label="Slike proizvoda">
              {slots.map((slot, index) => (
                <li key={slot.id} className="min-w-0">
                  <div className="relative">
                    <ProductImage src={slot.kind === "kept" ? slot.url : slot.preview} alt="" className="aspect-[3/2] h-auto w-full" />
                    {index === 0 ? (
                      <span className="pointer-events-none absolute bottom-1 left-1 rounded bg-zinc-950/85 px-1.5 py-0.5 text-[10px] font-medium leading-none text-white">
                        Naslovna
                      </span>
                    ) : null}
                    <button
                      type="button"
                      aria-label={index === 0 ? "Ukloni naslovnu" : "Ukloni"}
                      onClick={() => removeSlot(slot.id)}
                      className="absolute top-1 right-1 inline-flex size-6 items-center justify-center rounded-full bg-zinc-950/85 text-white shadow-sm transition-colors hover:bg-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                    >
                      <X className="size-3.5" aria-hidden="true" />
                    </button>
                  </div>
                  <div className="mt-1 flex gap-1">
                    <button
                      type="button"
                      aria-label="Pomeri napred"
                      title="Pomeri napred"
                      disabled={index === 0}
                      onClick={() => moveSlot(index, -1)}
                      className={moveButtonClass}
                    >
                      <ChevronLeft className="size-3.5" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      aria-label="Pomeri nazad"
                      title="Pomeri nazad"
                      disabled={index === slots.length - 1}
                      onClick={() => moveSlot(index, 1)}
                      className={moveButtonClass}
                    >
                      <ChevronRight className="size-3.5" aria-hidden="true" />
                    </button>
                  </div>
                  {slot.kind === "kept" ? <input type="hidden" name="keepImage" value={slot.url} /> : null}
                  <input type="hidden" name="imageOrder" value={slot.kind === "kept" ? `keep:${slot.url}` : "new"} />
                </li>
              ))}
            </ul>
          ) : null}
          <FileDropzone
            id="images"
            name="images"
            multiple
            accept={IMAGE_FILE_ACCEPT}
            allowedTypes={IMAGE_FILE_TYPES}
            maxBytes={IMAGE_MAX_BYTES}
            maxFiles={Math.max(0, MAX_PRODUCT_IMAGES - keptCount)}
            files={pendingFiles}
            onFilesChange={onFilesChange}
            showFileName={false}
            heading="Prevucite slike ovde"
            releaseHeading="Pustite da dodate slike"
            hint="Do 6 slika. Prva je naslovna. Pomerite slike da promenite redosled. JPG, PNG ili WebP, do 2 MB."
            sizeError={IMAGE_SIZE_ERROR}
            typeError={IMAGE_TYPE_ERROR}
            limitError="Proizvod može imati najviše 6 slika."
          />
        </div>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" name="active" defaultChecked={product?.active ?? true} className="size-4 accent-zinc-950" />
          Proizvod je aktivan i vidljiv kupcima
        </label>
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Čuvanje…" : "Sačuvaj izmene"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.push("/products")}>
          Otkaži
        </Button>
      </div>
    </form>
  );
}
