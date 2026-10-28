import Link from "next/link";

export default function SupplierNotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-4">
      <h1 className="text-2xl font-semibold">Dobavljač nije pronađen</h1>
      <p className="mt-2 text-sm text-muted-foreground">Proverite link koji ste dobili od firme.</p>
      <Link href="/" className="mt-6 text-sm font-medium underline-offset-2 hover:underline">
        Početna
      </Link>
    </main>
  );
}
