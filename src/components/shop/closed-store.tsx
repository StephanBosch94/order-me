import Link from "next/link";

import { Logo } from "@/components/brand/logo";

export function ClosedStore({ name, message }: { name: string; message: string }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center px-4 py-16">
      <Logo />
      <h1 className="mt-8 text-2xl font-semibold tracking-tight">{name}</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{message}</p>
      <Link href="/" className="mt-6 text-sm font-medium underline-offset-2 hover:underline">
        Početna
      </Link>
    </main>
  );
}
