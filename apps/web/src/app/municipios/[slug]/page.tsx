import Link from 'next/link';
import { notFound } from 'next/navigation';
import { rotularCompetencia } from '@netrank/core';
import { Kpi } from '@/componentes/Kpi';
import { Secao } from '@/componentes/Secao';
import { BarrasShare } from '@/componentes/graficos/BarrasShare';
import { SerieMercado } from '@/componentes/graficos/SerieMercado';
import { lerIndiceMunicipios, lerPerfilMunicipio } from '@/lib/dados';
import {
  corVariacao, inteiro, inteiroComSinal, percentual, percentualComSinal, setaVariacao,
} from '@/lib/formato';
import { MARCA } from '@/lib/marca';

export function generateStaticParams() {
  return lerIndiceMunicipios().map((m) => ({ slug: m.slug }));
}

/** Next 15 entrega `params` como Promise, inclusive em rotas estaticas. */
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const perfil = lerPerfilMunicipio(slug);
  if (!perfil) return { title: 'Município não encontrado' };
  return {
    title: `Maiores provedores de internet de ${perfil.nome} — ${MARCA.ufSigla}`,
    description:
      `Ranking dos provedores de banda larga fixa em ${perfil.nome} (${MARCA.ufSigla}): ` +
      `líder de mercado, participação, número de provedores e concentração, segundo a Anatel.`,
  };
}

export default async function PaginaMunicipio({ params }: Props) {
  const { slug } = await params;
  const perfil = lerPerfilMunicipio(slug);
  if (!perfil) notFound();

  const c = perfil.concentracao;
  const lider = perfil.ranking[0];

  return (
    <main className="space-y-8">
      <div>
        <Link href="/municipios/" className="text-sm text-marca-400 underline-offset-2 hover:underline">
          ← Municípios
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-white md:text-3xl">
          {perfil.nome} — {MARCA.ufSigla}
        </h1>
        <p className="mt-1 text-sm text-grafite-400">
          Código IBGE {perfil.codigoIbge} · Competência {rotularCompetencia(perfil.competencia)}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi rotulo="Total de acessos" valor={inteiro(c?.totalAcessos)} />
        <Kpi rotulo="Provedores" valor={inteiro(c?.numeroProvedores)} />
        <Kpi
          rotulo="Líder"
          valor={percentual(lider?.marketShare, 1)}
          detalhe={lider?.nome ?? '—'}
        />
        <Kpi
          rotulo="HHI municipal"
          valor={inteiro(c?.hhi ? Math.round(c.hhi) : null)}
          detalhe="escala 0–10.000"
          ajuda="Indicador estatístico de concentração do mercado local."
        />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi rotulo="CR1" valor={percentual(c?.cr1, 1)} />
        <Kpi rotulo="CR3" valor={percentual(c?.cr3, 1)} />
        <Kpi rotulo="CR5" valor={percentual(c?.cr5, 1)} />
        <Kpi rotulo="CR10" valor={percentual(c?.cr10, 1)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Secao titulo="Participação de mercado" descricao="Top 10 provedores do município">
          <div className="cartao p-3">
            <BarrasShare
              itens={perfil.ranking.slice(0, 10).map((l) => ({ nome: l.nome, marketShare: l.marketShare }))}
            />
          </div>
        </Secao>

        <Secao titulo="Evolução" descricao="Acessos e provedores ativos por mês">
          <div className="cartao p-3">
            <SerieMercado
              serie={perfil.serie.map((p) => ({
                competencia: p.competencia,
                totalAcessos: p.totalAcessos,
                numeroProvedores: p.numeroProvedores,
                hhi: p.hhi,
                cr5: null,
              }))}
            />
          </div>
        </Secao>
      </div>

      <Secao titulo="Ranking local" descricao={`${perfil.ranking.length} provedores com acessos no município`}>
        <div className="cartao overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-grafite-800 text-left">
                <th className="w-12 px-3 py-2.5 text-right font-medium text-grafite-400">#</th>
                <th className="px-3 py-2.5 font-medium text-grafite-400">Provedor</th>
                <th className="px-3 py-2.5 text-right font-medium text-grafite-400">Acessos</th>
                <th className="px-3 py-2.5 text-right font-medium text-grafite-400">Participação</th>
                <th className="px-3 py-2.5 text-right font-medium text-grafite-400">Var. mensal</th>
              </tr>
            </thead>
            <tbody>
              {perfil.ranking.map((l) => (
                <tr key={l.empresaId} className="border-b border-grafite-800/60 last:border-0 hover:bg-grafite-800/40">
                  <td className="numerico px-3 py-2.5 text-right font-semibold text-grafite-300">
                    {l.posicao}
                    {l.variacaoPosicao !== null && l.variacaoPosicao !== 0 && (
                      <span className={`ml-1 text-[10px] ${corVariacao(l.variacaoPosicao)}`}>
                        {setaVariacao(l.variacaoPosicao)}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <Link href={`/provedores/${l.slug}/`} className="font-medium text-white underline-offset-2 hover:underline">
                      {l.nome}
                    </Link>
                  </td>
                  <td className="numerico px-3 py-2.5 text-right text-white">{inteiro(l.acessos)}</td>
                  <td className="numerico px-3 py-2.5 text-right text-grafite-200">{percentual(l.marketShare, 2)}</td>
                  <td className={`numerico px-3 py-2.5 text-right ${corVariacao(l.variacaoAbsoluta)}`}>
                    {inteiroComSinal(l.variacaoAbsoluta)}
                    <div className="text-[11px] opacity-70">{percentualComSinal(l.variacaoPercentual)}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Secao>
    </main>
  );
}
