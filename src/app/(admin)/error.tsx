"use client";

export default function AdminError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="rounded-lg border border-border bg-card px-6 py-10">
      <h1 className="text-lg font-semibold">Došlo je do greške</h1>
      <p className="mt-2 text-sm text-muted-foreground">Podaci trenutno nisu učitani. Pokušajte ponovo.</p>
      <button type="button" onClick={reset} className="mt-4 h-10 cursor-pointer rounded-[10px] bg-[#111111] px-3 text-sm font-bold text-white hover:bg-[#333333]">
        Pokušaj ponovo
      </button>
    </div>
  );
}
