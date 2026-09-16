import Link from 'next/link';
import { Kpi } from '@/componentes/Kpi';
import { Secao } from '@/componentes/Secao';
import { MapaRJ } from '@/componentes/graficos/MapaRJ';
import { lerIndiceMunicipios, lerKpis } from '@/lib/dados';
import { corVariacao, inteiro, percentual, percentualComSinal } from '@/lib/formato';
import { MARCA } from '@/lib/marca';

export const metadata = {
  title: `Ranking dos municípios do ${MARCA.uf} em banda larga fixa`,
  description:
    `Municípios do Estado do ${MARCA.uf} por número de acessos de banda larga fixa, ` +
    `quantidade de provedores, líder local e concentração de mercado.`,
};

export default function PaginaMunicipios() {
  const municipios = lerIndiceMunicipios();
  const kpis = lerKpis();

  const maisProvedores = [...municipios].sort((a, b) => b.numeroProvedores - a.numeroProvedores)[0];
  const maisConcentrado = [...municipios]
    .filter((m) => m.hhi !== null)
    .sort((a, b) => (b.hhi ?? 0) - (a.hhi ?? 0))[0];
  const maiorCrescimento = [...municipios]
    .filter((m) => m.variacao12Meses?.percentual !== null && m.variacao12Meses !== null)
    .sort((a, b) => (b.variacao12Meses?.percentual ?? 0) - (a.variacao12Meses?.percentual ?? 0))[0];

  return (
    <main className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
          Municípios do {MARCA.ufSigla}
        </h1>
        <p className="mt-1 text-sm text-grafite-400">
          {inteiro(municipios.length)} municípios com acessos registrados
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi rotulo="Municípios analisados" valor={inteiro(municipios.length)} />
        <Kpi
          rotulo="Mais provedores"
          valor={inteiro(maisProvedores?.numeroProvedores)}
          detalhe={maisProvedores?.nome ?? '—'}
        />
        <Kpi
          rotulo="Maior HHI"
          valor={inteiro(maisConcentrado?.hhi ? Math.round(maisConcentrado.hhi) : null)}
          detalhe={maisConcentrado?.nome ?? '—'}
          ajuda="Município com maior concentração estatística de mercado. Indicador objetivo, sem juízo de valor."
        />
        <Kpi
          rotulo="Maior crescimento 12m"
          valor={percentualComSinal(maiorCrescimento?.variacao12Meses?.percentual)}
          detalhe={maiorCrescimento?.nome ?? '—'}
        />
      </div>

      <Secao
        titulo="Mapa da banda larga no RJ"
        descricao="Distribuição do mercado pelos municípios do Estado — escolha a métrica"
      >
        <div className="cartao p-4">
          <MapaRJ municipios={municipios} />
        </div>
      </Secao>

      <Secao titulo="Ranking dos municípios" descricao="Ordenado por total de acessos">
        <div className="cartao overflow-x-auto">
          <table className="w-full min-w-[840px] text-sm">
            <thead>
              <tr className="border-b border-grafite-800 text-left">
                <th className="w-12 px-3 py-2.5 text-right font-medium text-grafite-400">#</th>
                <th className="px-3 py-2.5 font-medium text-grafite-400">Município</th>
                <th className="px-3 py-2.5 text-right font-medium text-grafite-400">Acessos</th>
                <th className="px-3 py-2.5 text-right font-medium text-grafite-400">Var. 12m</th>
                <th className="px-3 py-2.5 text-right font-medium text-grafite-400">Provedores</th>
                <th className="px-3 py-2.5 font-medium text-grafite-400">Líder</th>
                <th className="px-3 py-2.5 text-right font-medium text-grafite-400">Part. líder</th>
                <th className="px-3 py-2.5 text-right font-medium text-grafite-400">CR3</th>
                <th className="px-3 py-2.5 text-right font-medium text-grafite-400">HHI</th>
              </tr>
            </thead>
            <tbody>
              {municipios.map((m, indice) => (
                <tr key={m.codigoIbge} className="border-b border-grafite-800/60 last:border-0 hover:bg-grafite-800/40">
                  <td className="numerico px-3 py-2.5 text-right text-grafite-400">{indice + 1}</td>
                  <td className="px-3 py-2.5">
                    <Link href={`/municipios/${m.slug}/`} className="font-medium text-white underline-offset-2 hover:underline">
                      {m.nome}
                    </Link>
                  </td>
                  <td className="numerico px-3 py-2.5 text-right text-white">{inteiro(m.totalAcessos)}</td>
                  <td className={`numerico px-3 py-2.5 text-right ${corVariacao(m.variacao12Meses?.percentual)}`}>
                    {percentualComSinal(m.variacao12Meses?.percentual)}
                  </td>
                  <td className="numerico px-3 py-2.5 text-right text-grafite-300">{inteiro(m.numeroProvedores)}</td>
                  <td className="px-3 py-2.5 text-grafite-200">{m.liderNome ?? '—'}</td>
                  <td className="numerico px-3 py-2.5 text-right text-grafite-200">{percentual(m.liderMarketShare, 1)}</td>
                  <td className="numerico px-3 py-2.5 text-right text-grafite-300">{percentual(m.cr3, 1)}</td>
                  <td className="numerico px-3 py-2.5 text-right text-grafite-300">
                    {inteiro(m.hhi ? Math.round(m.hhi) : null)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Secao>

      <p className="text-xs text-grafite-500">
        CR3 e HHI são indicadores estatísticos de concentração. Um CR3 alto em
        município com poucos provedores não significa o mesmo que em município com
        muitos — leia sempre junto com a coluna de provedores.
      </p>
    </main>
  );
}
