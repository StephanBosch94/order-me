import { signInProductionAccount, type ProductionLoginChoice } from "@/lib/actions/production-login";

export function ProductionAccounts({
  accounts,
  nextPath = "",
}: {
  accounts: ProductionLoginChoice[];
  nextPath?: string;
}) {
  if (accounts.length === 0) return null;
  return (
    <div className="mt-6">
      <p className="text-sm font-medium">Prijavite se bez registracije</p>
      <div className="mt-2 grid gap-2">
        {accounts.map((account) => (
          <form key={account.email} action={signInProductionAccount}>
            <input type="hidden" name="email" value={account.email} />
            <input type="hidden" name="next" value={nextPath} />
            <button
              type="submit"
              className="w-full cursor-pointer rounded-md border border-border bg-card px-3 py-2 text-left hover:bg-zinc-50"
            >
              <span className="flex items-start justify-between gap-3">
                <span className="block text-sm font-medium">{account.name}</span>
                <span className="shrink-0 text-sm text-muted-foreground">{account.roleLabel}</span>
              </span>
              <span className="mt-1 block text-xs text-muted-foreground">{account.shop}</span>
              <span className="mt-2 block text-xs">
                <span className="text-muted-foreground">Email </span>
                {account.email}
              </span>
              <span className="block text-xs">
                <span className="text-muted-foreground">Lozinka </span>
                {account.password}
              </span>
            </button>
          </form>
        ))}
      </div>
    </div>
  );
}
