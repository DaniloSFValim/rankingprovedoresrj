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
      da base ({periodos}). Os gráficos mostram a interrupção, e variações que
      atravessem esse intervalo comparam meses não consecutivos. Os dados
      ausentes não foram estimados nem preenchidos.
    </div>
  );
}

/** Rodapé de rastreabilidade exigido pelo §5, presente em todas as páginas. */
export function RodapeProcedencia({ meta }: { meta: Meta }) {
  const p = meta.procedencia;
  return (
    <footer className="mt-12 border-t border-grafite-800 bg-grafite-900/40">
      <div className="mx-auto max-w-7xl px-4 py-8 text-xs text-grafite-400">
        <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="rotulo">Fonte</dt>
            <dd className="mt-0.5 text-grafite-300">{p.fonte}</dd>
            <dd>
              <a
                href={p.url}
                className="text-marca-400 underline-offset-2 hover:underline"
                rel="noreferrer noopener"
                target="_blank"
              >
                {p.url}
              </a>
            </dd>
          </div>
          <div>
            <dt className="rotulo">UF analisada</dt>
            <dd className="mt-0.5 text-grafite-300">{MARCA.uf} ({MARCA.ufSigla})</dd>
            <dt className="rotulo mt-2">Arquivo</dt>
            <dd className="mt-0.5 break-all text-grafite-300">{p.arquivo}</dd>
          </div>
          <div>
            <dt className="rotulo">Período coberto</dt>
            <dd className="mt-0.5 text-grafite-300">
              {rotularCompetencia(p.competenciaInicial)} a {rotularCompetencia(p.competenciaFinal)}
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
        <p className="mt-6 border-t border-grafite-800 pt-4 leading-relaxed text-grafite-500">
          {MARCA.nome} é uma camada independente de análise sobre dados públicos da
          Anatel. Não possui vínculo com a Agência. Os indicadores de concentração
          são estatísticos e não constituem conclusão jurídica ou regulatória.{' '}
          <a href="/metodologia/" className="text-marca-400 underline-offset-2 hover:underline">
            Ver metodologia completa
          </a>
          .
        </p>
      </div>
    </footer>
  );
}
