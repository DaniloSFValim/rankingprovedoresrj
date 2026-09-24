/**
 * Acesso aos artefatos analiticos.
 *
 * A leitura acontece em tempo de BUILD, no servidor: cada pagina e gerada
 * estaticamente com o recorte de que precisa. O navegador nunca busca o
 * warehouse nem recebe registros brutos (§41).
 */

import fs from 'node:fs';
import path from 'node:path';
import type {
  Competencia,
  IndicadoresConcentracao,
  ProcedenciaDados,
} from '@netrank/core';

const DIRETORIO = path.join(process.cwd(), 'public', 'data');

export class ArtefatosAusentesError extends Error {
  constructor() {
    super(
      'Artefatos de dados nao encontrados em apps/web/public/data. ' +
        'Rode `npm run etl -- demo` (desenvolvimento) ou ' +
        '`npm run etl -- importar <csv>` seguido de `npm run etl -- build`.',
    );
    this.name = 'ArtefatosAusentesError';
  }
}

export function artefatosDisponiveis(): boolean {
  return fs.existsSync(path.join(DIRETORIO, 'meta.json'));
}

function ler<T>(relativo: string): T {
  const destino = path.join(DIRETORIO, relativo);
  if (!fs.existsSync(destino)) {
    if (!artefatosDisponiveis()) throw new ArtefatosAusentesError();
    throw new Error(`Artefato ausente: ${relativo}`);
  }
  return JSON.parse(fs.readFileSync(destino, 'utf8')) as T;
}

function lerOpcional<T>(relativo: string): T | null {
  const destino = path.join(DIRETORIO, relativo);
  if (!fs.existsSync(destino)) return null;
  return JSON.parse(fs.readFileSync(destino, 'utf8')) as T;
}

// ---------------------------------------------------------------- contratos --

export interface Meta {
  procedencia: ProcedenciaDados;
  competencias: Competencia[];
  /** Competências ausentes no meio da série, quando houver. */
  lacunas?: Competencia[];
  competenciaAtual: Competencia;
  numeroEmpresas: number;
  numeroMunicipios: number;
  geradoEm: string;
}

export interface LinhaRankingEstadual {
  posicao: number;
  empresaId: string;
  slug: string;
  nome: string;
  cnpj: string | null;
  grupoEconomico: string | null;
  tipoAtuacao: 'OPERADORA' | 'PROVEDOR' | 'AMBOS' | 'INDEFINIDO';
  acessos: number;
  marketShare: number;
  posicaoAnterior: number | null;
  variacaoPosicao: number | null;
  variacaoAbsoluta: number | null;
  variacaoPercentual: number | null;
  variacao12Absoluta: number | null;
  variacao12Percentual: number | null;
  municipiosAtendidos: number;
}

/** Perfil dos acessos: pessoa física e velocidade contratada (safras 2021+). */
export interface PerfilAcessos {
  acessosPessoaFisica: number;
  acessosComVelocidade: number;
  faixasVelocidade: Array<{ faixa: string; rotulo: string; acessos: number }>;
  percentualAbaixo50: number | null;
}

export interface Kpis {
  competencia: Competencia;
  totalAcessos: number;
  /** Acessos de pessoa física por 100 domicílios (Censo 2022). */
  densidadeEstado: number | null;
  perfilAcessos?: PerfilAcessos | null;
  numeroProvedores: number;
  numeroMunicipios: number;
  lider: { empresaId: string; nome: string; acessos: number; marketShare: number } | null;
  concentracao: IndicadoresConcentracao | null;
  variacao12Meses: { absoluta: number; percentual: number | null } | null;
  variacaoMensal: { absoluta: number; percentual: number | null } | null;
}

export interface PontoSerie {
  competencia: Competencia;
  /** null quando a competência não consta na base — ausência, não zero. */
  totalAcessos: number | null;
  numeroProvedores: number | null;
  hhi: number | null;
  cr5: number | null;
}

export interface MunicipioIndice {
  codigoIbge: string;
  slug: string;
  nome: string;
  totalAcessos: number;
  numeroProvedores: number;
  liderEmpresaId: string | null;
  liderNome: string | null;
  liderMarketShare: number | null;
  cr3: number | null;
  hhi: number | null;
  variacao12Meses: { absoluta: number; percentual: number | null } | null;
  /** Ausentes em artefatos gerados antes do perfil de acessos. */
  densidade?: number | null;
  percentualAbaixo50?: number | null;
}

export interface PerfilMunicipio {
  codigoIbge: string;
  nome: string;
  competencia: Competencia;
  concentracao: IndicadoresConcentracao | null;
  variacao12Meses: { absoluta: number; percentual: number | null } | null;
  posicaoNoEstado: number | null;
  totalMunicipios: number;
  perfilAcessos: PerfilAcessos | null;
  domicilios: number | null;
  densidade: number | null;
  ranking: Array<{
    posicao: number;
    empresaId: string;
    slug: string;
    nome: string;
    cnpj: string | null;
    grupoEconomico: string | null;
    tipoAtuacao: 'OPERADORA' | 'PROVEDOR' | 'AMBOS' | 'INDEFINIDO';
    acessos: number;
    marketShare: number;
    posicaoAnterior: number | null;
    variacaoPosicao: number | null;
    variacaoAbsoluta: number | null;
    variacaoPercentual: number | null;
    variacao12Absoluta: number | null;
    variacao12Percentual: number | null;
  }>;
  serie: Array<{
    competencia: Competencia;
    totalAcessos: number | null;
    numeroProvedores: number | null;
    hhi: number | null;
  }>;
  tecnologia: Array<{ competencia: Competencia; distribuicao: Record<string, number> }>;
  saidas: Array<{
    empresaId: string; slug: string; nome: string; acessosAnteriores: number;
  }>;
}

/** Cadastro na Receita Federal (dados abertos do CNPJ, via BrasilAPI). */
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

export interface PerfilProvedor {
  id: string;
  slug: string;
  nome: string;
  cnpj: string | null;
  /** Ausente em artefatos gerados antes do cruzamento com a Receita. */
  receita?: CadastroReceita | null;
  perfilAcessos?: PerfilAcessos | null;
  grupoEconomico: string | null;
  competencia: Competencia;
  posicao: number;
  acessos: number;
  marketShare: number;
  variacaoMensal: { absoluta: number | null; percentual: number | null };
  variacao12Meses: { absoluta: number | null; percentual: number | null };
  municipiosAtendidos: number;
  municipiosLiderados: number;
  presenca: Array<{
    codigoIbge: string;
    slug: string;
    nome: string;
    acessos: number;
    marketShareLocal: number | null;
    posicaoLocal: number;
    lidera: boolean;
  }>;
  territorio: Array<{
    competencia: Competencia;
    municipiosAtendidos: number;
    municipiosLiderados: number;
  }>;
  serie: Array<{
    competencia: Competencia;
    acessos: number;
    posicao: number | null;
    marketShare: number | null;
  }>;
}

export interface DestaqueEmpresa {
  empresaId: string;
  slug: string;
  nome: string;
  variacaoAbsoluta: number | null;
  variacaoPercentual: number | null;
  variacaoPosicao: number | null;
}

export interface Movimentacoes {
  competencia: Competencia;
  competenciaComparada: Competencia;
  temBaseDeComparacao: boolean;
  maioresCrescimentosAbsolutos: DestaqueEmpresa[];
  maioresRetracoesAbsolutas: DestaqueEmpresa[];
  maioresCrescimentosPercentuais: DestaqueEmpresa[];
  maioresRetracoesPercentuais: DestaqueEmpresa[];
  maioresAvancosRanking: DestaqueEmpresa[];
  maioresQuedasRanking: DestaqueEmpresa[];
  maioresExpansoesTerritoriais: Array<{
    empresaId: string; slug: string; nome: string;
    municipiosAtual: number; variacao: number;
  }>;
  maioresRetracoesTerritoriais: Array<{
    empresaId: string; slug: string; nome: string;
    municipiosAtual: number; variacao: number;
  }>;
  trocasLiderancaMunicipal: Array<{
    codigoIbge: string; slug: string; nome: string;
    liderAtual: string; liderAnterior: string;
  }>;
}


// ------------------------------------------------------------------ leitura --

export const lerMeta = (): Meta => ler<Meta>('meta.json');
export const lerKpis = (): Kpis => ler<Kpis>('estado/kpis.json');
export const lerSerieEstado = (): PontoSerie[] => ler<PontoSerie[]>('estado/serie.json');
export const lerMovimentacoes = (): Movimentacoes => ler<Movimentacoes>('movimentacoes.json');

export const lerRankingEstadual = (): LinhaRankingEstadual[] =>
  ler<{ linhas: LinhaRankingEstadual[] }>('estado/ranking.json').linhas;

export const lerIndiceMunicipios = (): MunicipioIndice[] =>
  ler<{ municipios: MunicipioIndice[] }>('municipios/index.json').municipios;

/**
 * Perfil municipal, normalizado contra artefatos de versoes anteriores.
 *
 * Dados e codigo sao publicados em momentos diferentes: o ETL roda no GitHub
 * Actions e commita artefatos, enquanto mudancas de interface chegam por outro
 * caminho. Entre uma coisa e outra, a aplicacao precisa ler artefatos gerados
 * por uma versao mais antiga do construtor sem quebrar o build.
 *
 * Campo novo ausente vira valor vazio ou null — nunca `undefined` solto, que
 * estouraria ao ser acessado. E ausencia continua sendo exibida como "n/d",
 * jamais como zero.
 */
export const lerPerfilMunicipio = (slug: string): PerfilMunicipio | null => {
  const bruto = lerOpcional<Partial<PerfilMunicipio> & { codigoIbge: string }>(
    `municipios/${slug}.json`,
  );
  if (!bruto) return null;

  return {
    codigoIbge: bruto.codigoIbge,
    nome: bruto.nome ?? bruto.codigoIbge,
    competencia: bruto.competencia ?? '',
    concentracao: bruto.concentracao ?? null,
    variacao12Meses: bruto.variacao12Meses ?? null,
    posicaoNoEstado: bruto.posicaoNoEstado ?? null,
    perfilAcessos: bruto.perfilAcessos ?? null,
    domicilios: bruto.domicilios ?? null,
    densidade: bruto.densidade ?? null,
    totalMunicipios: bruto.totalMunicipios ?? 0,
    ranking: (bruto.ranking ?? []).map((l) => ({
      ...l,
      cnpj: l.cnpj ?? null,
      grupoEconomico: l.grupoEconomico ?? null,
      posicaoAnterior: l.posicaoAnterior ?? null,
      variacao12Absoluta: l.variacao12Absoluta ?? null,
      variacao12Percentual: l.variacao12Percentual ?? null,
    })),
    serie: bruto.serie ?? [],
    tecnologia: bruto.tecnologia ?? [],
    saidas: bruto.saidas ?? [],
  };
};

export const lerPerfilProvedor = (slug: string): PerfilProvedor | null =>
  lerOpcional<PerfilProvedor>(`provedores/${slug}.json`);

export const lerIndiceProvedores = (): Array<{
  id: string; slug: string; nome: string; acessos: number;
  marketShare: number; posicao: number; municipiosAtendidos: number;
}> => ler<{ provedores: Array<{
  id: string; slug: string; nome: string; acessos: number;
  marketShare: number; posicao: number; municipiosAtendidos: number;
}> }>('provedores/index.json').provedores;
