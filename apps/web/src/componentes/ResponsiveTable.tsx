'use client';

import { ReactNode } from 'react';

interface ResponsiveTableProps {
  children: ReactNode;
  ariaLabel?: string;
  caption?: string;
}

export function ResponsiveTable({ children, ariaLabel, caption }: ResponsiveTableProps) {
  return (
    <div
      className="cartao overflow-x-auto w-full"
      role="region"
      aria-label={ariaLabel}
      aria-live="polite"
    >
      {caption && <p className="sr-only">{caption}</p>}
      {children}
    </div>
  );
}
