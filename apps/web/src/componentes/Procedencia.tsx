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

/** Rodapé simplificado com informações essenciais. Conteúdo detalhado está em /sobre/. */
export function RodapeProcedencia({ meta }: { meta: Meta }) {
  const p = meta.procedencia;
  const a = p.academicos;

  return (
    <footer className="mt-12 border-t border-grafite-800 bg-grafite-900/40">
      <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
        {/* Institutional Context */}
        <section className="text-xs leading-relaxed text-grafite-300">
          <p className="font-semibold text-marca-300 mb-2">Iniciativa Institucional</p>
          <p>
            {MARCA.nome} é uma plataforma independente de monitoramento de mercado desenvolvida para subsidiar
            as atividades de fiscalização da{' '}
            <strong>Secretaria Municipal de Conservação e Serviços Públicos (Seconser)</strong>,
            especificamente do Setor de Fiscalização de Serviços Concedidos da Prefeitura Municipal de Niterói.
            A plataforma não possui vínculo com órgãos reguladores e funciona como ferramenta de análise de dados públicos.
          </p>
        </section>

        {/* Data Source, Authors and Update */}
        <section className="border-t border-grafite-800 pt-6 text-xs text-grafite-400">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-marca-400 font-semibold mb-1">Fonte de Dados</dt>
              <dd className="text-grafite-300 font-medium">
                Anatel
              </dd>
              <dd className="mt-1 text-grafite-500 text-[10px]">
                Dados públicos processados de forma independente
              </dd>
            </div>
            <div>
              <dt className="text-marca-400 font-semibold mb-1">Última Atualização</dt>
              <dd className="text-grafite-300">
                {new Date(p.processadoEm).toLocaleString('pt-BR')}
              </dd>
            </div>
            {a && (
              <div>
                <dt className="text-marca-400 font-semibold mb-1">Autoria</dt>
                <dd className="text-grafite-300 space-y-0.5">
                  {a.autores.slice(0, 2).map((au) => (
                    <div key={au.email || au.nome} className="text-[11px]">
                      {au.nome}
                    </div>
                  ))}
                  {a.autores.length > 2 && (
                    <div className="text-[10px] text-grafite-500">
                      +{a.autores.length - 2} {a.autores.length - 2 === 1 ? 'outro' : 'outros'}
                    </div>
                  )}
                </dd>
              </div>
            )}
            <div>
              <dt className="text-marca-400 font-semibold mb-1">Referências</dt>
              <dd className="space-y-1">
                <div>
                  <a href="/sobre/" className="text-marca-400 hover:underline text-[11px]">
                    → Sobre o projeto
                  </a>
                </div>
                <div>
                  <a href="/metodologia/" className="text-marca-400 hover:underline text-[11px]">
                    → Metodologia
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
