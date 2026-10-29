import { FieldError } from "@/components/ui/fields";

export type BuyerKind = "fizicka" | "pravna";

export function BuyerKindChoice({
  value,
  error,
  onChange,
}: {
  value: BuyerKind | "";
  error?: string;
  onChange: (value: BuyerKind) => void;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-medium">Kupujete kao</legend>
      <div className="mt-2 space-y-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="buyerKind"
            value="fizicka"
            checked={value === "fizicka"}
            className="size-4 accent-primary"
            onChange={() => onChange("fizicka")}
          />
          Fizičko lice
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="buyerKind"
            value="pravna"
            checked={value === "pravna"}
            className="size-4 accent-primary"
            onChange={() => onChange("pravna")}
          />
          Pravno lice
        </label>
      </div>
      <FieldError message={error} />
    </fieldset>
  );
}

export function PaymentMethodChoice({ error }: { error?: string }) {
  return (
    <fieldset>
      <legend className="text-sm font-medium">Način plaćanja</legend>
      <div className="mt-2 space-y-2">
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" name="paymentMethod" value="pouzecem" required className="size-4 accent-primary" />
          Plaćanje pouzećem
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" name="paymentMethod" value="kartica" required className="size-4 accent-primary" />
          Karticom
        </label>
      </div>
      <FieldError message={error} />
    </fieldset>
  );
}
