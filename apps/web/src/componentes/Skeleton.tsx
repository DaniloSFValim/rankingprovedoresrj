interface SkeletonProps {
  variant?: 'text' | 'card' | 'chart' | 'table' | 'avatar';
  count?: number;
  className?: string;
}

export function SkeletonText({ count = 3, className = '' }: Omit<SkeletonProps, 'variant'>) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-4 bg-grafite-700 rounded animate-pulse" />
      ))}
    </div>
  );
}

export function SkeletonCard({ className = '' }: Omit<SkeletonProps, 'variant' | 'count'>) {
  return (
    <div className={`cartao p-4 space-y-4 ${className}`}>
      <div className="h-6 bg-grafite-700 rounded w-1/3 animate-pulse" />
      <div className="space-y-2">
        <div className="h-4 bg-grafite-700 rounded animate-pulse" />
        <div className="h-4 bg-grafite-700 rounded w-5/6 animate-pulse" />
      </div>
      <div className="h-20 bg-grafite-700 rounded animate-pulse" />
    </div>
  );
}

export function SkeletonChart({ className = '' }: Omit<SkeletonProps, 'variant' | 'count'>) {
  return (
    <div className={`cartao p-4 space-y-3 ${className}`}>
      <div className="h-6 bg-grafite-700 rounded w-1/4 animate-pulse" />
      <div className="h-64 bg-grafite-700 rounded animate-pulse" />
      <div className="flex gap-2">
        <div className="h-3 bg-grafite-700 rounded flex-1 animate-pulse" />
        <div className="h-3 bg-grafite-700 rounded flex-1 animate-pulse" />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5, className = '' }: { rows?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-12 bg-grafite-700 rounded animate-pulse" />
      ))}
    </div>
  );
}

export function SkeletonAvatar({ className = '' }: Omit<SkeletonProps, 'variant' | 'count'>) {
  return <div className={`w-12 h-12 bg-grafite-700 rounded-full animate-pulse ${className}`} />;
}

export function Skeleton({ variant = 'text', count = 3, className = '' }: SkeletonProps) {
  switch (variant) {
    case 'text':
      return <SkeletonText count={count} className={className} />;
    case 'card':
      return <SkeletonCard className={className} />;
    case 'chart':
      return <SkeletonChart className={className} />;
    case 'table':
      return <SkeletonTable className={className} />;
    case 'avatar':
      return <SkeletonAvatar className={className} />;
    default:
      return <SkeletonText count={count} className={className} />;
  }
}
