"use client";

export default function AdminError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="rounded-lg border border-border bg-card px-6 py-10">
      <h1 className="text-lg font-semibold">Došlo je do greške</h1>
      <p className="mt-2 text-sm text-muted-foreground">Podaci trenutno nisu učitani. Pokušajte ponovo.</p>
      <button type="button" onClick={reset} className="mt-4 h-10 cursor-pointer rounded-[10px] bg-navy px-3 text-sm font-medium text-white hover:bg-navy-hover">
        Pokušaj ponovo
      </button>
    </div>
  );
}
