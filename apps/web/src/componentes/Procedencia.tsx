import { rotularCompetencia } from '@netrank/core';
import type { Meta } from '@/lib/dados';
import { MARCA } from '@/lib/marca';

/**
 * Faixa de aviso de dados demonstrativos.
 *
 * Deliberadamente impossível de ignorar: fica no topo de toda página, em
 * contraste alto, enquanto a flag estiver ligada nos artefatos.
 */
export function FaixaDemonstrativo({ meta }: { meta: Meta }) {
  if (!meta.procedencia.dadosDemonstrativos) return null;
  return (
    <div className="border-b border-atencao/40 bg-atencao/15 px-4 py-2 text-center text-sm font-semibold text-atencao">
      Dados demonstrativos, não oficiais. Gerados sinteticamente para
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

  return (
    <footer className="mt-20 border-t border-grafite-700 bg-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 text-sm md:grid-cols-[2fr_1fr_1fr]">
        <div className="max-w-md space-y-2 text-grafite-400">
          <p className="font-semibold text-tinta">{MARCA.nome}</p>
          <p>
            Análise independente de Danilo Valim sobre dados públicos da Anatel. Não é
            site oficial da Prefeitura de Niterói nem da Seconser e não expressa posição
            dessas instituições. Os indicadores de concentração (CR-n e HHI) são
            estatísticos e não constituem conclusão jurídica, concorrencial ou regulatória.
          </p>
        </div>
        <dl className="space-y-3">
          <div>
            <dt className="text-grafite-400">Fonte</dt>
            <dd className="text-grafite-200">Anatel, dados abertos</dd>
          </div>
          <div>
            <dt className="text-grafite-400">Processado em</dt>
            <dd className="numerico text-grafite-200">
              {new Date(p.processadoEm).toLocaleDateString('pt-BR')}
            </dd>
          </div>
        </dl>
        <ul className="space-y-2">
          <li>
            <a href="/sobre/" className="text-marca-400 underline-offset-4 hover:underline">Sobre o projeto</a>
          </li>
          <li>
            <a href="/sobre/#indicadores" className="text-marca-400 underline-offset-4 hover:underline">Como os indicadores são calculados</a>
          </li>
          <li>
            <a
              href="https://doi.org/10.5281/zenodo.22839933"
              target="_blank"
              rel="noopener noreferrer"
              className="text-marca-400 underline-offset-4 hover:underline"
            >
              DOI 10.5281/zenodo.22839933
            </a>
          </li>
        </ul>
      </div>
    </footer>
  );
}
