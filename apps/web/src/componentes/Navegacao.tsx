import Link from 'next/link';
import { rotularCompetencia } from '@netrank/core';
import { SeletorCidadeNav, type CidadeOpcao } from '@/componentes/SeletorCidade';
import type { Meta } from '@/lib/dados';
import { MARCA } from '@/lib/marca';

const ITENS = [
  { href: '/', rotulo: 'Visão geral' },
  { href: '/ranking/', rotulo: 'Ranking' },
  { href: '/corrida/', rotulo: 'Corrida' },
  { href: '/crescimento/', rotulo: 'Crescimento' },
  { href: '/municipios/', rotulo: 'Municípios' },
  { href: '/provedores/', rotulo: 'Provedores' },
  { href: '/metodologia/', rotulo: 'Metodologia' },
] as const;

export function Navegacao({ meta, cidades }: { meta: Meta; cidades: CidadeOpcao[] }) {
  return (
    <header className="sticky top-0 z-30 border-b border-grafite-800 bg-grafite-950/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="text-lg font-bold tracking-tight text-white">{MARCA.nome}</span>
          <span className="hidden text-[11px] text-grafite-500 lg:inline">
            {MARCA.subtitulo}
          </span>
        </Link>

        {/* A rolagem horizontal existe para caber no celular. No desktop ela
            criava uma barra de rolagem visivel logo apos o ultimo item. */}
        <nav className="-mx-1 order-3 w-full overflow-x-auto md:order-none md:mx-0 md:w-auto md:overflow-visible" aria-label="Navegação principal">
          <ul className="flex gap-1 whitespace-nowrap">
            {ITENS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="rounded-md px-3 py-2 text-sm text-grafite-300 transition hover:bg-grafite-800 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-marca-400 min-h-10 inline-flex items-center"
                >
                  {item.rotulo}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-4">
          <SeletorCidadeNav cidades={cidades} />
          <div className="hidden text-right sm:block">
            <div className="rotulo">Competência</div>
            <div className="numerico text-sm font-semibold text-marca-300">
              {rotularCompetencia(meta.competenciaAtual)}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
