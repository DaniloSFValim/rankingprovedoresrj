import { Skeleton } from './Skeleton';

interface LoadingFallbackProps {
  title?: string;
  variant?: 'text' | 'card' | 'chart' | 'table';
  count?: number;
}

export function LoadingFallback({
  title = 'Carregando...',
  variant = 'card',
  count = 3,
}: LoadingFallbackProps) {
  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {title && <p className="text-sm text-grafite-400">{title}</p>}
      {Array.from({ length: Math.max(1, Math.floor(count / (variant === 'chart' ? 2 : 1))) }).map(
        (_, i) => (
          <Skeleton key={i} variant={variant} count={variant === 'text' ? count : 1} />
        ),
      )}
    </div>
  );
}

export function LoadingPage() {
  return (
    <main className="space-y-8">
      <div className="space-y-2">
        <div className="h-8 bg-grafite-700 rounded w-1/3 animate-pulse" />
        <div className="h-4 bg-grafite-700 rounded w-1/2 animate-pulse" />
      </div>
      <LoadingFallback variant="card" count={4} />
      <LoadingFallback variant="chart" />
    </main>
  );
}
