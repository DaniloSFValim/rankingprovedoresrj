/**
 * Utilitários para visualização de mapas (Phase 4)
 */

/**
 * Calcula cor para coropleth de HHI (Concentração)
 *
 * Escala:
 * - HHI < 1500: Verde (Desconcentrado - Competição)
 * - 1500-2500: Amarelo (Moderado)
 * - HHI > 2500: Vermelho (Concentrado - Monopólio)
 */
export function obterCorHhi(hhi: number | null | undefined): string {
  if (hhi === null || hhi === undefined) {
    return '#9ca3af'; // cinza para dados ausentes
  }

  if (hhi < 1500) {
    return '#10b981'; // verde claro
  } else if (hhi < 1800) {
    return '#6ee7b7'; // verde
  } else if (hhi < 2200) {
    return '#fbbf24'; // amarelo
  } else if (hhi < 2500) {
    return '#f97316'; // laranja
  } else {
    return '#ef4444'; // vermelho
  }
}

/**
 * Retorna label descritivo para nível de HHI
 */
export function descreverHhi(hhi: number | null | undefined): string {
  if (hhi === null || hhi === undefined) {
    return 'Dados não disponíveis';
  }

  if (hhi < 1500) {
    return 'Desconcentrado - Competição';
  } else if (hhi < 2500) {
    return 'Moderado';
  } else {
    return 'Concentrado - Baixa Competição';
  }
}

/**
 * Retorna cor para cobertura de provedor (0-100%)
 *
 * Escala:
 * - 0%: Cinza (sem cobertura)
 * - 1-30%: Azul claro
 * - 31-60%: Azul
 * - 61-90%: Azul escuro
 * - 91-100%: Roxo (cobertura total)
 */
export function obterCorCobertura(percentual: number | null | undefined): string {
  if (percentual === null || percentual === undefined || percentual === 0) {
    return '#d1d5db'; // cinza
  }

  if (percentual <= 30) {
    return '#93c5fd'; // azul claro
  } else if (percentual <= 60) {
    return '#3b82f6'; // azul
  } else if (percentual <= 90) {
    return '#1e40af'; // azul escuro
  } else {
    return '#7c3aed'; // roxo
  }
}

/**
 * Escala de opacidade com base em confiança dos dados
 * Municípios com mais provedores = dados mais confiáveis
 */
export function obterOpacidade(numeroProvedores: number | null | undefined): number {
  if (numeroProvedores === null || numeroProvedores === undefined) {
    return 0.3;
  }

  if (numeroProvedores < 3) return 0.5;
  if (numeroProvedores < 5) return 0.65;
  if (numeroProvedores < 10) return 0.8;
  return 0.95;
}

/**
 * Estilo padrão para feature de mapa
 */
export function obterEstiloFeature(
  hhi?: number | null,
  opcoes?: { tipo?: 'hhi' | 'cobertura'; cobertura?: number; provedores?: number },
): Record<string, any> {
  const tipo = opcoes?.tipo || 'hhi';
  const cor =
    tipo === 'hhi'
      ? obterCorHhi(hhi)
      : obterCorCobertura(opcoes?.cobertura);

  const opacidade = obterOpacidade(opcoes?.provedores);

  return {
    color: '#374151',
    weight: 2,
    opacity: 1,
    fillColor: cor,
    fillOpacity: opacidade,
  };
}

/**
 * Legenda para mapa de HHI
 */
export const legendaHhi = [
  { label: 'Desconcentrado', faixa: '< 1500', cor: '#10b981' },
  { label: 'Verde', faixa: '1500-1800', cor: '#6ee7b7' },
  { label: 'Moderado', faixa: '1800-2200', cor: '#fbbf24' },
  { label: 'Concentrado', faixa: '2200-2500', cor: '#f97316' },
  { label: 'Monopólio', faixa: '> 2500', cor: '#ef4444' },
];

/**
 * Legenda para mapa de cobertura
 */
export const legendaCobertura = [
  { label: 'Sem cobertura', faixa: '0%', cor: '#d1d5db' },
  { label: 'Baixa', faixa: '1-30%', cor: '#93c5fd' },
  { label: 'Média', faixa: '31-60%', cor: '#3b82f6' },
  { label: 'Alta', faixa: '61-90%', cor: '#1e40af' },
  { label: 'Total', faixa: '91-100%', cor: '#7c3aed' },
];
