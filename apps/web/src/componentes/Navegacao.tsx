import Link from 'next/link';
import { rotularCompetencia } from '@netrank/core';
import { SeletorCidadeNav, type CidadeOpcao } from '@/componentes/SeletorCidade';
import { BuscaAvancada, type ItemBusca } from '@/componentes/BuscaAvancada';
import type { Meta } from '@/lib/dados';
import { MARCA } from '@/lib/marca';

const ITENS = [
  { href: '/', rotulo: 'Visão geral' },
  { href: '/ranking/', rotulo: 'Ranking' },
  { href: '/crescimento/', rotulo: 'Crescimento' },
  { href: '/municipios/', rotulo: 'Municípios' },
  { href: '/provedores/', rotulo: 'Provedores' },
  { href: '/metodologia/', rotulo: 'Metodologia' },
  { href: '/sobre/', rotulo: 'Sobre' },
] as const;

export function Navegacao({ meta, cidades, itensBusca = [] }: { meta: Meta; cidades: CidadeOpcao[]; itensBusca?: ItemBusca[] }) {
  return (
    <header className="sticky top-0 z-30 border-b border-grafite-700 bg-grafite-950/95 backdrop-blur">
      {/* Institutional bar */}
      <div className="border-b border-grafite-800/50 bg-grafite-950/60 px-4 py-2 text-xs text-grafite-400">
        <div className="mx-auto max-w-7xl">
          <span className="font-semibold text-grafite-300">Prefeitura de Niterói</span>
          {' — '}
          <span>Secretaria Municipal de Conservação e Serviços Públicos (Seconser)</span>
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-4">
        <Link href="/" className="flex items-center gap-2">
          <svg className="w-6 h-6 text-marca-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8Z" />
          </svg>
          <div className="flex flex-col gap-0.5">
            <span className="text-xl font-bold tracking-tight text-white">{MARCA.nome}</span>
            <span className="hidden text-[10px] text-grafite-500 lg:inline">
              Plataforma de Monitoramento de Mercado
            </span>
          </div>
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

        <div className="ml-auto flex w-full flex-col items-end gap-4 md:w-auto md:flex-row">
          {itensBusca.length > 0 && (
            <div className="w-full md:w-80">
              <BuscaAvancada itens={itensBusca} placeholder="Buscar..." />
            </div>
          )}
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
