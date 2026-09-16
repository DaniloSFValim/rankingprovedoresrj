/**
 * Etapa NORMALIZACAO -> BANCO do pipeline (§6).
 *
 * Contrato de historico (§38): a carga substitui apenas as competencias
 * presentes no lote. Competencias ja armazenadas e ausentes do arquivo
 * permanecem intactas. Nao existe caminho de codigo que apague a serie inteira.
 */

import {
  chaveNomeEmpresa,
  deslocarCompetencia,
  normalizarCnpj,
  type Competencia,
} from '@netrank/core';
import type { Banco } from '../warehouse/db.js';
import type { ResultadoExtracao } from './extrair.js';

export interface RegistroFonte {
  nome: string;
  url: string;
  arquivo: string;
  hashSha256: string | null;
  bytes: number | null;
  coletadoEm: string;
  dadosDemonstrativos: boolean;
}

export function registrarFonte(db: Banco, fonte: RegistroFonte): number {
  const existente = db
    .prepare('SELECT id FROM fontes_dados WHERE arquivo = ? AND hash_sha256 IS ?')
    .get(fonte.arquivo, fonte.hashSha256) as { id: number } | undefined;
  if (existente) return existente.id;

  const info = db
    .prepare(
      `INSERT INTO fontes_dados
         (nome, url, arquivo, hash_sha256, bytes, coletado_em, dados_demonstrativos)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      fonte.nome,
      fonte.url,
      fonte.arquivo,
      fonte.hashSha256,
      fonte.bytes,
      fonte.coletadoEm,
      fonte.dadosDemonstrativos ? 1 : 0,
    );
  return Number(info.lastInsertRowid);
}

export function iniciarExecucao(db: Banco, fonteId: number): number {
  const info = db
    .prepare(
      `INSERT INTO execucoes_importacao (fonte_id, iniciado_em, status)
       VALUES (?, ?, 'EM_ANDAMENTO')`,
    )
    .run(fonteId, new Date().toISOString());
  return Number(info.lastInsertRowid);
}

export function concluirExecucao(
  db: Banco,
  execucaoId: number,
  status: 'SUCESSO' | 'FALHA',
  estatisticas: ResultadoExtracao['estatisticas'],
  mensagem?: string,
): void {
  db.prepare(
    `UPDATE execucoes_importacao
        SET concluido_em = ?, status = ?, linhas_lidas = ?, linhas_rj = ?,
            linhas_rejeitadas = ?, mensagem = ?
      WHERE id = ?`,
  ).run(
    new Date().toISOString(),
    status,
    estatisticas.linhasLidas,
    estatisticas.linhasRj,
    estatisticas.linhasRejeitadas,
    mensagem ?? null,
    execucaoId,
  );
}

/**
 * Persiste dimensoes e fatos de um lote extraido.
 * Toda a carga roda em uma unica transacao: ou a competencia entra inteira,
 * ou o banco permanece no estado anterior.
 */
export function carregar(
  db: Banco,
  extracao: ResultadoExtracao,
  execucaoId: number,
): void {
  const agora = new Date().toISOString();

  const upsertGrupo = db.prepare(
    `INSERT INTO grupos_economicos (id, nome) VALUES (?, ?)
       ON CONFLICT(id) DO UPDATE SET nome = excluded.nome`,
  );
  const upsertEmpresa = db.prepare(
    `INSERT INTO empresas (id, nome_normalizado, cnpj, grupo_economico_id, origem_identidade)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         nome_normalizado = excluded.nome_normalizado,
         cnpj = COALESCE(excluded.cnpj, empresas.cnpj),
         grupo_economico_id = COALESCE(excluded.grupo_economico_id, empresas.grupo_economico_id)`,
  );
  const inserirAlias = db.prepare(
    `INSERT INTO empresas_aliases
       (chave_nome, nome_original_anatel, empresa_id, origem, primeira_vez_em)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(chave_nome) DO NOTHING`,
  );
  const upsertMunicipio = db.prepare(
    `INSERT INTO municipios (codigo_ibge, nome, uf) VALUES (?, ?, 'RJ')
       ON CONFLICT(codigo_ibge) DO UPDATE SET nome = excluded.nome`,
  );
  const apagarCompetencia = db.prepare('DELETE FROM fato_acessos WHERE competencia = ?');
  const inserirFato = db.prepare(
    `INSERT INTO fato_acessos
       (competencia, codigo_ibge, empresa_id, tecnologia, acessos, execucao_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
  );

  const transacao = db.transaction(() => {
    for (const empresa of extracao.empresas.values()) {
      let grupoId: string | null = null;
      if (empresa.grupoEconomico) {
        grupoId = `grupo:${chaveNomeEmpresa(empresa.grupoEconomico)}`;
        upsertGrupo.run(grupoId, empresa.grupoEconomico);
      }
      upsertEmpresa.run(
        empresa.empresaId,
        empresa.nomeOriginalAnatel,
        normalizarCnpj(empresa.cnpj),
        grupoId,
        empresa.origem,
      );
      inserirAlias.run(
        chaveNomeEmpresa(empresa.nomeOriginalAnatel),
        empresa.nomeOriginalAnatel,
        empresa.empresaId,
        empresa.origem,
        agora,
      );
    }

    for (const municipio of extracao.municipios.values()) {
      upsertMunicipio.run(municipio.codigoIbge, municipio.nome);
    }

    // Substitui somente as competencias deste lote (§38).
    for (const competencia of extracao.competencias) {
      apagarCompetencia.run(competencia);
    }

    for (const r of extracao.registros) {
      inserirFato.run(
        r.competencia,
        r.codigoIbge,
        r.empresaId,
        r.tecnologia,
        r.acessos,
        execucaoId,
      );
    }
  });

  transacao();
}

/**
 * Remove todo vestigio de dados demonstrativos do warehouse (§48).
 *
 * Chamado antes de qualquer importacao real. Sem isso, competencias que a
 * fixture sintetica cobria e o arquivo real nao cobre permaneceriam no banco,
 * e o produto publicaria uma serie historica que mistura numero inventado com
 * numero oficial — exatamente o que o principio de rastreabilidade proibe.
 *
 * Retorna quantos fatos foram removidos, para que a operacao apareca no log
 * em vez de acontecer em silencio.
 */
export function purgarDadosDemonstrativos(db: Banco): number {
  const execucoesDemo = (
    db
      .prepare(
        `SELECT e.id FROM execucoes_importacao e
           JOIN fontes_dados f ON f.id = e.fonte_id
          WHERE f.dados_demonstrativos = 1`,
      )
      .all() as Array<{ id: number }>
  ).map((r) => r.id);

  if (execucoesDemo.length === 0) return 0;

  const marcadores = execucoesDemo.map(() => '?').join(', ');
  const transacao = db.transaction(() => {
    const removidos = db
      .prepare(`DELETE FROM fato_acessos WHERE execucao_id IN (${marcadores})`)
      .run(...execucoesDemo).changes;
    db.prepare(`DELETE FROM alertas_qualidade WHERE execucao_id IN (${marcadores})`)
      .run(...execucoesDemo);
    db.prepare(`DELETE FROM execucoes_importacao WHERE id IN (${marcadores})`)
      .run(...execucoesDemo);
    db.prepare('DELETE FROM fontes_dados WHERE dados_demonstrativos = 1').run();
    return removidos;
  });

  const removidos = transacao();

  // Limpeza de orfaos, das folhas para a raiz: os apelidos referenciam as
  // empresas, e as empresas referenciam os grupos. Apagar na ordem inversa
  // viola a integridade referencial.
  const limparOrfaos = db.transaction(() => {
    db.prepare(
      `DELETE FROM empresas_aliases
        WHERE empresa_id NOT IN (SELECT DISTINCT empresa_id FROM fato_acessos)`,
    ).run();
    db.prepare(
      `DELETE FROM empresas
        WHERE id NOT IN (SELECT DISTINCT empresa_id FROM fato_acessos)`,
    ).run();
    db.prepare(
      `DELETE FROM grupos_economicos
        WHERE id NOT IN (SELECT DISTINCT grupo_economico_id FROM empresas
                          WHERE grupo_economico_id IS NOT NULL)`,
    ).run();
    // Municipios sobrevivem de proposito: os nomes vem do IBGE, nao da fixture,
    // e reimporta-los a cada limpeza seria trabalho perdido.
  });
  limparOrfaos();

  return removidos;
}

/** Numero maximo de competencias mantidas na base. */
export const MAXIMO_COMPETENCIAS = 50;

export interface JanelaAplicada {
  inicio: Competencia | null;
  fim: Competencia | null;
  meses: number;
  removidos: number;
  /** true quando a janela foi encurtada por uma lacuna, e nao pelo limite. */
  truncadaPorLacuna: boolean;
}

/**
 * Mantem a maior sequencia CONSECUTIVA de competencias terminando na mais
 * recente disponivel, limitada a `maximo` meses.
 *
 * POR QUE CONSECUTIVA
 * -------------------
 * A fonte pode ter buracos — 2023 inteiro faltou numa carga real. Uma serie
 * com buraco e pior que uma serie curta: o grafico liga dezembro a janeiro do
 * ano seguinte como se fossem meses consecutivos, e toda variacao que
 * atravessa a lacuna compara periodos que nao se seguem. O numero fica errado
 * sem parecer errado.
 *
 * Preferimos, entao, uma janela menor e integra. Se a base vai de 2022 a 2026
 * mas 2023 falta, a janela comeca em jan/2024 — nao em 2022.
 *
 * A contagem e sempre para tras a partir da ULTIMA competencia disponivel, e
 * nao a partir do mes corrente: a Anatel publica com defasagem, e exigir o mes
 * atual esvaziaria a base sem motivo.
 */
export function aplicarJanelaConsecutiva(
  db: Banco,
  maximo: number = MAXIMO_COMPETENCIAS,
): JanelaAplicada {
  const presentes = competenciasArmazenadas(db);
  if (presentes.length === 0) {
    return { inicio: null, fim: null, meses: 0, removidos: 0, truncadaPorLacuna: false };
  }

  const fim = presentes[presentes.length - 1]!;

  // Caminha para tras enquanto os meses se seguirem sem buraco.
  let inicio = fim;
  let meses = 1;
  let truncadaPorLacuna = false;
  const conjunto = new Set(presentes);

  while (meses < maximo) {
    const anterior = deslocarCompetencia(inicio, -1);
    if (!conjunto.has(anterior)) {
      truncadaPorLacuna = true;
      break;
    }
    inicio = anterior;
    meses += 1;
  }

  const transacao = db.transaction(() => {
    const removidos = db
      .prepare('DELETE FROM fato_acessos WHERE competencia < ?')
      .run(inicio).changes;
    db.prepare('DELETE FROM alertas_qualidade WHERE competencia < ?').run(inicio);
    return removidos;
  });
  const removidos = transacao();

  if (removidos > 0) {
    const limpar = db.transaction(() => {
      db.prepare(
        `DELETE FROM empresas_aliases
          WHERE empresa_id NOT IN (SELECT DISTINCT empresa_id FROM fato_acessos)`,
      ).run();
      db.prepare(
        `DELETE FROM empresas
          WHERE id NOT IN (SELECT DISTINCT empresa_id FROM fato_acessos)`,
      ).run();
    });
    limpar();
  }

  return { inicio, fim, meses, removidos, truncadaPorLacuna };
}

/** Competencias presentes no warehouse, em ordem cronologica. */
export function competenciasArmazenadas(db: Banco): Competencia[] {
  return (
    db
      .prepare('SELECT DISTINCT competencia FROM fato_acessos ORDER BY competencia')
      .all() as Array<{ competencia: Competencia }>
  ).map((r) => r.competencia);
}
