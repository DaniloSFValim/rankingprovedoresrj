import { FAIXAS_VELOCIDADE, type FaixaVelocidade } from '../sources/anatel.js';
import type { Banco } from '../warehouse/db.js';

/** Conexoes abaixo deste limite sao contadas como lentas (Mbps). */
export const LIMITE_CONEXAO_LENTA = 50;

export interface PerfilAcessos {
  acessosPessoaFisica: number;
  /** Acessos com velocidade contratada informada (base dos percentuais). */
  acessosComVelocidade: number;
  faixasVelocidade: Array<{ faixa: FaixaVelocidade; rotulo: string; acessos: number }>;
  /** Parcela dos acessos com velocidade informada abaixo de 50 Mbps. null sem base. */
  percentualAbaixo50: number | null;
}

type Soma = { chave: string; pf: number } & Record<FaixaVelocidade, number>;

const COLUNAS = FAIXAS_VELOCIDADE.map((f) => `SUM(vel_${f.id}) AS ${f.id}`).join(', ');

/** Perfil da competencia agrupado por municipio ou por empresa; `null` agrupa o Estado inteiro. */
export function consultarPerfis(
  db: Banco,
  competencia: string,
  agrupamento: 'codigo_ibge' | 'empresa_id' | null,
): Map<string, PerfilAcessos> {
  const chave = agrupamento ?? "'estado'";
  const linhas = db
    .prepare(
      `SELECT ${chave} AS chave, SUM(pessoa_fisica) AS pf, ${COLUNAS}
         FROM fato_perfil WHERE competencia = ?
        GROUP BY ${chave}`,
    )
    .all(competencia) as Soma[];
  return new Map(linhas.filter((l) => l.chave !== null).map((l) => [l.chave, montarPerfil(l)]));
}

export function montarPerfil(soma: { pf: number } & Record<FaixaVelocidade, number>): PerfilAcessos {
  const faixasVelocidade = FAIXAS_VELOCIDADE.map((f) => ({
    faixa: f.id,
    rotulo: f.rotulo,
    acessos: soma[f.id] ?? 0,
  }));
  const acessosComVelocidade = faixasVelocidade.reduce((s, f) => s + f.acessos, 0);
  const lentas = (soma.ate10 ?? 0) + (soma.de10a50 ?? 0);
  return {
    acessosPessoaFisica: soma.pf ?? 0,
    acessosComVelocidade,
    faixasVelocidade,
    percentualAbaixo50: acessosComVelocidade > 0 ? (lentas / acessosComVelocidade) * 100 : null,
  };
}

/** Acessos de pessoa fisica por 100 domicilios. null sem denominador. */
export function densidade(acessosPessoaFisica: number, domicilios: number | undefined): number | null {
  return domicilios && domicilios > 0 ? (acessosPessoaFisica * 100) / domicilios : null;
}
