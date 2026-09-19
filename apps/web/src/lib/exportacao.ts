/**
 * Exportação de dados em múltiplos formatos (CSV, JSON, GeoJSON).
 *
 * Consolida lógica de conversão e download de arquivos com metadados de datasets.
 * Funciona apenas no navegador (usa API Download).
 */

export interface ExportRecord {
  [chave: string]: string | number | boolean | null | undefined;
}

export interface DadosExportacao {
  nome: string;
  descricao: string;
  formato: 'csv' | 'json' | 'geojson';
  arquivo: string;
  caminho: string;
  tamanhoEstimado: string;
}

/**
 * Converte array de objetos para CSV.
 * Trata null/undefined como células vazias.
 */
export function converterParaCsv(
  dados: ExportRecord[],
  colunas?: string[],
): string {
  if (dados.length === 0) return '';

  const chaves = colunas || Object.keys(dados[0]!);
  const cabecalho = chaves.map((col) => `"${col}"`).join(',');

  const linhas = dados.map((row) =>
    chaves
      .map((chave) => {
        const valor = row[chave];
        if (valor === null || valor === undefined) return '';
        const str = String(valor);
        return `"${str.replace(/"/g, '""')}"`;
      })
      .join(','),
  );

  return [cabecalho, ...linhas].join('\n');
}

/**
 * Download de CSV no navegador.
 * Adiciona BOM para compatibilidade com Excel em Windows.
 */
export function exportarCSV(dados: ExportRecord[], nomeArquivo = 'dados'): void {
  if (dados.length === 0) {
    console.warn('Nenhum dado para exportar');
    return;
  }

  const conteudo = converterParaCsv(dados);
  downloadArquivo(conteudo, `${nomeArquivo}.csv`, 'text/csv;charset=utf-8;');
}

/**
 * Download de JSON no navegador.
 * Formato: JSON pretty-printed (2 espaços).
 */
export function exportarJSON(dados: ExportRecord[], nomeArquivo = 'dados'): void {
  const conteudo = JSON.stringify(dados, null, 2);
  downloadArquivo(conteudo, `${nomeArquivo}.json`, 'application/json;charset=utf-8;');
}

/**
 * Trigger de download via blob.
 * @internal
 */
function downloadArquivo(conteudo: string, nomeArquivo: string, tipo: string): void {
  const BOM = '﻿';
  const blob = new Blob([BOM + conteudo], { type: tipo });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', nomeArquivo);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Lista de datasets disponíveis para download.
 *
 * Mantém metadados sobre tamanho, formato e localização de cada artefato
 * para fins de descoberta e UI de seleção.
 */
export function obterDatasetsDisponiveis(): DadosExportacao[] {
  return [
    // Estado
    {
      nome: 'KPIs Estaduais',
      descricao: 'Indicadores-chave de banda larga no estado (últimas 12 competências)',
      formato: 'json',
      arquivo: 'kpis-estaduais.json',
      caminho: '/data/estado/kpis.json',
      tamanhoEstimado: '5 KB',
    },
    {
      nome: 'Ranking Estadual',
      descricao: 'Todos os provedores com dados estaduais agregados',
      formato: 'json',
      arquivo: 'ranking-estadual.json',
      caminho: '/data/estado/ranking.json',
      tamanhoEstimado: '300 KB',
    },
    {
      nome: 'Série Histórica Estadual',
      descricao: 'Evolução de indicadores estaduais mês a mês',
      formato: 'json',
      arquivo: 'serie-historica-estado.json',
      caminho: '/data/estado/serie.json',
      tamanhoEstimado: '30 KB',
    },
    {
      nome: 'Série Histórica por Provedor',
      descricao: 'Evolução de acessos para cada provedor',
      formato: 'json',
      arquivo: 'series-empresas.json',
      caminho: '/data/estado/series-empresas.json',
      tamanhoEstimado: '350 KB',
    },

    // Municípios
    {
      nome: 'Ranking Municipal',
      descricao: 'KPIs e ranking de provedores para cada município',
      formato: 'json',
      arquivo: 'municipios-ranking.json',
      caminho: '/data/municipios/index.json',
      tamanhoEstimado: '500 KB',
    },
    {
      nome: 'Malha Geográfica RJ',
      descricao: 'Limites municipais em formato GeoJSON para mapas interativos',
      formato: 'geojson',
      arquivo: 'malhas-rj-municipios.geojson',
      caminho: '/data/malhas/rj-municipios.json',
      tamanhoEstimado: '450 KB',
    },

    // Provedores
    {
      nome: 'Perfis de Provedores',
      descricao: 'Dados consolidados de todos os provedores com cobertura estadual',
      formato: 'json',
      arquivo: 'provedores-perfis.json',
      caminho: '/data/provedores/index.json',
      tamanhoEstimado: '300 KB',
    },
    {
      nome: 'Movimentações de Ranking',
      descricao: 'Análise de entradas, saídas e mudanças de posição de provedores',
      formato: 'json',
      arquivo: 'movimentacoes.json',
      caminho: '/data/movimentacoes.json',
      tamanhoEstimado: '100 KB',
    },
  ];
}

/**
 * Formata tamanho de bytes para formato legível (B, KB, MB, GB).
 */
export function formatarTamanho(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Formata valor para exportação (null → '', boolean → Sim/Não).
 */
export function formatarParaExportacao(valor: unknown): string | number {
  if (valor === null || valor === undefined) return '';
  if (typeof valor === 'number') return valor;
  if (typeof valor === 'boolean') return valor ? 'Sim' : 'Não';
  return String(valor);
}
