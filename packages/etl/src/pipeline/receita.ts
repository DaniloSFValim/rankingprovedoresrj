import fs from 'node:fs';
import path from 'node:path';
import { CAMINHOS } from '../config.js';
import {
  cnpjsParaConsultar,
  consultarCnpj,
  normalizarCnpj,
  URL_BRASILAPI,
  type CacheReceita,
} from '../sources/receita.js';
import type { Banco } from '../warehouse/db.js';

export function lerCacheReceita(caminho: string = CAMINHOS.receita): CacheReceita {
  if (!fs.existsSync(caminho)) return { fonte: URL_BRASILAPI, empresas: {} };
  return JSON.parse(fs.readFileSync(caminho, 'utf8')) as CacheReceita;
}

function gravarCache(cache: CacheReceita, caminho: string): void {
  fs.mkdirSync(path.dirname(caminho), { recursive: true });
  const ordenado: CacheReceita = {
    fonte: cache.fonte,
    empresas: Object.fromEntries(Object.entries(cache.empresas).sort(([a], [b]) => a.localeCompare(b))),
  };
  fs.writeFileSync(caminho, JSON.stringify(ordenado, null, 1) + '\n', 'utf8');
}

/** CNPJs das empresas com acessos na competencia mais recente do warehouse. */
export function cnpjsDaCompetenciaAtual(db: Banco): string[] {
  const linhas = db
    .prepare(
      `SELECT DISTINCT e.cnpj
         FROM empresas e
         JOIN fato_acessos f ON f.empresa_id = e.id
        WHERE f.competencia = (SELECT MAX(competencia) FROM fato_acessos)
          AND e.cnpj IS NOT NULL`,
    )
    .all() as Array<{ cnpj: string }>;
  return linhas.map((l) => normalizarCnpj(l.cnpj)).filter((c): c is string => c !== null);
}

/**
 * Consulta na Receita os CNPJs sem cadastro ou com cadastro vencido e grava o
 * cache. Falhas de rede nao abortam: o cadastro anterior, se houver, e mantido.
 */
export async function atualizarCadastroReceita(
  db: Banco,
  opcoes: { caminho?: string; pausaMs?: number } = {},
): Promise<{ consultados: number; falhas: number }> {
  const caminho = opcoes.caminho ?? CAMINHOS.receita;
  const pausa = opcoes.pausaMs ?? 1200;
  const cache = lerCacheReceita(caminho);
  const pendentes = cnpjsParaConsultar(cnpjsDaCompetenciaAtual(db), cache, new Date());
  console.log(`[receita] ${pendentes.length} CNPJ(s) a consultar`);

  let consultados = 0;
  let falhas = 0;
  let falhasSeguidas = 0;
  for (const [i, cnpj] of pendentes.entries()) {
    const resultado = await consultarCnpj(cnpj);
    if (resultado.tipo === 'ok') {
      cache.empresas[cnpj] = resultado.cadastro;
      consultados += 1;
      falhasSeguidas = 0;
    } else if (resultado.tipo === 'inexistente') {
      console.warn(`[receita] ${cnpj}: nao encontrado na Receita`);
      falhasSeguidas = 0;
    } else {
      falhas += 1;
      falhasSeguidas += 1;
      console.warn(`[receita] ${cnpj}: ${resultado.motivo}`);
      // API fora do ar: interrompe em vez de martelar, e grava o que ja veio.
      if (falhasSeguidas >= 10) {
        console.warn('[receita] 10 falhas seguidas; interrompendo a consulta.');
        break;
      }
    }
    if ((i + 1) % 50 === 0) {
      gravarCache(cache, caminho);
      console.log(`[receita] ${i + 1}/${pendentes.length}`);
    }
    await new Promise((r) => setTimeout(r, pausa));
  }
  gravarCache(cache, caminho);

  const porSituacao = new Map<string, number>();
  for (const c of Object.values(cache.empresas)) {
    const s = c.situacao ?? 'n/d';
    porSituacao.set(s, (porSituacao.get(s) ?? 0) + 1);
  }
  console.log(`[receita] ${consultados} atualizado(s), ${falhas} falha(s)`);
  console.log(`[receita] situacao cadastral: ${[...porSituacao].map(([s, n]) => `${s}=${n}`).join(', ')}`);
  return { consultados, falhas };
}
