import Link from 'next/link';
import { rotularCompetencia } from '@netrank/core';
import { SeletorCidade, type CidadeOpcao } from '@/componentes/SeletorCidade';
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

        <nav className="-mx-1 order-3 w-full overflow-x-auto md:order-none md:mx-0 md:w-auto">
          <ul className="flex gap-1 whitespace-nowrap">
            {ITENS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="rounded-md px-2.5 py-1.5 text-sm text-grafite-300 transition hover:bg-grafite-800 hover:text-white"
                >
                  {item.rotulo}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-4">
          <SeletorCidade cidades={cidades} />
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
