export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="text-center py-20">
      <p className="text-4xl mb-4">📭</p>
      <p className="text-slate-300 font-medium">{title}</p>
      {description && <p className="text-slate-500 text-sm mt-2">{description}</p>}
    </div>
  );
}
