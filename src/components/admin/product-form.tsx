"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { saveProductAction } from "@/lib/actions/catalog";
import { UNITS } from "@/lib/constants";
import type { Category, Product } from "@/lib/data/types";
import { formatPriceInput } from "@/lib/format";
import { fieldErrors, productFormSchema } from "@/lib/validators";
import { ProductImage } from "@/components/catalog/product-image";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label, Select, Textarea } from "@/components/ui/fields";

export function ProductForm({
  product,
  categories,
  shop = false,
}: {
  product?: Product;
  categories: Category[];
  shop?: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");

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
          <Label htmlFor="image">Slika</Label>
          <div className="mt-2 flex items-center gap-3">
            <ProductImage src={product?.imageUrl ?? null} />
            <div className="min-w-0 flex-1">
              <Input id="image" name="image" type="file" accept="image/jpeg,image/png,image/webp" />
              <p className="mt-1 text-xs text-muted-foreground">Opciono. JPG, PNG ili WebP, do 2 MB. Kupci je vide u katalogu.</p>
            </div>
          </div>
          {product?.imageUrl ? (
            <label className="mt-2 flex items-center gap-2 text-sm">
              <input type="checkbox" name="removeImage" className="size-4 accent-zinc-950" />
              Uklonite sliku
            </label>
          ) : null}
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
