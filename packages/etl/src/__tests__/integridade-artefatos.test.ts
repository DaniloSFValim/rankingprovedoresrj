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

describe('coerência entre artefatos (tabelas, mapa e páginas)', () => {
  interface Provedor {
    id: string;
    acessos: number;
    posicao: number;
    municipiosAtendidos: number;
    presenca: Array<{ codigoIbge: string; acessos: number }>;
  }
  const lerProvedores = (): Provedor[] =>
    readdirSync(join(DADOS, 'provedores'))
      .filter((f) => f.endsWith('.json') && f !== 'index.json')
      .map((f) => ler<Provedor>(`provedores/${f}`));
  const provedores = lerProvedores();
  const porId = new Map(provedores.map((p) => [p.id, p]));
  const indice = ler<{ municipios: Array<Municipio & { liderEmpresaId: string | null }> }>(
    'municipios/index.json',
  ).municipios;
  const ranking = ler<{ linhas: Array<Linha & { municipiosAtendidos: number }> }>('estado/ranking.json').linhas;

  it('malha do IBGE e índice têm os mesmos 92 códigos e os mesmos nomes', () => {
    const malha = ler<{ features: Array<{ properties: { codigoIbge: string; nome: string } }> }>(
      'malhas/rj-municipios.json',
    ).features.map((f) => f.properties);
    expect(malha).toHaveLength(92);
    const nomes = new Map(malha.map((m) => [m.codigoIbge, m.nome]));
    for (const m of indice) expect(nomes.get(m.codigoIbge)).toBe(m.nome);
  });

  it('nenhuma prestadora repetida: id, slug e raiz de CNPJ únicos', () => {
    const linhas = ranking as Array<Linha & { cnpj?: string }>;
    expect(new Set(linhas.map((l) => l.empresaId)).size).toBe(linhas.length);
    expect(new Set(linhas.map((l) => l.slug)).size).toBe(linhas.length);
    const raizes = linhas.filter((l) => l.cnpj).map((l) => l.cnpj!.slice(0, 8));
    expect(new Set(raizes).size).toBe(raizes.length);
  });

  it('página do provedor repete posição, acessos e municípios do ranking', () => {
    for (const l of ranking) {
      const p = porId.get(l.empresaId)!;
      expect([p.posicao, p.acessos, p.municipiosAtendidos]).toEqual([l.posicao, l.acessos, l.municipiosAtendidos]);
      expect(p.presenca.reduce((s, x) => s + x.acessos, 0)).toBe(p.acessos);
    }
  });

  it('acessos por município somados a partir dos provedores fecham com o índice e o ranking local', () => {
    const soma = new Map<string, number>();
    for (const p of provedores)
      for (const x of p.presenca) soma.set(x.codigoIbge, (soma.get(x.codigoIbge) ?? 0) + x.acessos);
    for (const m of indice) {
      expect(soma.get(m.codigoIbge) ?? 0).toBe(m.totalAcessos);
      const local = ler<{ ranking: Linha[] }>(`municipios/${m.slug}.json`).ranking;
      for (const r of local) {
        const presenca = porId.get(r.empresaId)?.presenca.find((x) => x.codigoIbge === m.codigoIbge);
        expect(presenca?.acessos ?? 0).toBe(r.acessos);
      }
      if (local.length) expect(local[0]!.empresaId).toBe(m.liderEmpresaId);
    }
  });

  it('série estadual é a soma das séries de todas as prestadoras, mês a mês', () => {
    const serie = ler<Array<{ totalAcessos: number | null; numeroProvedores: number | null }>>('estado/serie.json');
    const empresas = ler<Array<{ pontos: Array<number | null> }>>('estado/series-empresas.json');
    serie.forEach((p, i) => {
      if (p.totalAcessos === null) return;
      const valores = empresas.map((e) => e.pontos[i] ?? 0);
      expect(valores.reduce((s, v) => s + v, 0)).toBe(p.totalAcessos);
      expect(valores.filter((v) => v > 0)).toHaveLength(p.numeroProvedores!);
    });
  });

  it('densidade é acessos de pessoa física por 100 domicílios', () => {
    for (const m of indice) {
      const f = ler<{ densidade: number | null; domicilios: number | null; perfilAcessos: { acessosPessoaFisica: number } }>(
        `municipios/${m.slug}.json`,
      );
      if (f.densidade === null || !f.domicilios) continue;
      expect(f.densidade).toBeCloseTo((100 * f.perfilAcessos.acessosPessoaFisica) / f.domicilios, 6);
    }
  });
});
