import type { ReactNode } from 'react';
import Link from 'next/link';

interface Props {
  titulo: string;
  descricao?: string;
  /** Link "ver tudo" para o módulo completo. */
  href?: string;
  hrefRotulo?: string;
  children: ReactNode;
  className?: string;
}

export function Secao({ titulo, descricao, href, hrefRotulo, children, className }: Props) {
  return (
    <section className={className}>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div>
          <h2 className="text-xl font-semibold tracking-[-0.01em] text-tinta">{titulo}</h2>
          {descricao && <p className="mt-1 text-sm text-grafite-400">{descricao}</p>}
        </div>
        {href && (
          <Link
            href={href}
            className="shrink-0 text-sm font-medium text-marca-400 underline decoration-marca-700 underline-offset-4 hover:decoration-marca-400"
          >
            {hrefRotulo ?? 'Ver tudo'}
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
