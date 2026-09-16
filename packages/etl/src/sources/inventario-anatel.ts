/**
 * Inventario de bases de dados da Anatel.
 *
 * A Anatel publica um CSV que lista todas as suas bases abertas, com nome e
 * endereco de download. Esse inventario e a fonte de descoberta preferencial
 * porque, ao contrario da API do dados.gov.br, NAO exige chave de acesso —
 * o que ficou evidente quando a ingestao recebeu HTTP 401 de la.
 *
 * ATENCAO AO LEITOR: o layout de colunas deste CSV nao pode ser verificado
 * no ambiente de desenvolvimento (sem acesso de rede a *.gov.br). Por isso a
 * leitura aqui e deliberadamente agnostica a nomes de coluna: procura, em
 * qualquer celula, algo que pareca uma URL de arquivo processavel, e usa as
 * demais celulas da linha como descricao. E feio, e e proposital — um parser
 * rigido sobre um layout desconhecido falharia a cada republicacao.
 *
 * O comando `npm run etl -- inventario` imprime o cabecalho real, para que
 * esta leitura possa ser apertada quando o formato for conhecido.
 */

import { parse } from 'csv-parse/sync';
import iconv from 'iconv-lite';
import { canonizarTexto } from '@netrank/core';

export const URL_INVENTARIO =
  'https://www.anatel.gov.br/dadosabertos/PDA/Bases_Publicadas/Inventario_de_Bases_de_Dados.csv';

export interface LinhaInventario {
  /** Todas as celulas da linha, para diagnostico. */
  celulas: string[];
  /**
   * URLs que apontam direto para um arquivo que o pipeline sabe ler.
   * Sao as unicas candidatas a download automatico.
   */
  urls: string[];
  /**
   * URLs de pagina (sem extensao de arquivo) — portal do dados.gov.br,
   * painel da Anatel e afins.
   *
   * Sao preservadas porque a execucao real mostrou que a maioria das linhas do
   * inventario so tem links de pagina: filtrar URL por extensao descartava 127
   * das 128 linhas. Elas nao servem para download, mas servem para o operador
   * chegar no arquivo.
   */
  urlsPagina: string[];
  /** Texto concatenado da linha, canonizado — usado para filtrar por assunto. */
  textoCanonico: string;
}

/** Extensoes que o pipeline sabe processar. */
const EXTENSOES = /\.(zip|csv|txt)(\?|$)/i;

function ehUrl(valor: string): boolean {
  return /^https?:\/\//i.test(valor.trim());
}

function ehUrlProcessavel(valor: string): boolean {
  const limpo = valor.trim();
  return ehUrl(limpo) && EXTENSOES.test(limpo);
}

/**
 * Le o inventario, tolerando delimitador e codificacao desconhecidos.
 * Tenta ponto-e-virgula e virgula, e fica com a leitura que produzir mais
 * colunas — heuristica simples e suficiente para um arquivo tabular.
 */
export function interpretarInventario(bruto: Buffer): {
  cabecalho: string[];
  linhas: LinhaInventario[];
} {
  // Latin1 e comum em publicacoes .gov.br; a deteccao segue a mesma regra do
  // resto do pipeline: U+FFFD indica que nao era UTF-8 valido.
  const comoUtf8 = bruto.toString('utf8');
  const texto = comoUtf8.includes('�') ? iconv.decode(bruto, 'latin1') : comoUtf8;

  let melhor: string[][] = [];
  for (const delimitador of [';', ',', '\t']) {
    try {
      const registros = parse(texto, {
        delimiter: delimitador,
        relax_column_count: true,
        relax_quotes: true,
        skip_empty_lines: true,
        trim: true,
        bom: true,
      }) as string[][];
      const colunas = registros[0]?.length ?? 0;
      if (colunas > (melhor[0]?.length ?? 0)) melhor = registros;
    } catch {
      // Delimitador errado produz erro de parsing; seguimos para o proximo.
    }
  }

  const cabecalho = melhor[0] ?? [];
  const linhas: LinhaInventario[] = melhor.slice(1).map((celulas) => ({
    celulas,
    urls: celulas.filter(ehUrlProcessavel).map((u) => u.trim()),
    urlsPagina: celulas
      .filter((c) => ehUrl(c) && !ehUrlProcessavel(c))
      .map((u) => u.trim()),
    textoCanonico: canonizarTexto(celulas.join(' ')),
  }));

  return { cabecalho, linhas };
}

export async function baixarInventario(timeoutMs = 60_000): Promise<Buffer> {
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), timeoutMs);
  try {
    const resposta = await fetch(URL_INVENTARIO, {
      signal: controlador.signal,
      headers: { 'user-agent': 'NETRANK-RJ/0.1 (dados abertos Anatel)' },
    });
    if (!resposta.ok) {
      throw new Error(`Inventario da Anatel respondeu HTTP ${resposta.status}`);
    }
    return Buffer.from(await resposta.arrayBuffer());
  } finally {
    clearTimeout(temporizador);
  }
}

/** Termos que identificam a base de acessos de banda larga fixa. */
const TERMOS_OBRIGATORIOS = ['ACESSO'];
const TERMOS_ALTERNATIVOS = ['BANDA LARGA FIXA', 'BANDA LARGA', 'SCM'];

/** Filtra as linhas do inventario que tratam de acessos de banda larga fixa. */
export function filtrarBandaLargaFixa(
  linhas: readonly LinhaInventario[],
): LinhaInventario[] {
  return linhas.filter((linha) => {
    // Exigir link direto de arquivo aqui descartava a linha certa: no
    // inventario real, quase todas as linhas so trazem link de pagina.
    if (linha.urls.length === 0 && linha.urlsPagina.length === 0) return false;
    const texto = linha.textoCanonico;
    const temObrigatorio = TERMOS_OBRIGATORIOS.every((t) => texto.includes(t));
    const temAlternativo = TERMOS_ALTERNATIVOS.some((t) => texto.includes(t));
    return temObrigatorio && temAlternativo;
  });
}
