/**
 * Formatacao pt-BR.
 *
 * Regra transversal: `null` significa "dado inexistente" e e renderizado como
 * "n/d" — nunca como 0, 0% ou traco ambiguo. Confundir ausencia com zero e a
 * forma mais comum de um BI mentir sem querer.
 */

const NAO_DISPONIVEL = 'n/d';

export function inteiro(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) return NAO_DISPONIVEL;
  return valor.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
}

export function percentual(valor: number | null | undefined, casas = 1): string {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) return NAO_DISPONIVEL;
  return `${valor.toLocaleString('pt-BR', {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  })}%`;
}

/** Percentual com sinal explicito — usado em variacoes. */
export function percentualComSinal(valor: number | null | undefined, casas = 1): string {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) return NAO_DISPONIVEL;
  const sinal = valor > 0 ? '+' : '';
  return `${sinal}${percentual(valor, casas)}`;
}

export function inteiroComSinal(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) return NAO_DISPONIVEL;
  return `${valor > 0 ? '+' : ''}${inteiro(valor)}`;
}

/** Compacta grandezas grandes para cards de KPI (1,2 mi / 345 mil). */
export function compacto(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) return NAO_DISPONIVEL;
  if (Math.abs(valor) >= 1_000_000) {
    return `${(valor / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} mi`;
  }
  if (Math.abs(valor) >= 10_000) {
    return `${(valor / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} mil`;
  }
  return inteiro(valor);
}

/** Classe de cor semantica para uma variacao (§43). */
export function corVariacao(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || !Number.isFinite(valor) || valor === 0) {
    return 'text-grafite-400';
  }
  return valor > 0 ? 'text-alta' : 'text-baixa';
}

export function setaVariacao(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || !Number.isFinite(valor) || valor === 0) return '–';
  return valor > 0 ? '▲' : '▼';
}

export const ND = NAO_DISPONIVEL;

export function cnpjFormatado(cnpj: string): string {
  const d = cnpj.replace(/\D/g, '');
  return d.length === 14
    ? `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
    : cnpj;
}

/** 'AAAA-MM-DD' ou ISO completo para 'DD/MM/AAAA', sem conversao de fuso. */
export function dataBr(valor: string | null | undefined): string {
  const m = valor ? /^(\d{4})-(\d{2})-(\d{2})/.exec(valor) : null;
  return m ? `${m[3]}/${m[2]}/${m[1]}` : ND;
}
