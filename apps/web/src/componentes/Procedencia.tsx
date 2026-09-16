import { rotularCompetencia } from '@netrank/core';
import type { Meta } from '@/lib/dados';
import { MARCA } from '@/lib/marca';

/**
 * Faixa de aviso de dados demonstrativos (§48).
 *
 * Deliberadamente impossível de ignorar: fica no topo de toda página, em
 * contraste alto, enquanto a flag estiver ligada nos artefatos.
 */
export function FaixaDemonstrativo({ meta }: { meta: Meta }) {
  if (!meta.procedencia.dadosDemonstrativos) return null;
  return (
    <div className="border-b border-atencao/40 bg-atencao/15 px-4 py-2 text-center text-xs font-semibold tracking-wide text-atencao">
      DADOS DEMONSTRATIVOS — NÃO OFICIAIS. Gerados sinteticamente para
      desenvolvimento. Não representam o mercado real nem a base da Anatel.
    </div>
  );
}

/**
 * Aviso de descontinuidade na série histórica.
 *
 * Uma competência ausente é invisível num gráfico: a linha liga o mês anterior
 * ao seguinte e um buraco de doze meses vira um segmento reto que parece
 * continuidade. Os gráficos já desenham a interrupção, mas quem lê uma tabela
 * ou uma variação não veria nada — por isso o aviso é textual e fica no topo.
 */
export function AvisoLacunas({ meta }: { meta: Meta }) {
  const lacunas = meta.lacunas ?? [];
  if (lacunas.length === 0) return null;

  const periodos = lacunas.length > 3
    ? `${rotularCompetencia(lacunas[0]!)} a ${rotularCompetencia(lacunas[lacunas.length - 1]!)}`
    : lacunas.map(rotularCompetencia).join(', ');

  return (
    <div className="cartao border-atencao/40 bg-atencao/10 p-4 text-sm text-atencao">
      <strong>Série histórica com interrupção.</strong> {lacunas.length}{' '}
      {lacunas.length === 1 ? 'competência está ausente' : 'competências estão ausentes'}{' '}
      da base ({periodos}). Normalmente a janela de análise para antes de uma
      lacuna, justamente para evitar isso — se este aviso aparece, a
      descontinuidade está dentro da janela e merece conferência. Os dados
      ausentes não foram estimados nem preenchidos.
    </div>
  );
}

/** Gerar citação em formato BibTeX */
function gerarBibtex(a: any, p: any): string {
  const ano = new Date(p.processadoEm).getFullYear();
  const autores = a.autores.map((au: any) => au.nome).join(' and ');
  const doi = a.doi || '10.zenodo.XXXXXXX'; // placeholder
  return `@dataset{${MARCA.nome.toLowerCase().replace(/\\s+/g, '_')}_${ano},
  author = {${autores}},
  title = {${MARCA.nome}: ${MARCA.subtitulo}},
  year = {${ano}},
  version = {${a.versaoDataset}},
  publisher = {Zenodo},
  doi = {${doi}},
  url = {https://doi.org/${doi}}
}`;
}

/** Rodapé de rastreabilidade exigido pelo §5, presente em todas as páginas. */
export function RodapeProcedencia({ meta }: { meta: Meta }) {
  const p = meta.procedencia;
  const a = p.academicos;
  const bibtex = a ? gerarBibtex(a, p) : '';

  return (
    <footer className="mt-12 border-t border-grafite-800 bg-grafite-900/40">
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Seção 1: Citação Acadêmica */}
        {a && (
          <section className="mb-8 pb-8 border-b border-grafite-800">
            <div className="text-xs font-bold uppercase tracking-wide text-marca-400 mb-3">
              Como citar este dataset
            </div>
            <div className="text-xs text-grafite-300 font-mono bg-grafite-950 p-3 rounded border border-grafite-800 overflow-x-auto">
              {a.autores.map((au) => au.nome).join(', ')} ({new Date(p.processadoEm).getFullYear()}).
              {' '}
              <span className="text-grafite-200">{MARCA.nome}</span>. Version {a.versaoDataset}.
              {a.doi && (
                <>
                  {' '}
                  DOI:{' '}
                  <a href={`https://doi.org/${a.doi}`} className="text-marca-400 hover:underline">
                    {a.doi}
                  </a>
                </>
              )}
            </div>
            {/* BibTeX collapsível */}
            <details className="mt-3">
              <summary className="cursor-pointer text-xs text-marca-300 hover:text-marca-200">
                📋 Copiar como BibTeX
              </summary>
              <pre className="mt-2 text-xs bg-grafite-950 p-3 rounded border border-grafite-800 overflow-x-auto text-grafite-300">
                {bibtex}
              </pre>
            </details>
          </section>
        )}

        {/* Seção 2: Autoria e Afiliação */}
        {a && (
          <section className="mb-8 pb-8 border-b border-grafite-800">
            <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <dt className="rotulo">Autor(es)</dt>
                {a.autores.map((au) => (
                  <dd key={au.email || au.nome} className="mt-1 text-xs text-grafite-300">
                    {au.nome}
                    {au.orcid && (
                      <>
                        <br />
                        <a
                          href={`https://orcid.org/${au.orcid}`}
                          className="text-marca-400 underline-offset-2 hover:underline"
                          rel="noreferrer noopener"
                          target="_blank"
                        >
                          ORCID: {au.orcid}
                        </a>
                      </>
                    )}
                  </dd>
                ))}
              </div>
              {a.afiliacao && (
                <div>
                  <dt className="rotulo">Afiliação</dt>
                  <dd className="mt-0.5 text-xs text-grafite-300">{a.afiliacao}</dd>
                </div>
              )}
              <div>
                <dt className="rotulo">Licença</dt>
                <dd className="mt-0.5 text-xs text-grafite-300">
                  <a
                    href="https://creativecommons.org/licenses/by/4.0/"
                    className="text-marca-400 underline-offset-2 hover:underline"
                    rel="noreferrer noopener"
                    target="_blank"
                  >
                    {a.licenca}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="rotulo">Versão</dt>
                <dd className="mt-0.5 text-xs text-grafite-300">{a.versaoDataset}</dd>
              </div>
            </div>
          </section>
        )}

        {/* Seção 3: Procedência de Dados */}
        <section className="mb-8 pb-8 border-b border-grafite-800">
          <div className="text-xs font-bold uppercase tracking-wide text-marca-400 mb-3">
            Procedência dos Dados
          </div>
          <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-4 text-xs">
            <div>
              <dt className="rotulo">Fonte</dt>
              <dd className="mt-0.5 text-grafite-300">{p.fonte}</dd>
              <dd className="mt-1">
                <a
                  href={p.url}
                  className="text-marca-400 underline-offset-2 hover:underline break-all text-xs"
                  rel="noreferrer noopener"
                  target="_blank"
                >
                  {p.url}
                </a>
              </dd>
            </div>
            <div>
              <dt className="rotulo">UF analisada</dt>
              <dd className="mt-0.5 text-grafite-300">
                {MARCA.uf} ({MARCA.ufSigla})
              </dd>
              <dt className="rotulo mt-2">Arquivo</dt>
              <dd className="mt-0.5 break-all text-grafite-300">{p.arquivo}</dd>
            </div>
            <div>
              <dt className="rotulo">Período coberto</dt>
              <dd className="mt-0.5 text-grafite-300">
                {rotularCompetencia(p.competenciaInicial)} a{' '}
                {rotularCompetencia(p.competenciaFinal)}
              </dd>
              <dt className="rotulo mt-2">Coleta</dt>
              <dd className="mt-0.5 text-grafite-300">
                {new Date(p.coletadoEm).toLocaleString('pt-BR')}
              </dd>
            </div>
            <div>
              <dt className="rotulo">Última atualização</dt>
              <dd className="mt-0.5 text-grafite-300">
                {new Date(p.processadoEm).toLocaleString('pt-BR')}
              </dd>
              <dt className="rotulo mt-2">Processamento</dt>
              <dd className="mt-0.5 text-grafite-300">{MARCA.nome}</dd>
            </div>
          </dl>
        </section>

        {/* Seção 4: Rastreabilidade Técnica */}
        {a && (
          <section className="mb-6 pb-6 border-b border-grafite-800">
            <div className="text-xs font-bold uppercase tracking-wide text-marca-400 mb-3">
              Rastreabilidade Técnica
            </div>
            <div className="text-xs text-grafite-400 space-y-1">
              <div>
                Repositório:{' '}
                <a
                  href={a.urlRepositorio}
                  className="text-marca-400 underline-offset-2 hover:underline"
                  rel="noreferrer noopener"
                  target="_blank"
                >
                  {a.urlRepositorio}
                </a>
              </div>
              <div>
                Commit:{' '}
                <code className="text-grafite-300 font-mono">
                  <a
                    href={`${a.urlRepositorio}/commit/${a.commitHash}`}
                    className="text-marca-400 underline-offset-2 hover:underline"
                    rel="noreferrer noopener"
                    target="_blank"
                  >
                    {a.commitHash}
                  </a>
                </code>
              </div>
            </div>
          </section>
        )}

        {/* Disclaimer */}
        <p className="leading-relaxed text-grafite-500 text-xs">
          {MARCA.nome} é uma camada independente de análise sobre dados públicos da Anatel.
          Não possui vínculo com a Agência. Os indicadores de concentração são estatísticos
          e não constituem conclusão jurídica ou regulatória.{' '}
          <a href="/metodologia/" className="text-marca-400 underline-offset-2 hover:underline">
            Ver metodologia completa
          </a>
          .
        </p>
      </div>
    </footer>
  );
}
