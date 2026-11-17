/**
 * Arquivo das publicações da Anatel.
 *
 * A Anatel republica a base a cada mês e revisa competências já publicadas
 * (o último mês, sobretudo). O warehouse guarda só a versão mais recente; este
 * módulo grava, a cada ingestão, um retrato completo do recorte do Rio de
 * Janeiro (competência × município × prestadora × tecnologia), para que as
 * revisões possam ser medidas depois.
 *
 * O retrato é determinístico: mesmas linhas, mesma ordem, mesmo gzip. Se o
 * conteúdo for igual ao do último retrato (a Anatel não publicou nada novo), nada
 * é gravado.
 */
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { RAIZ_REPO } from '../config.js';
import type { Banco } from '../warehouse/db.js';

export const DIRETORIO_ARQUIVO = path.join(RAIZ_REPO, 'data/arquivo-anatel');
const CABECALHO = 'competencia,codigo_ibge,empresa_id,cnpj,tecnologia,acessos';

export interface EntradaArquivo {
  arquivo: string;
  /** Data da coleta do arquivo da Anatel (AAAA-MM-DD). */
  coletadoEm: string;
  fonte: string;
  competenciaInicial: string;
  competenciaFinal: string;
  linhas: number;
  totalAcessos: number;
  /** SHA-256 do CSV sem compressão. */
  sha256: string;
}

export interface IndiceArquivo {
  descricao: string;
  publicacoes: EntradaArquivo[];
}

export type ResultadoArquivo =
  | { tipo: 'gravado'; entrada: EntradaArquivo }
  | { tipo: 'inalterado'; sha256: string }
  | { tipo: 'vazio' };

const DESCRICAO =
  'Retratos das publicações da Anatel (acessos de banda larga fixa, recorte RJ), um por publicação distinta. ' +
  'Fonte: Anatel, dados abertos. Ver README.md nesta pasta.';

const csvCampo = (v: string | number | null): string => {
  const s = v === null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Monta o CSV do retrato atual do warehouse, ordenado de forma estável. */
export function montarRetrato(db: Banco): { csv: string; linhas: number; total: number; competencias: string[] } {
  const linhas = db
    .prepare(
      `SELECT f.competencia, f.codigo_ibge, f.empresa_id, e.cnpj, f.tecnologia, f.acessos
         FROM fato_acessos f
         LEFT JOIN empresas e ON e.id = f.empresa_id
        ORDER BY f.competencia, f.codigo_ibge, f.empresa_id, f.tecnologia`,
    )
    .all() as Array<{
    competencia: string;
    codigo_ibge: string;
    empresa_id: string;
    cnpj: string | null;
    tecnologia: string;
    acessos: number;
  }>;
  const corpo = linhas.map((l) =>
    [l.competencia, l.codigo_ibge, l.empresa_id, l.cnpj, l.tecnologia, l.acessos].map(csvCampo).join(','),
  );
  return {
    csv: [CABECALHO, ...corpo].join('\n') + '\n',
    linhas: linhas.length,
    total: linhas.reduce((s, l) => s + l.acessos, 0),
    competencias: [...new Set(linhas.map((l) => l.competencia))],
  };
}

export function lerIndice(diretorio = DIRETORIO_ARQUIVO): IndiceArquivo {
  const caminho = path.join(diretorio, 'indice.json');
  if (!fs.existsSync(caminho)) return { descricao: DESCRICAO, publicacoes: [] };
  return JSON.parse(fs.readFileSync(caminho, 'utf8')) as IndiceArquivo;
}

/** Fonte mais recente registrada no warehouse (URL e data de coleta). */
function fonteAtual(db: Banco): { url: string; coletadoEm: string } {
  const f = db
    .prepare(
      `SELECT url, coletado_em FROM fontes_dados
        WHERE dados_demonstrativos = 0 ORDER BY coletado_em DESC LIMIT 1`,
    )
    .get() as { url: string; coletado_em: string } | undefined;
  return { url: f?.url ?? 'desconhecida', coletadoEm: f?.coletado_em ?? new Date().toISOString() };
}

export function arquivarPublicacao(db: Banco, diretorio = DIRETORIO_ARQUIVO): ResultadoArquivo {
  const retrato = montarRetrato(db);
  if (retrato.linhas === 0) return { tipo: 'vazio' };

  const sha256 = createHash('sha256').update(retrato.csv).digest('hex');
  const indice = lerIndice(diretorio);
  if (indice.publicacoes.at(-1)?.sha256 === sha256) return { tipo: 'inalterado', sha256 };

  const fonte = fonteAtual(db);
  const data = fonte.coletadoEm.slice(0, 10);
  let arquivo = `publicacao-${data}.csv.gz`;
  for (let n = 2; indice.publicacoes.some((p) => p.arquivo === arquivo); n++) {
    arquivo = `publicacao-${data}-${n}.csv.gz`;
  }

  fs.mkdirSync(diretorio, { recursive: true });
  // gzip sem nome nem data no cabeçalho: o mesmo CSV gera sempre os mesmos bytes.
  fs.writeFileSync(path.join(diretorio, arquivo), gzipSync(retrato.csv, { level: 9 }));

  const entrada: EntradaArquivo = {
    arquivo,
    coletadoEm: data,
    fonte: fonte.url,
    competenciaInicial: retrato.competencias[0]!,
    competenciaFinal: retrato.competencias.at(-1)!,
    linhas: retrato.linhas,
    totalAcessos: retrato.total,
    sha256,
  };
  indice.descricao = DESCRICAO;
  indice.publicacoes.push(entrada);
  fs.writeFileSync(path.join(diretorio, 'indice.json'), JSON.stringify(indice, null, 2) + '\n');
  return { tipo: 'gravado', entrada };
}
