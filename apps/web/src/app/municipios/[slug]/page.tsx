import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Kpi } from '@/componentes/Kpi';
import { Secao } from '@/componentes/Secao';
import { SeletorCidade } from '@/componentes/SeletorCidade';
import { TabelaRanking } from '@/componentes/TabelaRanking';
import { BarrasShare } from '@/componentes/graficos/BarrasShare';
import { MapaRJ } from '@/componentes/graficos/MapaRJ';
import { SerieMercado } from '@/componentes/graficos/SerieMercado';
import { TipoAtuacaoPie } from '@/componentes/graficos/TipoAtuacaoPie';
import { lerIndiceMunicipios, lerPerfilMunicipio } from '@/lib/dados';
import type { PerfilMunicipio } from '@/lib/dados';
import { compacto, corVariacao, inteiro, inteiroComSinal, percentual, percentualComSinal } from '@/lib/formato';
import { MARCA } from '@/lib/marca';

/**
 * Rotas geradas no build.
 *
 * Deliberadamente NAO tolera a ausencia de artefatos: com `output: export`,
 * uma lista vazia e tratada pelo Next como generateStaticParams ausente, e o
 * build falha com uma mensagem interna incompreensivel. Deixar `ler...`
 * lancar preserva o erro instrutivo, que diz exatamente qual comando rodar.
 *
 * Por isso os artefatos em public/data/ sao versionados: um clone limpo
 * precisa conseguir compilar.
 */
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
    title: `Provedores de internet em ${perfil.nome} — ${MARCA.ufSigla}`,
    description:
      `Ranking completo dos provedores de banda larga fixa em ${perfil.nome} ` +
      `(${MARCA.ufSigla}): quem lidera, participação de mercado, crescimento, ` +
      `concentração e evolução mensal, segundo dados da Anatel.`,
  };
}

/** Distribuição por tecnologia na competência mais recente do município. */
function Tecnologias({ perfil }: { perfil: PerfilMunicipio }) {
  const ultima = perfil.tecnologia[perfil.tecnologia.length - 1];
  const distribuicao = ultima?.distribuicao ?? {};
  const total = Object.values(distribuicao).reduce((s, v) => s + v, 0);

  if (total === 0) {
    return <p className="cartao p-5 text-sm text-grafite-400">Sem dados de tecnologia.</p>;
  }

  const rotulos: Record<string, string> = {
    FIBRA: 'Fibra óptica', CABO: 'Cabo (HFC)', RADIO: 'Rádio',
    SATELITE: 'Satélite', XDSL: 'xDSL (cobre)', OUTRAS: 'Outras',
  };

  const linhas = Object.entries(distribuicao)
    .sort(([, a], [, b]) => b - a)
    .map(([chave, acessos]) => ({
      nome: rotulos[chave] ?? chave,
      acessos,
      share: (acessos / total) * 100,
    }));

  return (
    <div className="cartao divide-y divide-grafite-800">
      {linhas.map((l) => (
        <div key={l.nome} className="px-4 py-3">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="text-grafite-200">{l.nome}</span>
            <span className="numerico text-grafite-300">
              {inteiro(l.acessos)}{' '}
              <span className="text-xs text-grafite-500">({percentual(l.share, 1)})</span>
            </span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-grafite-800">
            <div className="h-full rounded-full bg-marca-500" style={{ width: `${l.share}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default async function PaginaMunicipio({ params }: Props) {
  const { slug } = await params;
  const perfil = lerPerfilMunicipio(slug);
  if (!perfil) notFound();

  const municipios = lerIndiceMunicipios();
  const cidades = municipios.map((m) => ({
    slug: m.slug, nome: m.nome,
    totalAcessos: m.totalAcessos, numeroProvedores: m.numeroProvedores,
  }));

  const c = perfil.concentracao;
  const lider = perfil.ranking[0];

  // Crescimento e retração locais, derivados do próprio ranking municipal.
  const comparaveis = perfil.ranking.filter((l) => l.variacaoAbsoluta !== null);
  const cresceram = [...comparaveis]
    .sort((a, b) => (b.variacaoAbsoluta ?? 0) - (a.variacaoAbsoluta ?? 0))
    .filter((l) => (l.variacaoAbsoluta ?? 0) > 0)
    .slice(0, 5);
  const recuaram = [...comparaveis]
    .sort((a, b) => (a.variacaoAbsoluta ?? 0) - (b.variacaoAbsoluta ?? 0))
    .filter((l) => (l.variacaoAbsoluta ?? 0) < 0)
    .slice(0, 5);
  const entrantes = perfil.ranking.filter((l) => l.posicaoAnterior === null);

  return (
    <main className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex-1">
          <Link href="/municipios/" className="text-sm text-marca-400 underline-offset-2 hover:underline">
            ← Todos os municípios
          </Link>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-white md:text-3xl">
            {perfil.nome}
          </h1>
          <p className="mt-1 text-sm text-grafite-400">
            {perfil.posicaoNoEstado !== null && (
              <>
                {perfil.posicaoNoEstado}º maior mercado do {MARCA.ufSigla} ·{' '}
              </>
            )}
            {inteiro(perfil.totalMunicipios)} municípios no Estado · IBGE {perfil.codigoIbge}
          </p>
        </div>

        {/* Trocar de cidade permanece acessível, mas não dominante */}
        <SeletorCidade cidades={cidades} slugAtual={slug} />
      </div>

      {/* Tamanho do mercado */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-0.5 flex-1 bg-gradient-to-r from-marca-500 to-transparent" />
          <div className="text-xs font-bold uppercase tracking-wide text-marca-400">Tamanho do Mercado</div>
          <div className="h-0.5 flex-1 bg-gradient-to-l from-marca-500 to-transparent" />
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <Kpi
            rotulo="Total de acessos"
            valor={compacto(c?.totalAcessos)}
            detalhe={`${inteiro(c?.totalAcessos)} acessos`}
            variacao={perfil.variacao12Meses?.percentual ?? null}
            variacaoTexto={`${percentualComSinal(perfil.variacao12Meses?.percentual)} em 12 meses`}
          />
          <Kpi
            rotulo="Provedores ativos"
            valor={inteiro(c?.numeroProvedores)}
            detalhe="com acessos no município"
          />
          <Kpi
            rotulo="Posição estadual"
            valor={perfil.posicaoNoEstado !== null ? perfil.posicaoNoEstado : '—'}
            detalhe={`de ${inteiro(perfil.totalMunicipios)} municípios`}
          />
        </div>
      </div>

      {/* Liderança e concentração */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-0.5 flex-1 bg-gradient-to-r from-marca-500 to-transparent" />
          <div className="text-xs font-bold uppercase tracking-wide text-marca-400">Liderança e Concentração</div>
          <div className="h-0.5 flex-1 bg-gradient-to-l from-marca-500 to-transparent" />
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi
            rotulo="Líder"
            valor={percentual(lider?.marketShare, 1)}
            detalhe={lider?.nome ?? '—'}
            ajuda="Provedor com maior participação (CR1)."
          />
          <Kpi
            rotulo="Top 3"
            valor={percentual(c?.cr3, 1)}
            detalhe="três maiores"
            ajuda="Participação dos 3 maiores provedores."
          />
          <Kpi
            rotulo="Top 5"
            valor={percentual(c?.cr5, 1)}
            detalhe="cinco maiores"
            ajuda="Participação dos 5 maiores provedores."
          />
          <Kpi
            rotulo="HHI"
            valor={inteiro(c?.hhi ? Math.round(c.hhi) : null)}
            detalhe="escala 0–10.000"
            ajuda="Índice de concentração. Não constitui conclusão regulatória."
          />
        </div>
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

      <Secao
        titulo={`${perfil.nome} no Estado`}
        descricao="Compare com os municípios vizinhos — escolha a métrica"
      >
        <div className="cartao p-4">
          <MapaRJ municipios={municipios} destaque={slug} />
        </div>
      </Secao>

      <div className="grid gap-6 lg:grid-cols-3">
        <Secao titulo="Quem mais cresceu" descricao="Acessos ganhos no último mês">
          {cresceram.length > 0 ? (
            <ol className="cartao divide-y divide-grafite-800">
              {cresceram.map((l) => (
                <li key={l.empresaId} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                  <Link href={`/provedores/${l.slug}/`} className="flex-1 truncate text-white underline-offset-2 hover:underline">
                    {l.nome}
                  </Link>
                  <span className="numerico shrink-0 font-medium text-alta">
                    {inteiroComSinal(l.variacaoAbsoluta)}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="cartao p-5 text-sm text-grafite-400">Nenhum provedor cresceu no mês.</p>
          )}
        </Secao>

        <Secao titulo="Quem mais perdeu" descricao="Acessos perdidos no último mês">
          {recuaram.length > 0 ? (
            <ol className="cartao divide-y divide-grafite-800">
              {recuaram.map((l) => (
                <li key={l.empresaId} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                  <Link href={`/provedores/${l.slug}/`} className="flex-1 truncate text-white underline-offset-2 hover:underline">
                    {l.nome}
                  </Link>
                  <span className="numerico shrink-0 font-medium text-baixa">
                    {inteiroComSinal(l.variacaoAbsoluta)}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="cartao p-5 text-sm text-grafite-400">Nenhum provedor recuou no mês.</p>
          )}
        </Secao>

        <Secao titulo="Entradas e saídas" descricao="Movimentação de provedores no mês">
          <div className="cartao divide-y divide-grafite-800">
            {entrantes.length === 0 && perfil.saidas.length === 0 && (
              <p className="p-5 text-sm text-grafite-400">Nenhuma entrada ou saída no mês.</p>
            )}
            {entrantes.slice(0, 5).map((l) => (
              <div key={l.empresaId} className="flex items-center gap-2 px-4 py-2.5 text-sm">
                <span className="shrink-0 rounded bg-alta/20 px-1.5 py-0.5 text-[10px] font-medium text-alta">
                  ENTROU
                </span>
                <Link href={`/provedores/${l.slug}/`} className="flex-1 truncate text-white underline-offset-2 hover:underline">
                  {l.nome}
                </Link>
                <span className="numerico shrink-0 text-xs text-grafite-400">
                  {inteiro(l.acessos)}
                </span>
              </div>
            ))}
            {perfil.saidas.slice(0, 5).map((s) => (
              <div key={s.empresaId} className="flex items-center gap-2 px-4 py-2.5 text-sm">
                <span className="shrink-0 rounded bg-baixa/20 px-1.5 py-0.5 text-[10px] font-medium text-baixa">
                  SAIU
                </span>
                <Link href={`/provedores/${s.slug}/`} className="flex-1 truncate text-grafite-300 underline-offset-2 hover:underline">
                  {s.nome}
                </Link>
                <span className="numerico shrink-0 text-xs text-grafite-500">
                  tinha {inteiro(s.acessosAnteriores)}
                </span>
              </div>
            ))}
          </div>
        </Secao>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Secao titulo="Tecnologia" descricao="Distribuição dos acessos no município" className="lg:col-span-1">
          <Tecnologias perfil={perfil} />
        </Secao>

        <Secao titulo="Tipo de Atuação" descricao="Distribuição de provedores por categoria" className="lg:col-span-1">
          <div className="cartao p-3">
            <TipoAtuacaoPie provedores={perfil.ranking} />
          </div>
        </Secao>

        <Secao
          titulo="Ranking local completo"
          descricao={`${inteiro(perfil.ranking.length)} provedores com acessos em ${perfil.nome}`}
          className="lg:col-span-1"
        >
          <TabelaRanking
            linhas={perfil.ranking.map((l) => ({
              posicao: l.posicao,
              empresaId: l.empresaId,
              slug: l.slug,
              nome: l.nome,
              cnpj: l.cnpj,
              grupoEconomico: l.grupoEconomico,
              tipoAtuacao: l.tipoAtuacao,
              acessos: l.acessos,
              marketShare: l.marketShare,
              posicaoAnterior: l.posicaoAnterior,
              variacaoPosicao: l.variacaoPosicao,
              variacaoAbsoluta: l.variacaoAbsoluta,
              variacaoPercentual: l.variacaoPercentual,
              variacao12Absoluta: l.variacao12Absoluta,
              variacao12Percentual: l.variacao12Percentual,
              // A coluna de municípios não faz sentido dentro de um município.
              municipiosAtendidos: 0,
            }))}
            ocultarMunicipios
          />
        </Secao>
      </div>

      <p className="text-xs text-grafite-500">
        Todos os indicadores desta página são calculados{' '}
        <strong>exclusivamente sobre os acessos registrados em {perfil.nome}</strong>.
        Participação, concentração e ranking referem-se ao mercado local, não ao
        estadual — um provedor pode liderar aqui e ser pequeno no {MARCA.ufSigla}.
      </p>
    </main>
  );
}
