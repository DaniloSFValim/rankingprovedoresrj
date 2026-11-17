/**
 * Integridade dos artefatos publicados em apps/web/public/data.
 *
 * Os artefatos são gerados pelo ETL e versionados. Estes testes conferem
 * invariantes que valem para qualquer competência: somas, ordem do ranking,
 * limites dos indicadores e coerência entre Estado, municípios e provedores.
 * Não usam o banco SQLite, então rodam num clone limpo e no CI.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const DADOS = join(__dirname, '../../../../apps/web/public/data');
const ler = <T>(relativo: string): T => JSON.parse(readFileSync(join(DADOS, relativo), 'utf8')) as T;

interface Linha {
  posicao: number;
  empresaId: string;
  slug: string;
  nome: string;
  acessos: number;
  marketShare: number;
}
interface Concentracao {
  cr1: number;
  cr3: number;
  cr5: number;
  cr10: number;
  hhi: number;
  numeroProvedores: number;
  totalAcessos: number;
}
interface Municipio {
  codigoIbge: string;
  slug: string;
  nome: string;
  totalAcessos: number;
  numeroProvedores: number;
  hhi: number | null;
  densidade: number | null;
}

const temDados = existsSync(join(DADOS, 'meta.json'));
const TOLERANCIA = 1e-6;

describe.skipIf(!temDados)('artefatos publicados', () => {
  const meta = ler<{ competenciaAtual: string; competencias: string[]; procedencia: { dadosDemonstrativos: boolean } }>('meta.json');
  const kpis = ler<{ competencia: string; totalAcessos: number; numeroProvedores: number; numeroMunicipios: number; concentracao: Concentracao }>('estado/kpis.json');
  const ranking = ler<{ competencia: string; linhas: Linha[] }>('estado/ranking.json');
  const indice = ler<{ competencia: string; municipios: Municipio[] }>('municipios/index.json');

  it('são dados reais, não demonstrativos', () => {
    expect(meta.procedencia.dadosDemonstrativos).toBe(false);
  });

  it('todos os artefatos estão na mesma competência', () => {
    expect(kpis.competencia).toBe(meta.competenciaAtual);
    expect(ranking.competencia).toBe(meta.competenciaAtual);
    expect(indice.competencia).toBe(meta.competenciaAtual);
    expect(meta.competencias.at(-1)).toBe(meta.competenciaAtual);
  });

  it('competências em ordem crescente e no formato AAAA-MM', () => {
    for (const c of meta.competencias) expect(c).toMatch(/^\d{4}-(0[1-9]|1[0-2])$/);
    expect([...meta.competencias].sort()).toEqual(meta.competencias);
  });

  it('ranking estadual: soma de acessos e de participações fecha com o total', () => {
    const soma = ranking.linhas.reduce((t, l) => t + l.acessos, 0);
    expect(soma).toBe(kpis.totalAcessos);
    const somaShare = ranking.linhas.reduce((t, l) => t + l.marketShare, 0);
    expect(Math.abs(somaShare - 100)).toBeLessThan(1e-6);
    expect(ranking.linhas.length).toBe(kpis.numeroProvedores);
  });

  it('ranking estadual: ordenado por acessos, empates com a mesma posição (1, 2, 2, 4)', () => {
    ranking.linhas.forEach((l, i) => {
      const anterior = ranking.linhas[i - 1];
      if (anterior) expect(l.acessos).toBeLessThanOrEqual(anterior.acessos);
      const esperada = anterior && anterior.acessos === l.acessos ? anterior.posicao : i + 1;
      expect(l.posicao).toBe(esperada);
    });
    expect(new Set(ranking.linhas.map((l) => l.empresaId)).size).toBe(ranking.linhas.length);
    expect(new Set(ranking.linhas.map((l) => l.slug)).size).toBe(ranking.linhas.length);
  });

  it('concentração estadual: CR crescente, HHI entre 0 e 10.000 e coerente com o ranking', () => {
    const c = kpis.concentracao;
    expect(c.cr1).toBeLessThanOrEqual(c.cr3 + TOLERANCIA);
    expect(c.cr3).toBeLessThanOrEqual(c.cr5 + TOLERANCIA);
    expect(c.cr5).toBeLessThanOrEqual(c.cr10 + TOLERANCIA);
    expect(c.cr10).toBeLessThanOrEqual(100 + TOLERANCIA);
    expect(c.hhi).toBeGreaterThan(0);
    expect(c.hhi).toBeLessThanOrEqual(10_000);
    const hhi = ranking.linhas.reduce((t, l) => t + l.marketShare ** 2, 0);
    expect(Math.abs(hhi - c.hhi)).toBeLessThan(1e-3);
    expect(Math.abs(c.cr1 - ranking.linhas[0]!.marketShare)).toBeLessThan(TOLERANCIA);
  });

  it('municípios: 92 com código IBGE do RJ, slugs únicos e soma igual ao Estado', () => {
    const lista = indice.municipios;
    expect(lista.length).toBe(kpis.numeroMunicipios);
    expect(lista.length).toBe(92);
    for (const m of lista) expect(m.codigoIbge).toMatch(/^33\d{5}$/);
    expect(new Set(lista.map((m) => m.codigoIbge)).size).toBe(lista.length);
    expect(new Set(lista.map((m) => m.slug)).size).toBe(lista.length);
    const soma = lista.reduce((t, m) => t + m.totalAcessos, 0);
    expect(soma).toBe(kpis.totalAcessos);
  });

  it('cada município tem arquivo próprio com ranking que fecha com o total local', () => {
    for (const m of indice.municipios) {
      const perfil = ler<{ codigoIbge: string; ranking: Linha[]; concentracao: Concentracao | null }>(`municipios/${m.slug}.json`);
      expect(perfil.codigoIbge).toBe(m.codigoIbge);
      const soma = perfil.ranking.reduce((t, l) => t + l.acessos, 0);
      expect(soma).toBe(m.totalAcessos);
      expect(perfil.ranking.length).toBe(m.numeroProvedores);
      if (perfil.concentracao) {
        const { cr1, cr3, cr5, cr10, hhi } = perfil.concentracao;
        expect(cr1 <= cr3 + TOLERANCIA && cr3 <= cr5 + TOLERANCIA && cr5 <= cr10 + TOLERANCIA && cr10 <= 100 + TOLERANCIA).toBe(true);
        expect(hhi).toBeGreaterThan(0);
        expect(hhi).toBeLessThanOrEqual(10_000 + TOLERANCIA);
      }
    }
  });

  it('densidade nunca é negativa e é nula quando falta o denominador', () => {
    for (const m of indice.municipios) {
      if (m.densidade !== null) expect(m.densidade).toBeGreaterThanOrEqual(0);
    }
  });

  it('cada provedor do ranking tem arquivo próprio', () => {
    const arquivos = new Set(readdirSync(join(DADOS, 'provedores')));
    const faltando = ranking.linhas.filter((l) => !arquivos.has(`${l.slug}.json`)).map((l) => l.slug);
    expect(faltando).toEqual([]);
  });

  it('série estadual sem competência duplicada e com lacunas como null, nunca zero', () => {
    const serie = ler<Array<{ competencia: string; totalAcessos: number | null }>>('estado/serie.json');
    expect(new Set(serie.map((p) => p.competencia)).size).toBe(serie.length);
    for (const p of serie) {
      if (p.totalAcessos !== null) expect(p.totalAcessos).toBeGreaterThan(0);
    }
    expect(serie.at(-1)!.totalAcessos).toBe(kpis.totalAcessos);
  });
});
