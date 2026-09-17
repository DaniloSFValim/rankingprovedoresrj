/**
 * Utilitários para exportação de dados em múltiplos formatos
 */

export interface DadosExportacao {
  nome: string;
  descricao: string;
  formato: 'csv' | 'json' | 'geojson';
  arquivo: string;
  caminho: string;
  tamanhoEstimado: string;
}

/**
 * Converte array de objetos em CSV
 */
export function converterParaCsv(dados: Array<Record<string, any>>, colunas?: string[]): string {
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
 * Lista de datasets disponíveis para exportação
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
 * Formata tamanho em bytes para legível
 */
export function formatarTamanho(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
<<<<<<< HEAD

/**
 * Obter tamanho real de arquivo a partir do caminho
 * Retorna tamanho estimado se arquivo não acessível
 */
export function obterTamanhoArquivo(tamanhoEstimado: string): string {
  return tamanhoEstimado;
}
=======
>>>>>>> origin/main
