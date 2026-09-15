import Link from 'next/link';
import { rotularCompetencia } from '@netrank/core';
import { lerIndiceProvedores, lerKpis } from '@/lib/dados';
import { inteiro, percentual } from '@/lib/formato';
import { MARCA } from '@/lib/marca';

export const metadata = {
  title: `Provedores de banda larga fixa do ${MARCA.uf}`,
  description:
    `Lista completa dos provedores de banda larga fixa com acessos registrados no ` +
    `Estado do ${MARCA.uf}, com participação de mercado e presença municipal.`,
};

export default function PaginaProvedores() {
  const provedores = lerIndiceProvedores();
  const kpis = lerKpis();

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
          Provedores do {MARCA.ufSigla}
        </h1>
        <p className="mt-1 text-sm text-grafite-400">
          {inteiro(provedores.length)} provedores com acessos em{' '}
          {rotularCompetencia(kpis.competencia)}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {provedores.map((p) => (
          <Link
            key={p.id}
            href={`/provedores/${p.slug}/`}
            className="cartao group p-4 transition hover:border-marca-700 hover:bg-grafite-800/60"
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="numerico text-sm font-semibold text-marca-400">{p.posicao}º</span>
              <span className="numerico text-xs text-grafite-400">
                {percentual(p.marketShare, 2)}
              </span>
            </div>
            <div className="mt-1 truncate font-medium text-white group-hover:text-marca-200" title={p.nome}>
              {p.nome}
            </div>
            <div className="numerico mt-1 text-sm text-grafite-300">
              {inteiro(p.acessos)} acessos
            </div>
            <div className="mt-0.5 text-xs text-grafite-500">
              {inteiro(p.municipiosAtendidos)} municípios
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
