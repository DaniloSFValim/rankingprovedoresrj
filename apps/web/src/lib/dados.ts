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
  grupoEconomico: string | null;
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

export interface Kpis {
  competencia: Competencia;
  totalAcessos: number;
  numeroProvedores: number;
  numeroMunicipios: number;
  lider: { empresaId: string; nome: string; acessos: number; marketShare: number } | null;
  concentracao: IndicadoresConcentracao | null;
  variacao12Meses: { absoluta: number; percentual: number | null } | null;
  variacaoMensal: { absoluta: number; percentual: number | null } | null;
}

export interface PontoSerie {
  competencia: Competencia;
  totalAcessos: number;
  numeroProvedores: number;
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
}

export interface PerfilMunicipio {
  codigoIbge: string;
  nome: string;
  competencia: Competencia;
  concentracao: IndicadoresConcentracao | null;
  ranking: Array<{
    posicao: number;
    empresaId: string;
    slug: string;
    nome: string;
    acessos: number;
    marketShare: number;
    variacaoPosicao: number | null;
    variacaoAbsoluta: number | null;
    variacaoPercentual: number | null;
  }>;
  serie: Array<{
    competencia: Competencia;
    totalAcessos: number;
    numeroProvedores: number;
    hhi: number | null;
  }>;
}

export interface PerfilProvedor {
  id: string;
  slug: string;
  nome: string;
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

export interface Corrida {
  empresas: Array<{ id: string; slug: string; nome: string }>;
  competencias: Array<{
    competencia: Competencia;
    posicoes: Array<{
      empresaId: string; posicao: number; acessos: number; marketShare: number;
    }>;
  }>;
}

// ------------------------------------------------------------------ leitura --

export const lerMeta = (): Meta => ler<Meta>('meta.json');
export const lerKpis = (): Kpis => ler<Kpis>('estado/kpis.json');
export const lerSerieEstado = (): PontoSerie[] => ler<PontoSerie[]>('estado/serie.json');
export const lerCorrida = (): Corrida => ler<Corrida>('estado/corrida.json');
export const lerMovimentacoes = (): Movimentacoes => ler<Movimentacoes>('movimentacoes.json');

export const lerRankingEstadual = (): LinhaRankingEstadual[] =>
  ler<{ linhas: LinhaRankingEstadual[] }>('estado/ranking.json').linhas;

export const lerIndiceMunicipios = (): MunicipioIndice[] =>
  ler<{ municipios: MunicipioIndice[] }>('municipios/index.json').municipios;

export const lerPerfilMunicipio = (slug: string): PerfilMunicipio | null =>
  lerOpcional<PerfilMunicipio>(`municipios/${slug}.json`);

export const lerPerfilProvedor = (slug: string): PerfilProvedor | null =>
  lerOpcional<PerfilProvedor>(`provedores/${slug}.json`);

export const lerIndiceProvedores = (): Array<{
  id: string; slug: string; nome: string; acessos: number;
  marketShare: number; posicao: number; municipiosAtendidos: number;
}> => ler<{ provedores: Array<{
  id: string; slug: string; nome: string; acessos: number;
  marketShare: number; posicao: number; municipiosAtendidos: number;
}> }>('provedores/index.json').provedores;

export const lerTecnologia = (): Array<{
  competencia: Competencia;
  distribuicao: Record<string, number>;
}> => ler('estado/tecnologia.json');
