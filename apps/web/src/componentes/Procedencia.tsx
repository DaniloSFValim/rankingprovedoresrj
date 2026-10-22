import { rotularCompetencia } from '@netrank/core';
import type { Meta } from '@/lib/dados';
import { MARCA } from '@/lib/marca';
import citacao from '@/lib/citacao.json';

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
 * O mês mais recente chega incompleto: prestadoras declaram com atraso e a
 * Anatel o revisa para cima na publicação seguinte. Sem o aviso, a variação
 * contra o mês anterior, já consolidado, parece uma queda de mercado.
 */
export function AvisoPreliminar({ competencia }: { competencia: string }) {
  return (
    <p className="rounded-md border border-atencao/30 bg-atencao/5 px-4 py-3 text-sm text-grafite-200">
      Os dados de {rotularCompetencia(competencia)} são preliminares. Parte das
      prestadoras declara com atraso, e a Anatel costuma revisar o mês para cima na
      publicação seguinte. Variações contra o mês anterior tendem a parecer quedas.
    </p>
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

const LINK = 'text-marca-400 underline-offset-4 hover:underline';

/**
 * Rodapé com autoria e registro citável, no mesmo desenho do OpenLux: o que é
 * o painel, quem fez e como citar. Detalhes em /sobre/.
 */
export function RodapeProcedencia({ meta }: { meta: Meta }) {
  const p = meta.procedencia;

  return (
    <footer className="mt-20 border-t border-grafite-700 bg-white" role="contentinfo">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 text-sm leading-relaxed md:grid-cols-[1.2fr_1.5fr_0.8fr]">
        <div className="space-y-3 text-grafite-400">
          <h2 className="text-base font-semibold text-tinta">{MARCA.nome}</h2>
          <p>
            Painel do mercado de banda larga fixa nos municípios do Rio de Janeiro, feito
            sobre os dados abertos da Anatel. Os dados de cada página podem ser baixados em
            JSON.
          </p>
          <p>
            Não é site oficial da Prefeitura de Niterói nem da Seconser e não expressa
            posição dessas instituições. CR-n e HHI são indicadores estatísticos, sem
            conclusão jurídica, concorrencial ou regulatória.
          </p>
          <p className="numerico">
            Versão {citacao.versao}. Dados processados em{' '}
            {new Date(p.processadoEm).toLocaleDateString('pt-BR')}. A fonte primária é a Anatel.
          </p>
        </div>

        <nav aria-label="Rodapé">
          <h2 className="text-base font-semibold text-tinta">Mais</h2>
          <ul className="mt-3 space-y-2">
            <li><a href="/sobre/" className={LINK}>Sobre o projeto</a></li>
            <li><a href="/sobre/#indicadores" className={LINK}>Como os indicadores são calculados</a></li>
            <li><a href="/sobre/#dados" className={LINK}>Dados para download</a></li>
          </ul>
        </nav>
      </div>
      <LinhasCitacao />
    </footer>
  );
}

/**
 * Linhas de autoria e registro. O mesmo texto está em todos os projetos do
 * autor; os dados vêm de citacao.json, gerado a partir do Zenodo e do ORCID.
 */
export function LinhasCitacao() {
  const ano = new Date(citacao.dataPublicacao).getFullYear();
  return (
    <div className="border-t border-grafite-700 px-4 py-4 text-xs text-grafite-400">
      <div className="mx-auto max-w-7xl space-y-1">
        <p>
          Desenvolvido por <span className="text-grafite-200">{citacao.autor}</span> (UFRRJ), ORCID{' '}
          <a href={`https://orcid.org/${citacao.orcid}`} target="_blank" rel="noopener noreferrer" className={LINK}>
            {citacao.orcid}
          </a>
          . Código sob AGPL-3.0; documentação e dados sob CC BY 4.0.
        </p>
        <p>
          Registro citável no Zenodo, DOI{' '}
          <a href={`https://doi.org/${citacao.doiConceito}`} target="_blank" rel="noopener noreferrer" className={LINK}>
            {citacao.doiConceito}
          </a>
          .
        </p>
        <p>© {ano} {citacao.autor}.</p>
      </div>
    </div>
  );
}
