"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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

function useFilePreviews(files: File[]) {
  const [urls, setUrls] = useState<string[]>([]);

  useEffect(() => {
    const next = files.map((file) => URL.createObjectURL(file));
    setUrls(next);
    return () => {
      for (const url of next) URL.revokeObjectURL(url);
    };
  }, [files]);

  return urls.length === files.length ? urls : [];
}

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
  const [keptImages, setKeptImages] = useState(product?.imageUrls ?? []);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const pendingPreviews = useFilePreviews(pendingFiles);

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

  const imageTiles = [
    ...keptImages.map((url, index) => ({
      key: `kept-${index}-${url}`,
      src: url,
      keptUrl: url,
      remove: () => setKeptImages((current) => current.filter((_, itemIndex) => itemIndex !== index)),
    })),
    ...pendingPreviews.map((url, index) => ({
      key: `new-${index}-${pendingFiles[index]?.name ?? ""}-${pendingFiles[index]?.lastModified ?? 0}`,
      src: url,
      keptUrl: null,
      remove: () => setPendingFiles((current) => current.filter((_, itemIndex) => itemIndex !== index)),
    })),
  ];

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
          {imageTiles.length ? (
            <ul className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
              {imageTiles.map((tile, index) => (
                <li key={tile.key} className="relative">
                  <ProductImage src={tile.src} alt="" className="aspect-[3/2] h-auto w-full" />
                  {tile.keptUrl ? <input type="hidden" name="keepImage" value={tile.keptUrl} /> : null}
                  {index === 0 ? (
                    <span className="pointer-events-none absolute bottom-1 left-1 rounded bg-zinc-950/85 px-1.5 py-0.5 text-[10px] font-medium leading-none text-white">
                      Naslovna
                    </span>
                  ) : null}
                  <button
                    type="button"
                    aria-label={index === 0 ? "Ukloni naslovnu" : "Ukloni"}
                    onClick={tile.remove}
                    className="absolute top-1 right-1 inline-flex size-6 items-center justify-center rounded-full bg-zinc-950/85 text-white shadow-sm transition-colors hover:bg-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                  >
                    <X className="size-3.5" aria-hidden="true" />
                  </button>
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
            maxFiles={Math.max(0, MAX_PRODUCT_IMAGES - keptImages.length)}
            files={pendingFiles}
            onFilesChange={setPendingFiles}
            showFileName={false}
            heading="Prevucite slike ovde"
            releaseHeading="Pustite da dodate slike"
            hint="Do 6 slika. Prva je naslovna. JPG, PNG ili WebP, do 2 MB."
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
