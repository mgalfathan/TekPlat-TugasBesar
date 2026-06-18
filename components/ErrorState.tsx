interface Props { message: string; onRetry?: () => void }
export default function ErrorState({ message, onRetry }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="font-display text-5xl text-loss mb-3 uppercase tracking-[0.5px]">!</div>
      <p className="text-loss font-semibold mb-1">Something went wrong</p>
      <p className="text-muted text-sm mb-4">{message}</p>
      {onRetry && <button onClick={onRetry} className="px-4 py-2 font-mono text-xs font-bold uppercase tracking-[0.06em] bg-[rgba(200,242,58,0.12)] text-lime rounded-[8px] hover:bg-[rgba(200,242,58,0.2)] transition">Try again</button>}
    </div>
  );
}
