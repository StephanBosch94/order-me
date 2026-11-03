import { FieldError } from "@/components/ui/fields";
import type { Audience } from "@/lib/data/types";

export type BuyerKind = "fizicka" | "pravna";

export function showsGuestPartySwitch(audience: Audience, buyer: unknown) {
  return audience === "oba" && !buyer;
}

export function checkoutParty(audience: Audience, accountParty: BuyerKind | null, guestParty: BuyerKind): BuyerKind {
  if (audience === "fizicka") return "fizicka";
  if (audience === "pravna") return "pravna";
  return accountParty ?? guestParty;
}

export function BuyerKindChoice({
  value,
  error,
  onChange,
  legend = "Kupujete kao",
}: {
  value: BuyerKind | "";
  error?: string;
  onChange: (value: BuyerKind) => void;
  legend?: string;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-medium">{legend}</legend>
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

export function PaymentMethodChoice({
  error,
  value,
  onChange,
}: {
  error?: string;
  value?: "" | "pouzecem" | "ips";
  onChange?: (value: "pouzecem" | "ips") => void;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-medium">Način plaćanja</legend>
      <div className="mt-2 space-y-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="paymentMethod"
            value="pouzecem"
            required
            className="size-4 accent-primary"
            checked={onChange ? value === "pouzecem" : undefined}
            onChange={() => onChange?.("pouzecem")}
          />
          Plaćanje pouzećem
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="paymentMethod"
            value="ips"
            required
            className="size-4 accent-primary"
            checked={onChange ? value === "ips" : undefined}
            onChange={() => onChange?.("ips")}
          />
          Plaćanje IPS-om
        </label>
      </div>
      <FieldError message={error} />
    </fieldset>
  );
}
