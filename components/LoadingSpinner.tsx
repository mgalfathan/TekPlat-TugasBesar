export function LoadingSpinner({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="w-8 h-8 border-2 border-lime border-t-transparent rounded-full animate-spin" />
      <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted">{message}</p>
    </div>
  );
}
