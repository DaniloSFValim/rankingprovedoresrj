/**
 * Cadastro das prestadoras na Receita Federal, a partir dos dados abertos do
 * CNPJ republicados por APIs publicas com o mesmo formato de resposta.
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

export interface FonteCnpj {
  nome: string;
  url: (cnpj: string) => string;
}

// Em ordem de preferencia. A BrasilAPI respondeu 403 a runners do GitHub
// Actions; a Minha Receita e a alternativa, com o mesmo formato de resposta.
export const FONTES_CNPJ: readonly FonteCnpj[] = [
  { nome: 'BrasilAPI', url: (c) => `https://brasilapi.com.br/api/cnpj/v1/${c}` },
  { nome: 'Minha Receita', url: (c) => `https://minhareceita.org/${c}` },
];

const CABECALHOS = {
  Accept: 'application/json',
  'User-Agent': 'netrank-rj/1.0 (+https://github.com/DaniloSFValim/rankingprovedoresrj)',
};

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

const buscarPadrao: Buscar = (url) => fetch(url, { headers: CABECALHOS });

async function consultarNaFonte(
  cnpj: string,
  fonte: FonteCnpj,
  buscar: Buscar,
  agora: () => Date,
  tentativas: number,
  pausaBase: number,
): Promise<ResultadoConsulta> {
  let motivo = 'sem tentativas';
  for (let i = 0; i < tentativas; i++) {
    try {
      const resposta = await buscar(fonte.url(cnpj));
      if (resposta.status === 200) {
        const corpo = await resposta.json();
        if (typeof corpo !== 'object' || corpo === null) return { tipo: 'falha', motivo: 'corpo invalido' };
        return {
          tipo: 'ok',
          cadastro: converterRespostaBrasilApi(cnpj, corpo as Record<string, unknown>, agora().toISOString()),
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
  return { tipo: 'falha', motivo: `${fonte.nome}: ${motivo}` };
}

/** Tenta cada fonte em ordem; a primeira resposta conclusiva vence. */
export async function consultarCnpj(
  cnpj: string,
  opcoes: {
    buscar?: Buscar;
    agora?: () => Date;
    tentativas?: number;
    pausaBaseMs?: number;
    fontes?: readonly FonteCnpj[];
  } = {},
): Promise<ResultadoConsulta> {
  const motivos: string[] = [];
  for (const fonte of opcoes.fontes ?? FONTES_CNPJ) {
    const r = await consultarNaFonte(
      cnpj,
      fonte,
      opcoes.buscar ?? buscarPadrao,
      opcoes.agora ?? (() => new Date()),
      opcoes.tentativas ?? 4,
      opcoes.pausaBaseMs ?? 2000,
    );
    if (r.tipo !== 'falha') return r;
    motivos.push(r.motivo);
  }
  return { tipo: 'falha', motivo: motivos.join('; ') };
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
