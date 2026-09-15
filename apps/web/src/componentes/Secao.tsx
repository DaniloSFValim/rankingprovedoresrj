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
      <div className="mb-3 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">{titulo}</h2>
          {descricao && <p className="mt-0.5 text-sm text-grafite-400">{descricao}</p>}
        </div>
        {href && (
          <Link
            href={href}
            className="shrink-0 text-sm text-marca-400 underline-offset-2 hover:underline"
          >
            {hrefRotulo ?? 'Ver tudo'} →
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
