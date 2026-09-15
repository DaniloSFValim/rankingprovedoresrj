/**
 * Etapa CALCULOS -> API -> DASHBOARDS do pipeline (§6).
 *
 * Decisao arquitetural (ver docs/adr/0001-arquitetura.md): o mercado de banda
 * larga fixa do RJ, agregado, cabe em poucos megabytes. Em vez de manter um
 * servidor de API consultado a cada grafico, o build materializa os recortes
 * analiticos em JSON estatico — o equivalente a materialized views (§41),
 * servidas por CDN. O navegador nunca recebe milhoes de registros: recebe o
 * recorte ja calculado.
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  calcularConcentracao,
  canonizarTexto,
  compararRankings,
  construirRanking,
  crescimentoAbsoluto,
  crescimentoPercentual,
  deslocarCompetencia,
  marketShare,
  type Competencia,
  type IndicadoresConcentracao,
  type LinhaRankingComVariacao,
  type ParticipanteMercado,
  type ProcedenciaDados,
  type Tecnologia,
} from '@netrank/core';
import type { Banco } from '../warehouse/db.js';

// --------------------------------------------------------------- contratos --

export interface EmpresaResumo {
  id: string;
  slug: string;
  nome: string;
  grupoEconomico: string | null;
}

export interface MunicipioResumo {
  codigoIbge: string;
  slug: string;
  nome: string;
}

export interface KpisEstado {
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

export interface PresencaMunicipal {
  codigoIbge: string;
  slug: string;
  nome: string;
  acessos: number;
  marketShareLocal: number | null;
  posicaoLocal: number;
  lidera: boolean;
}

// ------------------------------------------------------------------ apoio ---

/** Slug estavel e legivel, usado em URLs compartilhaveis (§35). */
export function gerarSlug(texto: string): string {
  return canonizarTexto(texto).toLowerCase().replace(/ /g, '-').slice(0, 80) || 'sem-nome';
}

/**
 * Atribui slugs unicos. Colisao recebe sufixo numerico deterministico
 * (ordenacao por id) para que o slug de uma empresa nao mude entre builds.
 */
function atribuirSlugs<T extends { id: string; nome: string }>(
  itens: readonly T[],
): Map<string, string> {
  const usados = new Map<string, number>();
  const resultado = new Map<string, string>();
  for (const item of [...itens].sort((a, b) => a.id.localeCompare(b.id))) {
    const base = gerarSlug(item.nome);
    const contagem = usados.get(base) ?? 0;
    usados.set(base, contagem + 1);
    resultado.set(item.id, contagem === 0 ? base : `${base}-${contagem + 1}`);
  }
  return resultado;
}

function escrever(destino: string, conteudo: unknown): void {
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.writeFileSync(destino, JSON.stringify(conteudo), 'utf8');
}

// ------------------------------------------------------------- construcao ---

interface Contexto {
  competencias: Competencia[];
  empresas: Map<string, EmpresaResumo>;
  municipios: Map<string, MunicipioResumo>;
  /** competencia -> empresaId -> acessos (estado inteiro). */
  estadoPorCompetencia: Map<Competencia, Map<string, number>>;
  /** competencia -> codigoIbge -> empresaId -> acessos. */
  municipalPorCompetencia: Map<Competencia, Map<string, Map<string, number>>>;
  /** competencia -> tecnologia -> acessos. */
  tecnologiaPorCompetencia: Map<Competencia, Map<Tecnologia, number>>;
}

function carregarContexto(db: Banco): Contexto {
  const competencias = (
    db.prepare('SELECT DISTINCT competencia FROM fato_acessos ORDER BY competencia').all() as Array<{
      competencia: Competencia;
    }>
  ).map((r) => r.competencia);

  const empresasBrutas = db
    .prepare(
      `SELECT e.id, e.nome_normalizado AS nome, g.nome AS grupo
         FROM empresas e LEFT JOIN grupos_economicos g ON g.id = e.grupo_economico_id`,
    )
    .all() as Array<{ id: string; nome: string; grupo: string | null }>;
  const slugsEmpresa = atribuirSlugs(empresasBrutas);
  const empresas = new Map<string, EmpresaResumo>(
    empresasBrutas.map((e) => [
      e.id,
      { id: e.id, slug: slugsEmpresa.get(e.id)!, nome: e.nome, grupoEconomico: e.grupo },
    ]),
  );

  const municipiosBrutos = db
    .prepare('SELECT codigo_ibge AS id, nome FROM municipios')
    .all() as Array<{ id: string; nome: string }>;
  const slugsMunicipio = atribuirSlugs(municipiosBrutos);
  const municipios = new Map<string, MunicipioResumo>(
    municipiosBrutos.map((m) => [
      m.id,
      { codigoIbge: m.id, slug: slugsMunicipio.get(m.id)!, nome: m.nome },
    ]),
  );

  const estadoPorCompetencia = new Map<Competencia, Map<string, number>>();
  const municipalPorCompetencia = new Map<Competencia, Map<string, Map<string, number>>>();
  const tecnologiaPorCompetencia = new Map<Competencia, Map<Tecnologia, number>>();

  const fatos = db
    .prepare(
      `SELECT competencia, codigo_ibge, empresa_id, tecnologia, SUM(acessos) AS acessos
         FROM fato_acessos
        GROUP BY competencia, codigo_ibge, empresa_id, tecnologia`,
    )
    .all() as Array<{
    competencia: Competencia;
    codigo_ibge: string;
    empresa_id: string;
    tecnologia: Tecnologia;
    acessos: number;
  }>;

  for (const f of fatos) {
    let estado = estadoPorCompetencia.get(f.competencia);
    if (!estado) estadoPorCompetencia.set(f.competencia, (estado = new Map()));
    estado.set(f.empresa_id, (estado.get(f.empresa_id) ?? 0) + f.acessos);

    let porMunicipio = municipalPorCompetencia.get(f.competencia);
    if (!porMunicipio) municipalPorCompetencia.set(f.competencia, (porMunicipio = new Map()));
    let empresasDoMunicipio = porMunicipio.get(f.codigo_ibge);
    if (!empresasDoMunicipio) porMunicipio.set(f.codigo_ibge, (empresasDoMunicipio = new Map()));
    empresasDoMunicipio.set(
      f.empresa_id,
      (empresasDoMunicipio.get(f.empresa_id) ?? 0) + f.acessos,
    );

    let tec = tecnologiaPorCompetencia.get(f.competencia);
    if (!tec) tecnologiaPorCompetencia.set(f.competencia, (tec = new Map()));
    tec.set(f.tecnologia, (tec.get(f.tecnologia) ?? 0) + f.acessos);
  }

  return {
    competencias,
    empresas,
    municipios,
    estadoPorCompetencia,
    municipalPorCompetencia,
    tecnologiaPorCompetencia,
  };
}

const participantes = (mapa: Map<string, number> | undefined): ParticipanteMercado[] =>
  mapa ? [...mapa].map(([empresaId, acessos]) => ({ empresaId, acessos })) : [];

const somar = (mapa: Map<string, number> | undefined): number =>
  mapa ? [...mapa.values()].reduce((s, v) => s + v, 0) : 0;

function variacaoEntre(
  ctx: Contexto,
  competencia: Competencia,
  meses: number,
): { absoluta: number; percentual: number | null } | null {
  const anterior = deslocarCompetencia(competencia, -meses);
  if (!ctx.estadoPorCompetencia.has(anterior)) return null;
  const atual = somar(ctx.estadoPorCompetencia.get(competencia));
  const antes = somar(ctx.estadoPorCompetencia.get(anterior));
  return {
    absoluta: crescimentoAbsoluto(atual, antes),
    percentual: crescimentoPercentual(atual, antes),
  };
}

function rankingEstadualComparado(
  ctx: Contexto,
  competencia: Competencia,
  mesesComparacao: number,
): LinhaRankingComVariacao[] {
  const atual = construirRanking(participantes(ctx.estadoPorCompetencia.get(competencia)));
  const anteriorCompetencia = deslocarCompetencia(competencia, -mesesComparacao);
  const anterior = ctx.estadoPorCompetencia.has(anteriorCompetencia)
    ? construirRanking(participantes(ctx.estadoPorCompetencia.get(anteriorCompetencia)))
    : [];
  return compararRankings(atual, anterior);
}

/** Numero de municipios em que cada empresa possui acessos na competencia. */
function municipiosPorEmpresa(ctx: Contexto, competencia: Competencia): Map<string, number> {
  const contagem = new Map<string, number>();
  const porMunicipio = ctx.municipalPorCompetencia.get(competencia);
  if (!porMunicipio) return contagem;
  for (const empresas of porMunicipio.values()) {
    for (const [empresaId, acessos] of empresas) {
      if (acessos > 0) contagem.set(empresaId, (contagem.get(empresaId) ?? 0) + 1);
    }
  }
  return contagem;
}

export interface OpcoesBuild {
  destino: string;
  procedencia: ProcedenciaDados;
  /** Tamanho do top exportado para a corrida do ranking (§13). */
  topCorrida?: number;
}

export function construirArtefatos(db: Banco, opcoes: OpcoesBuild): {
  competenciaAtual: Competencia;
  arquivosGerados: number;
} {
  const ctx = carregarContexto(db);
  if (ctx.competencias.length === 0) {
    throw new Error(
      'Warehouse vazio: nenhuma competencia carregada. Rode a importacao antes do build.',
    );
  }

  const destino = opcoes.destino;
  const topCorrida = opcoes.topCorrida ?? 20;
  const atual = ctx.competencias[ctx.competencias.length - 1]!;
  let arquivos = 0;
  const salvar = (relativo: string, conteudo: unknown) => {
    escrever(path.join(destino, relativo), conteudo);
    arquivos += 1;
  };

  // ---------------------------------------------------------------- meta ----
  salvar('meta.json', {
    procedencia: opcoes.procedencia,
    competencias: ctx.competencias,
    competenciaAtual: atual,
    numeroEmpresas: ctx.empresas.size,
    numeroMunicipios: ctx.municipios.size,
    geradoEm: new Date().toISOString(),
  });

  // -------------------------------------------------------------- estado ----
  const contagemMunicipios = municipiosPorEmpresa(ctx, atual);
  const rankingAtual = rankingEstadualComparado(ctx, atual, 1);
  const ranking12 = new Map(
    rankingEstadualComparado(ctx, atual, 12).map((l) => [l.empresaId, l]),
  );
  const concentracaoAtual = calcularConcentracao(
    participantes(ctx.estadoPorCompetencia.get(atual)),
  );

  const linhasRanking = rankingAtual.map((l) => ({
    ...l,
    slug: ctx.empresas.get(l.empresaId)?.slug ?? gerarSlug(l.empresaId),
    nome: ctx.empresas.get(l.empresaId)?.nome ?? l.empresaId,
    grupoEconomico: ctx.empresas.get(l.empresaId)?.grupoEconomico ?? null,
    municipiosAtendidos: contagemMunicipios.get(l.empresaId) ?? 0,
    variacao12Absoluta: ranking12.get(l.empresaId)?.variacaoAbsoluta ?? null,
    variacao12Percentual: ranking12.get(l.empresaId)?.variacaoPercentual ?? null,
  }));

  const lider = linhasRanking[0];
  const kpis: KpisEstado = {
    competencia: atual,
    totalAcessos: somar(ctx.estadoPorCompetencia.get(atual)),
    numeroProvedores: linhasRanking.length,
    numeroMunicipios: ctx.municipalPorCompetencia.get(atual)?.size ?? 0,
    lider: lider
      ? {
          empresaId: lider.empresaId,
          nome: lider.nome,
          acessos: lider.acessos,
          marketShare: lider.marketShare,
        }
      : null,
    concentracao: concentracaoAtual,
    variacao12Meses: variacaoEntre(ctx, atual, 12),
    variacaoMensal: variacaoEntre(ctx, atual, 1),
  };

  salvar('estado/kpis.json', kpis);
  salvar('estado/ranking.json', { competencia: atual, linhas: linhasRanking });

  // Serie historica do mercado estadual (§12).
  const serie: PontoSerie[] = ctx.competencias.map((c) => {
    const p = participantes(ctx.estadoPorCompetencia.get(c));
    const conc = calcularConcentracao(p);
    return {
      competencia: c,
      totalAcessos: somar(ctx.estadoPorCompetencia.get(c)),
      numeroProvedores: p.filter((x) => x.acessos > 0).length,
      hhi: conc?.hhi ?? null,
      cr5: conc?.cr5 ?? null,
    };
  });
  salvar('estado/serie.json', serie);

  // Corrida do ranking (§13): posicao e acessos por competencia para o top N final.
  const elegiveis = new Set(linhasRanking.slice(0, topCorrida).map((l) => l.empresaId));
  const corrida = ctx.competencias.map((c) => {
    const ranking = construirRanking(participantes(ctx.estadoPorCompetencia.get(c)));
    return {
      competencia: c,
      posicoes: ranking
        .filter((l) => elegiveis.has(l.empresaId))
        .map((l) => ({
          empresaId: l.empresaId,
          posicao: l.posicao,
          acessos: l.acessos,
          marketShare: l.marketShare,
        })),
    };
  });
  salvar('estado/corrida.json', {
    empresas: [...elegiveis].map((id) => ({
      id,
      slug: ctx.empresas.get(id)?.slug ?? gerarSlug(id),
      nome: ctx.empresas.get(id)?.nome ?? id,
    })),
    competencias: corrida,
  });

  // Serie por empresa, para o seletor de comparacao (§12).
  salvar(
    'estado/series-empresas.json',
    [...ctx.empresas.values()].map((e) => ({
      id: e.id,
      slug: e.slug,
      nome: e.nome,
      pontos: ctx.competencias.map((c) => ctx.estadoPorCompetencia.get(c)?.get(e.id) ?? 0),
    })),
  );

  // --------------------------------------------------------- tecnologia ----
  salvar(
    'estado/tecnologia.json',
    ctx.competencias.map((c) => ({
      competencia: c,
      distribuicao: Object.fromEntries(ctx.tecnologiaPorCompetencia.get(c) ?? []),
    })),
  );

  // --------------------------------------------------------- municipios ----
  const indiceMunicipios: MunicipioIndice[] = [];
  const municipiosAtual = ctx.municipalPorCompetencia.get(atual) ?? new Map();

  for (const [codigoIbge, empresasDoMunicipio] of municipiosAtual) {
    const resumo = ctx.municipios.get(codigoIbge);
    const p = participantes(empresasDoMunicipio);
    const conc = calcularConcentracao(p);
    const rankingLocal = construirRanking(p);
    const liderLocal = rankingLocal[0];

    const anterior12 = deslocarCompetencia(atual, -12);
    const antes = ctx.municipalPorCompetencia.get(anterior12)?.get(codigoIbge);
    const totalAtual = somar(empresasDoMunicipio);
    const totalAntes = antes ? somar(antes) : null;

    indiceMunicipios.push({
      codigoIbge,
      slug: resumo?.slug ?? gerarSlug(codigoIbge),
      nome: resumo?.nome ?? codigoIbge,
      totalAcessos: totalAtual,
      numeroProvedores: conc?.numeroProvedores ?? 0,
      liderEmpresaId: liderLocal?.empresaId ?? null,
      liderNome: liderLocal ? ctx.empresas.get(liderLocal.empresaId)?.nome ?? null : null,
      liderMarketShare: liderLocal?.marketShare ?? null,
      cr3: conc?.cr3 ?? null,
      hhi: conc?.hhi ?? null,
      variacao12Meses:
        totalAntes === null
          ? null
          : {
              absoluta: crescimentoAbsoluto(totalAtual, totalAntes),
              percentual: crescimentoPercentual(totalAtual, totalAntes),
            },
    });

    // Perfil individual do municipio (§22).
    const serieMunicipio = ctx.competencias.map((c) => {
      const mapa = ctx.municipalPorCompetencia.get(c)?.get(codigoIbge);
      const concC = calcularConcentracao(participantes(mapa));
      return {
        competencia: c,
        totalAcessos: somar(mapa),
        numeroProvedores: concC?.numeroProvedores ?? 0,
        hhi: concC?.hhi ?? null,
      };
    });

    const anteriorMes = ctx.municipalPorCompetencia.get(deslocarCompetencia(atual, -1))?.get(codigoIbge);
    const rankingComparado = compararRankings(
      rankingLocal,
      anteriorMes ? construirRanking(participantes(anteriorMes)) : [],
    );

    salvar(`municipios/${resumo?.slug ?? codigoIbge}.json`, {
      codigoIbge,
      nome: resumo?.nome ?? codigoIbge,
      competencia: atual,
      concentracao: conc,
      ranking: rankingComparado.map((l) => ({
        ...l,
        slug: ctx.empresas.get(l.empresaId)?.slug ?? gerarSlug(l.empresaId),
        nome: ctx.empresas.get(l.empresaId)?.nome ?? l.empresaId,
      })),
      serie: serieMunicipio,
    });
  }

  indiceMunicipios.sort((a, b) => b.totalAcessos - a.totalAcessos);
  salvar('municipios/index.json', { competencia: atual, municipios: indiceMunicipios });

  // ---------------------------------------------------------- provedores ----
  const indiceProvedores = linhasRanking.map((l) => ({
    id: l.empresaId,
    slug: l.slug,
    nome: l.nome,
    acessos: l.acessos,
    marketShare: l.marketShare,
    posicao: l.posicao,
    municipiosAtendidos: l.municipiosAtendidos,
  }));
  salvar('provedores/index.json', { competencia: atual, provedores: indiceProvedores });

  for (const linha of linhasRanking) {
    const empresaId = linha.empresaId;

    const presenca: PresencaMunicipal[] = [];
    for (const [codigoIbge, empresasDoMunicipio] of municipiosAtual) {
      const acessos = empresasDoMunicipio.get(empresaId);
      if (!acessos || acessos <= 0) continue;
      const rankingLocal = construirRanking(participantes(empresasDoMunicipio));
      const posicao = rankingLocal.find((l) => l.empresaId === empresaId)!.posicao;
      const resumo = ctx.municipios.get(codigoIbge);
      presenca.push({
        codigoIbge,
        slug: resumo?.slug ?? gerarSlug(codigoIbge),
        nome: resumo?.nome ?? codigoIbge,
        acessos,
        marketShareLocal: marketShare(acessos, somar(empresasDoMunicipio)),
        posicaoLocal: posicao,
        lidera: posicao === 1,
      });
    }
    presenca.sort((a, b) => b.acessos - a.acessos);

    // Evolucao territorial (§25): contagem de municipios por competencia.
    const territorio = ctx.competencias.map((c) => {
      const porMunicipio = ctx.municipalPorCompetencia.get(c);
      let atendidos = 0;
      let liderancas = 0;
      if (porMunicipio) {
        for (const empresasDoMunicipio of porMunicipio.values()) {
          const acessos = empresasDoMunicipio.get(empresaId);
          if (!acessos || acessos <= 0) continue;
          atendidos += 1;
          const rankingLocal = construirRanking(participantes(empresasDoMunicipio));
          if (rankingLocal[0]?.empresaId === empresaId) liderancas += 1;
        }
      }
      return { competencia: c, municipiosAtendidos: atendidos, municipiosLiderados: liderancas };
    });

    const serieEmpresa = ctx.competencias.map((c) => {
      const mapa = ctx.estadoPorCompetencia.get(c);
      const acessos = mapa?.get(empresaId) ?? 0;
      const ranking = construirRanking(participantes(mapa));
      return {
        competencia: c,
        acessos,
        posicao: ranking.find((l) => l.empresaId === empresaId)?.posicao ?? null,
        marketShare: marketShare(acessos, somar(mapa)),
      };
    });

    salvar(`provedores/${linha.slug}.json`, {
      id: empresaId,
      slug: linha.slug,
      nome: linha.nome,
      grupoEconomico: linha.grupoEconomico,
      competencia: atual,
      posicao: linha.posicao,
      acessos: linha.acessos,
      marketShare: linha.marketShare,
      variacaoMensal: {
        absoluta: linha.variacaoAbsoluta,
        percentual: linha.variacaoPercentual,
      },
      variacao12Meses: {
        absoluta: linha.variacao12Absoluta,
        percentual: linha.variacao12Percentual,
      },
      municipiosAtendidos: presenca.length,
      municipiosLiderados: presenca.filter((p) => p.lidera).length,
      presenca,
      territorio,
      serie: serieEmpresa,
    });
  }

  // ------------------------------------------------------- movimentacoes ----
  salvar('movimentacoes.json', construirMovimentacoes(ctx, atual, linhasRanking));

  return { competenciaAtual: atual, arquivosGerados: arquivos };
}

/**
 * Radar de mudancas (§27). Todos os destaques sao derivados dos dados, sem
 * texto editorial: o modulo produz fatos ordenados, e a interface os apresenta.
 */
function construirMovimentacoes(
  ctx: Contexto,
  atual: Competencia,
  ranking: ReadonlyArray<{
    empresaId: string;
    slug: string;
    nome: string;
    variacaoAbsoluta: number | null;
    variacaoPercentual: number | null;
    variacaoPosicao: number | null;
  }>,
) {
  const comparaveis = ranking.filter((l) => l.variacaoAbsoluta !== null);
  const anterior = deslocarCompetencia(atual, -1);

  const porAbsoluta = [...comparaveis].sort(
    (a, b) => (b.variacaoAbsoluta ?? 0) - (a.variacaoAbsoluta ?? 0),
  );
  const comPercentual = comparaveis.filter((l) => l.variacaoPercentual !== null);
  const porPercentual = [...comPercentual].sort(
    (a, b) => (b.variacaoPercentual ?? 0) - (a.variacaoPercentual ?? 0),
  );
  const porPosicao = comparaveis.filter((l) => (l.variacaoPosicao ?? 0) !== 0);

  // Expansao territorial: diferenca de municipios atendidos entre as duas competencias.
  const municipiosAtual = municipiosPorEmpresa(ctx, atual);
  const municipiosAnterior = municipiosPorEmpresa(ctx, anterior);
  const expansao = [...municipiosAtual]
    .map(([empresaId, contagem]) => ({
      empresaId,
      slug: ctx.empresas.get(empresaId)?.slug ?? gerarSlug(empresaId),
      nome: ctx.empresas.get(empresaId)?.nome ?? empresaId,
      municipiosAtual: contagem,
      variacao: contagem - (municipiosAnterior.get(empresaId) ?? 0),
    }))
    .filter((e) => municipiosAnterior.size > 0)
    .sort((a, b) => b.variacao - a.variacao);

  // Trocas de lideranca municipal (§26).
  const trocasLideranca: Array<{
    codigoIbge: string;
    slug: string;
    nome: string;
    liderAtual: string;
    liderAnterior: string;
  }> = [];
  const municipaisAtual = ctx.municipalPorCompetencia.get(atual);
  const municipaisAnterior = ctx.municipalPorCompetencia.get(anterior);
  if (municipaisAtual && municipaisAnterior) {
    for (const [codigoIbge, empresas] of municipaisAtual) {
      const antes = municipaisAnterior.get(codigoIbge);
      if (!antes) continue;
      const liderAtual = construirRanking(participantes(empresas))[0]?.empresaId;
      const liderAntes = construirRanking(participantes(antes))[0]?.empresaId;
      if (liderAtual && liderAntes && liderAtual !== liderAntes) {
        const resumo = ctx.municipios.get(codigoIbge);
        trocasLideranca.push({
          codigoIbge,
          slug: resumo?.slug ?? gerarSlug(codigoIbge),
          nome: resumo?.nome ?? codigoIbge,
          liderAtual: ctx.empresas.get(liderAtual)?.nome ?? liderAtual,
          liderAnterior: ctx.empresas.get(liderAntes)?.nome ?? liderAntes,
        });
      }
    }
  }

  return {
    competencia: atual,
    competenciaComparada: anterior,
    temBaseDeComparacao: comparaveis.length > 0,
    maioresCrescimentosAbsolutos: porAbsoluta.slice(0, 10),
    maioresRetracoesAbsolutas: porAbsoluta.slice(-10).reverse(),
    maioresCrescimentosPercentuais: porPercentual.slice(0, 10),
    maioresRetracoesPercentuais: porPercentual.slice(-10).reverse(),
    maioresAvancosRanking: [...porPosicao]
      .sort((a, b) => (b.variacaoPosicao ?? 0) - (a.variacaoPosicao ?? 0))
      .slice(0, 10),
    maioresQuedasRanking: [...porPosicao]
      .sort((a, b) => (a.variacaoPosicao ?? 0) - (b.variacaoPosicao ?? 0))
      .slice(0, 10),
    maioresExpansoesTerritoriais: expansao.slice(0, 10),
    maioresRetracoesTerritoriais: expansao.slice(-10).reverse(),
    trocasLiderancaMunicipal: trocasLideranca,
  };
}
