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

/** Rodapé institucional com informações essenciais. Conteúdo detalhado está em /sobre/. */
export function RodapeProcedencia({ meta }: { meta: Meta }) {
  const p = meta.procedencia;
  const a = p.academicos;

  return (
    <footer className="mt-12 border-t border-grafite-700 bg-grafite-950/80">
      <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
        {/* Authorship and Registry */}
        <div className="text-xs text-grafite-400 space-y-1">
          <p>
            <span className="font-medium text-grafite-300">Danilo Valim</span> — Secretaria Municipal de Conservação e Serviços Públicos
          </p>
          <p>
            DOI:{' '}
            <a
              href="https://doi.org/10.5281/zenodo.22839933"
              target="_blank"
              rel="noopener noreferrer"
              className="text-marca-400 hover:underline"
            >
              10.5281/zenodo.22839933
            </a>
          </p>
        </div>

        {/* Key Information Grid */}
        <section className="text-xs text-grafite-400">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-marca-400 font-semibold mb-1">Fonte de Dados</dt>
              <dd className="text-grafite-300 font-medium">
                Anatel
              </dd>
              <dd className="mt-1 text-grafite-500 text-[10px]">
                Dados públicos da Agência Nacional de Telecomunicações
              </dd>
            </div>
            <div>
              <dt className="text-marca-400 font-semibold mb-1">Última Atualização</dt>
              <dd className="text-grafite-300 text-[11px]">
                {new Date(p.processadoEm).toLocaleString('pt-BR')}
              </dd>
            </div>
            <div>
              <dt className="text-marca-400 font-semibold mb-1">Desenvolvimento</dt>
              <dd className="text-grafite-300 space-y-1">
                {a && (
                  <div className="text-[11px]">
                    {a.autores.slice(0, 1).map((au) => (
                      <div key={au.email || au.nome}>
                        {au.nome}
                      </div>
                    ))}
                  </div>
                )}
                <div className="text-[10px] text-grafite-500">
                  Desenvolvimento independente
                </div>
              </dd>
            </div>
            <div>
              <dt className="text-marca-400 font-semibold mb-1">Mais Informações</dt>
              <dd className="space-y-1">
                <div>
                  <a href="/sobre/" className="text-marca-400 hover:underline text-[11px]">
                    → Sobre o projeto
                  </a>
                </div>
                <div>
                  <a href="/sobre/#indicadores" className="text-marca-400 hover:underline text-[11px]">
                    → Como os indicadores são calculados
                  </a>
                </div>
              </dd>
            </div>
          </div>
        </section>

        {/* Disclaimer */}
        <section className="border-t border-grafite-800 pt-6 text-xs leading-relaxed text-grafite-500">
          <p>
            {MARCA.nome} é uma análise independente sobre dados públicos da Anatel. Os indicadores de concentração
            são estatísticos e não constituem conclusão jurídica ou regulatória.
          </p>
        </section>
      </div>
    </footer>
  );
}
