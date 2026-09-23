import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Kpi } from '@/componentes/Kpi';
import { Secao } from '@/componentes/Secao';
import { SerieProvedor, TerritorioProvedor } from '@/componentes/graficos/SerieProvedor';
import { GrafikoPosicao } from '@/componentes/graficos/GrafikoPosicao';
import { lerIndiceProvedores, lerPerfilProvedor } from '@/lib/dados';
import {
  cnpjFormatado,
  compacto,
  corVariacao,
  dataBr,
  inteiro,
  inteiroComSinal,
  percentual,
  percentualComSinal,
} from '@/lib/formato';
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
  return lerIndiceProvedores().map((p) => ({ slug: p.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const perfil = lerPerfilProvedor(slug);
  if (!perfil) return { title: 'Provedor não encontrado' };
  return {
    title: `${perfil.nome} — acessos, market share e municípios no ${MARCA.ufSigla}`,
    description:
      `Perfil de ${perfil.nome} no mercado de banda larga fixa do ${MARCA.uf}: ` +
      `posição no ranking, número de acessos, participação de mercado, evolução ` +
      `histórica e municípios onde atua, segundo a Anatel.`,
  };
}

export default async function PaginaProvedor({ params }: Props) {
  const { slug } = await params;
  const perfil = lerPerfilProvedor(slug);
  if (!perfil) notFound();

  const liderados = perfil.presenca.filter((p) => p.lidera);
  const receita = perfil.receita ?? null;

  return (
    <main className="space-y-8">
      <div>
        <Link href="/provedores/" className="text-sm text-marca-400 underline-offset-2 hover:underline">
          ← Provedores
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-white md:text-3xl">
          {perfil.nome}
        </h1>
        <div className="mt-1 space-y-0.5 text-sm text-grafite-400">
          <p>
            {perfil.grupoEconomico
              ? `Grupo econômico: ${perfil.grupoEconomico}`
              : 'Grupo econômico não informado na fonte'}
          </p>
          {perfil.cnpj && (
            <p>
              CNPJ: <span className="font-mono text-grafite-300">{cnpjFormatado(perfil.cnpj)}</span>
            </p>
          )}
        </div>
      </div>

      {receita?.situacao && receita.situacao !== 'ATIVA' && (
        <div className="rounded-lg border border-baixa/40 bg-baixa/10 px-4 py-3 text-sm text-grafite-200">
          <strong className="text-baixa">CNPJ com situação {receita.situacao} na Receita Federal</strong>
          {receita.dataSituacao && ` desde ${dataBr(receita.dataSituacao)}`}. A Anatel registra{' '}
          {inteiro(perfil.acessos)} acessos desta prestadora na competência mais recente.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi rotulo={`Posição no ${MARCA.ufSigla}`} valor={`${perfil.posicao}º`} />
        <Kpi
          rotulo="Acessos"
          valor={compacto(perfil.acessos)}
          detalhe={`${inteiro(perfil.acessos)} acessos`}
          variacao={perfil.variacaoMensal.percentual}
          variacaoTexto={`${percentualComSinal(perfil.variacaoMensal.percentual)} no mês`}
        />
        <Kpi rotulo="Market share" valor={percentual(perfil.marketShare, 2)} detalhe="do mercado estadual" />
        <Kpi
          rotulo="Crescimento 12 meses"
          valor={percentualComSinal(perfil.variacao12Meses.percentual)}
          detalhe={`${inteiroComSinal(perfil.variacao12Meses.absoluta)} acessos`}
          variacao={perfil.variacao12Meses.percentual}
          variacaoTexto={`${inteiroComSinal(perfil.variacao12Meses.absoluta)} acessos`}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi rotulo="Municípios atendidos" valor={inteiro(perfil.municipiosAtendidos)} />
        <Kpi
          rotulo="Municípios liderados"
          valor={inteiro(perfil.municipiosLiderados)}
          detalhe={
            perfil.municipiosAtendidos > 0
              ? `${percentual((perfil.municipiosLiderados / perfil.municipiosAtendidos) * 100, 0)} de onde atua`
              : undefined
          }
        />
        <Kpi
          rotulo="Var. mensal"
          valor={inteiroComSinal(perfil.variacaoMensal.absoluta)}
          detalhe="acessos no mês"
          variacao={perfil.variacaoMensal.absoluta}
          variacaoTexto={percentualComSinal(perfil.variacaoMensal.percentual)}
        />
        <Kpi
          rotulo="Melhor posição local"
          valor={perfil.presenca.length > 0 ? `${Math.min(...perfil.presenca.map((p) => p.posicaoLocal))}º` : '—'}
          detalhe="entre os municípios onde atua"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Secao titulo="Evolução de acessos" descricao="Número de acessos ao longo do tempo">
          <div className="cartao p-3">
            <SerieProvedor serie={perfil.serie} />
          </div>
        </Secao>

        <Secao titulo="Posição no ranking" descricao="Variação de posição no ranking estadual, mês a mês">
          <div className="cartao p-3">
            <GrafikoPosicao serie={perfil.serie} />
          </div>
        </Secao>
      </div>

      <Secao titulo="Expansão territorial" descricao="Municípios atendidos e liderados ao longo do tempo">
        <div className="cartao p-3">
          <TerritorioProvedor territorio={perfil.territorio} />
        </div>
      </Secao>

      {liderados.length > 0 && (
        <Secao titulo="Municípios onde lidera" descricao={`${liderados.length} município(s)`}>
          <div className="flex flex-wrap gap-2">
            {liderados.map((p) => (
              <Link
                key={p.codigoIbge}
                href={`/municipios/${p.slug}/`}
                className="rounded-lg border border-alta/40 bg-alta/10 px-3 py-1.5 text-sm text-alta transition hover:bg-alta/20"
              >
                {p.nome}{' '}
                <span className="numerico text-xs opacity-70">
                  {percentual(p.marketShareLocal, 0)}
                </span>
              </Link>
            ))}
          </div>
        </Secao>
      )}

      <Secao titulo="Presença municipal" descricao="Municípios com acessos registrados na competência">
        <div className="cartao overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-grafite-800 text-left">
                <th className="px-3 py-2.5 font-medium text-grafite-400">Município</th>
                <th className="px-3 py-2.5 text-right font-medium text-grafite-400">Acessos</th>
                <th className="px-3 py-2.5 text-right font-medium text-grafite-400">Part. local</th>
                <th className="px-3 py-2.5 text-right font-medium text-grafite-400">Posição local</th>
              </tr>
            </thead>
            <tbody>
              {perfil.presenca.map((p) => (
                <tr key={p.codigoIbge} className="border-b border-grafite-800/60 last:border-0 hover:bg-grafite-800/40">
                  <td className="px-3 py-2.5">
                    <Link href={`/municipios/${p.slug}/`} className="font-medium text-white underline-offset-2 hover:underline">
                      {p.nome}
                    </Link>
                    {p.lidera && (
                      <span className="ml-2 rounded bg-alta/20 px-1.5 py-0.5 text-[10px] font-medium text-alta">
                        LÍDER
                      </span>
                    )}
                  </td>
                  <td className="numerico px-3 py-2.5 text-right text-white">{inteiro(p.acessos)}</td>
                  <td className="numerico px-3 py-2.5 text-right text-grafite-200">
                    {percentual(p.marketShareLocal, 2)}
                  </td>
                  <td className={`numerico px-3 py-2.5 text-right ${p.lidera ? 'text-alta' : 'text-grafite-300'}`}>
                    {p.posicaoLocal}º
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Secao>

      {receita && (
        <Secao
          titulo="Cadastro na Receita Federal"
          descricao={`Dados abertos do CNPJ, consultados em ${dataBr(receita.consultadoEm)}`}
        >
          <dl className="cartao grid gap-x-6 gap-y-3 p-4 text-sm sm:grid-cols-2">
            <Campo rotulo="Razão social" valor={receita.razaoSocial} />
            <Campo rotulo="Nome fantasia" valor={receita.nomeFantasia} />
            <Campo
              rotulo="Situação cadastral"
              valor={
                receita.situacao &&
                `${receita.situacao}${receita.dataSituacao ? ` desde ${dataBr(receita.dataSituacao)}` : ''}`
              }
              destaque={receita.situacao !== null && receita.situacao !== 'ATIVA'}
            />
            <Campo rotulo="Início de atividade" valor={receita.dataAbertura && dataBr(receita.dataAbertura)} />
            <Campo rotulo="Porte" valor={receita.porte} />
            <Campo rotulo="Natureza jurídica" valor={receita.naturezaJuridica} />
            <Campo
              rotulo="Atividade principal (CNAE)"
              valor={
                receita.cnaePrincipal &&
                [receita.cnaePrincipal.codigo, receita.cnaePrincipal.descricao].filter(Boolean).join(' · ')
              }
            />
            <Campo
              rotulo="Sede"
              valor={[receita.municipio, receita.uf].filter(Boolean).join(' / ') || null}
            />
          </dl>
        </Secao>
      )}
    </main>
  );
}

function Campo({ rotulo, valor, destaque = false }: { rotulo: string; valor: string | null; destaque?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-grafite-500">{rotulo}</dt>
      <dd className={destaque ? 'font-medium text-baixa' : 'text-grafite-200'}>{valor ?? 'n/d'}</dd>
    </div>
  );
}
