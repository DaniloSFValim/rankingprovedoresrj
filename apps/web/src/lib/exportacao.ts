/**
 * Utilities for exporting data in various formats (CSV, JSON)
 */

export interface ExportRecord {
  [chave: string]: string | number | boolean | null | undefined;
}

/**
 * Convert data array to CSV format
 */
export function paraCSV(dados: ExportRecord[], nomeArquivo = 'dados'): void {
  if (dados.length === 0) {
    console.warn('Nenhum dado para exportar');
    return;
  }

  const cabecalho = Object.keys(dados[0]);
  const linhas = [
    cabecalho.map((c) => `"${c}"`).join(','),
    ...dados.map((linha) =>
      cabecalho
        .map((chave) => {
          const valor = linha[chave];
          if (valor === null || valor === undefined) return '""';
          const str = String(valor).replace(/"/g, '""');
          return `"${str}"`;
        })
        .join(',')
    ),
  ];

  const conteudo = linhas.join('\n');
  downloadArquivo(conteudo, `${nomeArquivo}.csv`, 'text/csv;charset=utf-8;');
}

/**
 * Convert data array to JSON format
 */
export function paraJSON(dados: ExportRecord[], nomeArquivo = 'dados'): void {
  const conteudo = JSON.stringify(dados, null, 2);
  downloadArquivo(conteudo, `${nomeArquivo}.json`, 'application/json;charset=utf-8;');
}

/**
 * Download file with specified content
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

  // Cleanup
  URL.revokeObjectURL(url);
}

/**
 * Format number for display in exports
 */
export function formatarParaExportacao(valor: unknown): string | number {
  if (valor === null || valor === undefined) return '';
  if (typeof valor === 'number') return valor;
  if (typeof valor === 'boolean') return valor ? 'Sim' : 'Não';
  return String(valor);
}
