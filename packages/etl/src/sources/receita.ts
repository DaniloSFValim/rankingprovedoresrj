/**
 * Cadastro das prestadoras na Receita Federal, via BrasilAPI
 * (https://brasilapi.com.br/api/cnpj/v1/{cnpj}), que republica os dados
 * abertos do CNPJ.
 *
 * O quadro societario (QSA) e descartado de proposito: sao nomes de pessoas
 * fisicas, sem ganho analitico para o painel.
 */

export interface CadastroReceita {
  cnpj: string;
  razaoSocial: string | null;
  nomeFantasia: string | null;
  situacao: string | null;
  dataSituacao: string | null;
  dataAbertura: string | null;
  porte: string | null;
  naturezaJuridica: string | null;
  cnaePrincipal: { codigo: string; descricao: string | null } | null;
  municipio: string | null;
  uf: string | null;
  capitalSocial: number | null;
  consultadoEm: string;
}

export interface CacheReceita {
  fonte: string;
  empresas: Record<string, CadastroReceita>;
}

export const URL_BRASILAPI = 'https://brasilapi.com.br/api/cnpj/v1/';

export function normalizarCnpj(bruto: string | null | undefined): string | null {
  const digitos = (bruto ?? '').replace(/\D/g, '');
  if (digitos.length === 0 || digitos.length > 14) return null;
  const cnpj = digitos.padStart(14, '0');
  return /^0+$/.test(cnpj) ? null : cnpj;
}

const texto = (v: unknown): string | null => {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t === '' ? null : t;
};

const numero = (v: unknown): number | null => {
  const n = typeof v === 'string' ? Number(v) : v;
  return typeof n === 'number' && Number.isFinite(n) ? n : null;
};

/** Converte a resposta da BrasilAPI. Campos ausentes viram null, nunca inventados. */
export function converterRespostaBrasilApi(
  cnpj: string,
  corpo: Record<string, unknown>,
  consultadoEm: string,
): CadastroReceita {
  const cnae = corpo['cnae_fiscal'];
  const codigoCnae = cnae === null || cnae === undefined ? null : String(cnae).trim();
  return {
    cnpj,
    razaoSocial: texto(corpo['razao_social']),
    nomeFantasia: texto(corpo['nome_fantasia']),
    situacao: texto(corpo['descricao_situacao_cadastral']),
    dataSituacao: texto(corpo['data_situacao_cadastral']),
    dataAbertura: texto(corpo['data_inicio_atividade']),
    porte: texto(corpo['porte']) ?? texto(corpo['descricao_porte']),
    naturezaJuridica: texto(corpo['natureza_juridica']),
    cnaePrincipal: codigoCnae
      ? { codigo: codigoCnae, descricao: texto(corpo['cnae_fiscal_descricao']) }
      : null,
    municipio: texto(corpo['municipio']),
    uf: texto(corpo['uf']),
    capitalSocial: numero(corpo['capital_social']),
    consultadoEm,
  };
}

export type ResultadoConsulta =
  | { tipo: 'ok'; cadastro: CadastroReceita }
  | { tipo: 'inexistente' }
  | { tipo: 'falha'; motivo: string };

type Buscar = (url: string) => Promise<{ status: number; json: () => Promise<unknown> }>;

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function consultarCnpj(
  cnpj: string,
  opcoes: { buscar?: Buscar; agora?: () => Date; tentativas?: number; pausaBaseMs?: number } = {},
): Promise<ResultadoConsulta> {
  const buscar: Buscar = opcoes.buscar ?? ((url) => fetch(url));
  const tentativas = opcoes.tentativas ?? 4;
  const pausaBase = opcoes.pausaBaseMs ?? 2000;
  let motivo = 'sem tentativas';

  for (let i = 0; i < tentativas; i++) {
    try {
      const resposta = await buscar(URL_BRASILAPI + cnpj);
      if (resposta.status === 200) {
        const corpo = await resposta.json();
        if (typeof corpo !== 'object' || corpo === null) return { tipo: 'falha', motivo: 'corpo invalido' };
        const agora = (opcoes.agora ?? (() => new Date()))().toISOString();
        return {
          tipo: 'ok',
          cadastro: converterRespostaBrasilApi(cnpj, corpo as Record<string, unknown>, agora),
        };
      }
      if (resposta.status === 404) return { tipo: 'inexistente' };
      motivo = `HTTP ${resposta.status}`;
      if (resposta.status !== 429 && resposta.status < 500) break;
    } catch (erro) {
      motivo = erro instanceof Error ? erro.message : String(erro);
    }
    if (i < tentativas - 1) await esperar(pausaBase * 2 ** i);
  }
  return { tipo: 'falha', motivo };
}

/** CNPJs sem cadastro ou consultados ha mais de `validadeDias`. */
export function cnpjsParaConsultar(
  cnpjs: Iterable<string>,
  cache: CacheReceita,
  agora: Date,
  validadeDias = 30,
): string[] {
  const limite = agora.getTime() - validadeDias * 86_400_000;
  const pendentes: string[] = [];
  for (const cnpj of new Set(cnpjs)) {
    const existente = cache.empresas[cnpj];
    if (!existente || Date.parse(existente.consultadoEm) < limite) pendentes.push(cnpj);
  }
  return pendentes;
}
