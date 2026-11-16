import { AUDIENCES } from "@/lib/constants";
import type { Audience } from "@/lib/data/types";
import { FieldError } from "@/components/ui/fields";

export function AudienceChoice({
  defaultValue = "oba",
  error,
  className,
  onValueChange,
}: {
  defaultValue?: Audience;
  error?: string;
  className?: string;
  onValueChange?: (value: Audience) => void;
}) {
  return (
    <fieldset className={className}>
      <legend className="text-sm font-medium">Kome prodajete</legend>
      <div className="mt-2 space-y-2">
        {AUDIENCES.map((item) => (
          <label key={item.value} className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="audience"
              value={item.value}
              defaultChecked={defaultValue === item.value}
              required
              className="size-4 accent-primary"
              onChange={() => onValueChange?.(item.value)}
            />
            {item.label}
          </label>
        ))}
      </div>
      <FieldError message={error} />
    </fieldset>
  );
}
