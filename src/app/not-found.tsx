import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-4">
      <p className="text-sm text-muted-foreground">404</p>
      <h1 className="mt-2 text-2xl font-semibold">Stranica nije pronađena</h1>
      <p className="mt-2 text-sm text-muted-foreground">Proverite adresu ili se vratite na početak.</p>
      <Link href="/" className="mt-6 text-sm font-medium underline-offset-2 hover:underline">
        Početna
      </Link>
    </main>
  );
}
