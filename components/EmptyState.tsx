export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="text-center py-20">
      <p className="font-display text-5xl text-muted-2 mb-3 uppercase tracking-[0.5px]">—</p>
      <p className="text-ink font-semibold">{title}</p>
      {description && <p className="text-muted text-sm mt-2 max-w-md mx-auto">{description}</p>}
    </div>
  );
}
