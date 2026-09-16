/**
 * Sincronizacao nao interativa (§37).
 *
 * Encadeia descoberta, download e importacao sem intervencao humana, para que
 * a atualizacao mensal possa rodar em CI. O comando `descobrir` continua
 * existindo para inspecao manual; este seleciona sozinho.
 *
 * A selecao automatica e conservadora e SEMPRE imprime o que escolheu antes de
 * baixar. Um pipeline que escolhe em silencio e um pipeline em que ninguem
 * percebe quando a fonte muda de formato.
 */

import { anoDoRecurso, descobrirRecursos, type RecursoCandidato } from '../sources/descoberta.js';

export interface CriterioSelecao {
  /** Quantos anos mais recentes importar. */
  anos: number;
  /** Ano de referencia; o padrao e o ano corrente. */
  anoAtual?: number;
}

export interface ResultadoSelecao {
  selecionados: RecursoCandidato[];
  descartados: RecursoCandidato[];
  falhas: Array<{ catalogo: string; motivo: string }>;
  paginas: Array<{ descricao: string; url: string }>;
}

/**
 * Escolhe os recursos a importar.
 *
 * Regras, nesta ordem:
 *  1. So formatos que o pipeline sabe ler (ZIP e CSV; ZIP tem precedencia
 *     quando os dois existem para o mesmo ano, por ser o que a Anatel publica).
 *  2. So recursos cujo nome ou URL contem um ano dentro da janela pedida.
 *  3. Um recurso por ano — o primeiro, ja que a descoberta ordena do mais
 *     recente para o mais antigo.
 *
 * Recurso sem ano identificavel e DESCARTADO, nao chutado para o ano corrente:
 * importar o arquivo errado corromperia a serie historica em silencio.
 */
export function selecionarRecursos(
  candidatos: readonly RecursoCandidato[],
  criterio: CriterioSelecao,
): { selecionados: RecursoCandidato[]; descartados: RecursoCandidato[] } {
  const anoAtual = criterio.anoAtual ?? new Date().getUTCFullYear();
  const anoMinimo = anoAtual - criterio.anos + 1;

  const selecionados: RecursoCandidato[] = [];
  const descartados: RecursoCandidato[] = [];
  const anosCobertos = new Set<number>();

  // ZIP antes de CSV para o mesmo ano; depois, ordem de descoberta.
  const ordenados = [...candidatos].sort((a, b) => {
    const peso = (r: RecursoCandidato) => (r.formato === 'ZIP' ? 0 : 1);
    return peso(a) - peso(b);
  });

  for (const candidato of ordenados) {
    const ano = anoDoRecurso(candidato);
    if (ano === null || ano < anoMinimo || ano > anoAtual + 1) {
      descartados.push(candidato);
      continue;
    }
    if (anosCobertos.has(ano)) {
      descartados.push(candidato);
      continue;
    }
    anosCobertos.add(ano);
    selecionados.push(candidato);
  }

  // Do mais antigo para o mais novo: importar em ordem cronologica faz os
  // alertas de variacao compararem contra a competencia correta.
  selecionados.sort((a, b) => (anoDoRecurso(a) ?? 0) - (anoDoRecurso(b) ?? 0));
  return { selecionados, descartados };
}

export async function descobrirESelecionar(
  criterio: CriterioSelecao,
): Promise<ResultadoSelecao> {
  const { candidatos, falhas, paginas } = await descobrirRecursos();
  const { selecionados, descartados } = selecionarRecursos(candidatos, criterio);
  return { selecionados, descartados, falhas, paginas };
}
