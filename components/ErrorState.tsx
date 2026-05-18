interface Props { message: string; onRetry?: () => void }
export default function ErrorState({ message, onRetry }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-4xl mb-3">⚠️</div>
      <p className="text-red-400 font-semibold mb-1">Something went wrong</p>
      <p className="text-gray-500 text-sm mb-4">{message}</p>
      {onRetry && <button onClick={onRetry} className="px-4 py-2 bg-[#00d4aa]/20 text-[#00d4aa] rounded-lg text-sm hover:bg-[#00d4aa]/30 transition">Try again</button>}
    </div>
  );
}
