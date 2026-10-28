export default function Loading() {
  return (
    <div className="space-y-4" aria-hidden="true">
      <div className="h-8 w-48 animate-pulse rounded-md bg-zinc-200" />
      <div className="grid gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-24 animate-pulse rounded-lg bg-zinc-200" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-lg bg-zinc-200" />
    </div>
  );
}
