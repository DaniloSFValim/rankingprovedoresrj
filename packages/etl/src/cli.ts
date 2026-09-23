/**
 * CLI do pipeline NETRANK RJ.
 *
 *   npm run etl -- descobrir       lista os arquivos da Anatel no catalogo aberto
 *   npm run etl -- sincronizar     descobre, baixa e importa sem intervencao
 *   npm run etl -- atualizar <url>  baixa, importa e reconstroi os artefatos
 *   npm run etl -- demo            gera fixture sintetica e roda o pipeline inteiro
 *   npm run etl -- importar <csv>  importa um arquivo real da Anatel
 *   npm run etl -- bdd-inspecionar  descreve o schema da Base dos Dados
 *   npm run etl -- bdd-importar     importa os dados do RJ via BigQuery
 *   npm run etl -- malhas           baixa a malha municipal do IBGE para o mapa
 *   npm run etl -- build           reconstroi os artefatos a partir do warehouse
 *   npm run etl -- status          mostra o estado do warehouse e os alertas
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { rotularCompetencia, type ProcedenciaDados } from '@netrank/core';
import { CAMINHOS, RAIZ_REPO } from './config.js';
import { escreverCsvDemo } from './fixtures/gerar-demo.js';
import { construirArtefatos } from './pipeline/artefatos.js';
import {
  aplicarJanelaConsecutiva,
  carregar,
  classificarEmpresas,
  competenciasArmazenadas,
  purgarDadosDemonstrativos,
  concluirExecucao,
  iniciarExecucao,
  registrarFonte,
} from './pipeline/carregar.js';
import { extrairRj } from './pipeline/extrair.js';
import { baixarMalhaMunicipios, processarMalhaLocal } from './pipeline/malhas.js';
import { converterParaExtracao } from './pipeline/importar-bdd.js';
import {
  baixarLocalidades,
  lerLocalidadesDeArquivo,
} from './pipeline/nomes-municipios.js';
import {
  consultarRj,
  criarCliente,
  descreverColunas,
  escolherTabela,
  listarTabelas,
  mapearColunas,
  PROCEDENCIA_BDD,
} from './sources/basedosdados.js';
import { baixarRecurso, prepararCsvs } from './pipeline/baixar.js';
import { arquivoDentroDaJanela } from './sources/anatel.js';
import { anoDoRecurso, descobrirRecursos } from './sources/descoberta.js';
import { descobrirESelecionar } from './pipeline/sincronizar.js';
import { existe, sondarCandidatos } from './sources/sondagem.js';
import {
  baixarInventario,
  filtrarBandaLargaFixa,
  interpretarInventario,
  URL_INVENTARIO,
} from './sources/inventario-anatel.js';
import {
  auditarCompetencia,
  auditarExtracao,
  auditarLacunas,
  detectarLacunas,
  persistirAlertas,
  type Alerta,
} from './pipeline/qualidade.js';
import { FONTE_ANATEL } from './sources/anatel.js';
import { atualizarCadastroReceita, lerCacheReceita, sondarFontesReceita } from './pipeline/receita.js';
import { abrirBanco, type Banco } from './warehouse/db.js';

/**
 * Resolve um caminho informado pelo usuario.
 *
 * `npm run -w` executa o comando com o diretorio de trabalho no pacote, nao na
 * raiz do repositorio. Um caminho relativo digitado pelo operador quase sempre
 * se refere a raiz, entao tentamos os dois — e, se nenhum existir, o erro
 * mostra onde procuramos, em vez de um ENOENT cru.
 */
function resolverCaminho(informado: string): string {
  const candidatos = [
    path.resolve(process.cwd(), informado),
    path.resolve(RAIZ_REPO, informado),
  ];
  for (const candidato of candidatos) {
    if (fs.existsSync(candidato)) return candidato;
  }
  throw new Error(
    `Arquivo nao encontrado: ${informado}\nProcurado em:\n` +
      candidatos.map((c) => `  ${c}`).join('\n'),
  );
}

function hashArquivo(caminho: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(caminho)).digest('hex');
}

function carregarOverrides(): Map<string, string> {
  if (!fs.existsSync(CAMINHOS.overrides)) return new Map();
  const bruto = JSON.parse(fs.readFileSync(CAMINHOS.overrides, 'utf8')) as Record<string, string>;
  return new Map(Object.entries(bruto));
}

interface OpcoesImportacao {
  url: string;
  dadosDemonstrativos: boolean;
  encoding?: 'utf8' | 'latin1';
}

async function importar(
  db: Banco,
  caminhoCsv: string,
  opcoes: OpcoesImportacao,
): Promise<void> {
  if (!fs.existsSync(caminhoCsv)) {
    throw new Error(`Arquivo nao encontrado: ${caminhoCsv}`);
  }

  // Dado real e dado demonstrativo jamais coexistem no warehouse (§48).
  if (!opcoes.dadosDemonstrativos) {
    const removidos = purgarDadosDemonstrativos(db);
    if (removidos > 0) {
      console.log(
        `[limpeza] ${removidos.toLocaleString('pt-BR')} fatos demonstrativos removidos ` +
          `antes da importacao real.`,
      );
    }
  }

  const estatisticasArquivo = fs.statSync(caminhoCsv);
  const fonteId = registrarFonte(db, {
    nome: FONTE_ANATEL.nome,
    url: opcoes.url,
    arquivo: path.basename(caminhoCsv),
    hashSha256: hashArquivo(caminhoCsv),
    bytes: estatisticasArquivo.size,
    coletadoEm: estatisticasArquivo.mtime.toISOString(),
    dadosDemonstrativos: opcoes.dadosDemonstrativos,
  });
  const execucaoId = iniciarExecucao(db, fonteId);

  try {
    console.log(`[extrair] lendo ${path.basename(caminhoCsv)}`);
    const extracao = await extrairRj(caminhoCsv, {
      overrides: carregarOverrides(),
      ...(opcoes.encoding ? { encoding: opcoes.encoding } : {}),
    });

    if (extracao.outroConjuntoIgnorado) {
      console.log(
        '[extrair] sem coluna de prestadora — outro conjunto de dados, ignorado.',
      );
      concluirExecucao(
        db, execucaoId, 'SUCESSO', extracao.estatisticas, 'outro conjunto ignorado',
      );
      return;
    }

    if (extracao.mapaColunas) {
      console.log(
        '[extrair] colunas resolvidas: ' +
          Object.entries(extracao.mapaColunas)
            .map(([campo, coluna]) => `${campo}="${coluna}"`)
            .join(', '),
      );
    }

    const { estatisticas } = extracao;
    console.log(
      `[extrair] ${estatisticas.linhasLidas} linhas lidas | ` +
        `${estatisticas.linhasRj} no RJ | ${estatisticas.linhasRejeitadas} rejeitadas | ` +
        `${extracao.registros.length} fatos agregados`,
    );

    console.log(`[carregar] gravando ${extracao.competencias.size} competencia(s)`);
    carregar(db, extracao, execucaoId);

    const { classificadas, indefinidas } = classificarEmpresas(db);
    console.log(
      `[classificar] ${classificadas} empresa(s) classificada(s), ${indefinidas} indefinida(s)`,
    );

    const alertas: Alerta[] = [...auditarExtracao(extracao)];
    for (const competencia of [...extracao.competencias].sort()) {
      alertas.push(...auditarCompetencia(db, competencia));
    }
    persistirAlertas(db, execucaoId, alertas);

    const criticos = alertas.filter((a) => a.severidade === 'CRITICO');
    console.log(
      `[qualidade] ${alertas.length} alerta(s): ` +
        `${criticos.length} critico(s), ` +
        `${alertas.filter((a) => a.severidade === 'ATENCAO').length} atencao`,
    );
    for (const a of criticos) console.warn(`  [CRITICO] ${a.tipo}: ${a.mensagem}`);

    concluirExecucao(db, execucaoId, 'SUCESSO', estatisticas);
  } catch (erro) {
    concluirExecucao(
      db,
      execucaoId,
      'FALHA',
      { linhasLidas: 0, linhasRj: 0, linhasRejeitadas: 0, motivosRejeicao: {} },
      erro instanceof Error ? erro.message : String(erro),
    );
    throw erro;
  }
}

function build(db: Banco): void {
  const fonte = db
    .prepare(
      `SELECT f.nome, f.url, f.arquivo, f.coletado_em, f.dados_demonstrativos
         FROM fontes_dados f
         JOIN execucoes_importacao e ON e.fonte_id = f.id
        WHERE e.status = 'SUCESSO'
        ORDER BY e.concluido_em DESC LIMIT 1`,
    )
    .get() as
    | {
        nome: string;
        url: string;
        arquivo: string;
        coletado_em: string;
        dados_demonstrativos: number;
      }
    | undefined;

  if (!fonte) throw new Error('Nenhuma importacao bem-sucedida encontrada.');

  const competencias = competenciasArmazenadas(db);
  const demonstrativos = fonte.dados_demonstrativos === 1;

  // Salvaguarda de producao (§48): artefato demonstrativo nunca vai ao ar
  // sem que alguem assuma explicitamente a decisao.
  if (demonstrativos && process.env['NETRANK_AMBIENTE'] === 'producao') {
    throw new Error(
      'Build abortado: o warehouse contem dados DEMONSTRATIVOS e o ambiente e producao. ' +
        'Importe dados reais da Anatel antes de publicar.',
    );
  }

  const procedencia: ProcedenciaDados = {
    fonte: fonte.nome,
    url: fonte.url,
    arquivo: fonte.arquivo,
    competenciaInicial: competencias[0]!,
    competenciaFinal: competencias[competencias.length - 1]!,
    coletadoEm: fonte.coletado_em,
    processadoEm: new Date().toISOString(),
    dadosDemonstrativos: demonstrativos,
  };

  const resultado = construirArtefatos(db, {
    destino: CAMINHOS.artefatos,
    procedencia,
    receita: lerCacheReceita(),
  });
  console.log(
    `[build] ${resultado.arquivosGerados} artefatos em ${CAMINHOS.artefatos} ` +
      `(competencia ${rotularCompetencia(resultado.competenciaAtual)})`,
  );
  if (demonstrativos) {
    console.warn('[build] ATENCAO: artefatos marcados como DADOS DEMONSTRATIVOS.');
  }
}

function status(db: Banco): void {
  const competencias = competenciasArmazenadas(db);
  console.log(`Competencias armazenadas: ${competencias.length}`);
  if (competencias.length > 0) {
    console.log(`  de ${competencias[0]} ate ${competencias[competencias.length - 1]}`);
  }
  const totais = db
    .prepare(
      `SELECT (SELECT COUNT(*) FROM empresas) AS empresas,
              (SELECT COUNT(*) FROM municipios) AS municipios,
              (SELECT COUNT(*) FROM fato_acessos) AS fatos`,
    )
    .get() as { empresas: number; municipios: number; fatos: number };
  console.log(
    `Empresas: ${totais.empresas} | Municipios: ${totais.municipios} | Fatos: ${totais.fatos}`,
  );

  const execucoes = db
    .prepare(
      `SELECT id, status, iniciado_em, linhas_rj, linhas_rejeitadas, mensagem
         FROM execucoes_importacao ORDER BY id DESC LIMIT 5`,
    )
    .all() as Array<Record<string, unknown>>;
  console.log('\nUltimas execucoes:');
  for (const e of execucoes) {
    console.log(
      `  #${e['id']} ${e['status']} ${e['iniciado_em']} ` +
        `(RJ: ${e['linhas_rj']}, rejeitadas: ${e['linhas_rejeitadas']})` +
        (e['mensagem'] ? ` — ${e['mensagem']}` : ''),
    );
  }

  const alertas = db
    .prepare(
      `SELECT severidade, COUNT(*) AS total FROM alertas_qualidade GROUP BY severidade`,
    )
    .all() as Array<{ severidade: string; total: number }>;
  console.log('\nAlertas de qualidade:');
  if (alertas.length === 0) console.log('  nenhum');
  for (const a of alertas) console.log(`  ${a.severidade}: ${a.total}`);

  const lacunas = detectarLacunas(db);
  console.log('\nContinuidade da serie:');
  console.log(
    lacunas.length === 0
      ? '  sem lacunas'
      : `  ${lacunas.length} competencia(s) ausente(s): ${lacunas.join(', ')}`,
  );
}

async function principal(): Promise<void> {
  const [comando, ...resto] = process.argv.slice(2);
  const db = abrirBanco();

  try {
    switch (comando) {
      case 'demo': {
        // Dados demonstrativos ja sobrescreveram os reais em commits anteriores.
        const metaAtual = path.join(CAMINHOS.artefatos, 'meta.json');
        if (!resto.includes('--forcar') && fs.existsSync(metaAtual)) {
          const meta = JSON.parse(fs.readFileSync(metaAtual, 'utf8'));
          if (meta.procedencia?.dadosDemonstrativos === false) {
            throw new Error(
              `${metaAtual} contem dados reais da Anatel. ` +
                'Use `npm run etl -- demo --forcar` para sobrescreve-los (nao commite o resultado).',
            );
          }
        }
        const caminho = path.join(CAMINHOS.trabalho, 'anatel-DEMONSTRATIVO-rj.csv');
        escreverCsvDemo(caminho, { meses: 24 });
        console.log(`[demo] fixture sintetica gerada em ${caminho}`);
        console.warn('[demo] ATENCAO: DADOS DEMONSTRATIVOS — NAO OFICIAIS.');
        await importar(db, caminho, {
          url: 'fixture-local://netrank/demo',
          dadosDemonstrativos: true,
        });
        build(db);
        break;
      }
      case 'importar': {
        const caminho = resto[0];
        if (!caminho) throw new Error('Uso: npm run etl -- importar <caminho-do-csv> [--latin1]');
        await importar(db, resolverCaminho(caminho), {
          url: FONTE_ANATEL.portalDados,
          dadosDemonstrativos: false,
          ...(resto.includes('--latin1') ? { encoding: 'latin1' as const } : {}),
        });
        break;
      }
      case 'descobrir': {
        console.log('Consultando catalogos de dados abertos...\n');
        const { candidatos, falhas, paginas } = await descobrirRecursos();

        for (const falha of falhas) {
          console.warn(`[aviso] ${falha.catalogo}: ${falha.motivo}`);
        }

        if (candidatos.length === 0) {
          if (paginas.length > 0) {
            console.log(
              `\nNenhum link direto de arquivo, mas ${paginas.length} pagina(s) do ` +
                `assunto certo foram localizadas:\n`,
            );
            for (const p of paginas) {
              console.log(`  ${p.descricao}`);
              console.log(`  ${p.url}\n`);
            }
            console.log(
              'Abra a pagina, copie a URL do arquivo (.zip ou .csv) e rode:\n' +
                '  npm run etl -- atualizar <url-do-arquivo>',
            );
          } else {
            console.error(
              '\nNenhum recurso encontrado. Isso pode significar que os catalogos ' +
                'estao fora do ar, que a rede bloqueia o acesso, ou que o conjunto ' +
                'mudou de nome.\n\nAlternativa manual: baixe o CSV/ZIP pelo portal e rode\n' +
                '  npm run etl -- importar <caminho-do-arquivo>',
            );
          }
          process.exitCode = 1;
          break;
        }

        console.log(`${candidatos.length} recurso(s) candidato(s):\n`);
        for (const c of candidatos) {
          const ano = anoDoRecurso(c);
          const tamanho = c.bytes ? `${(c.bytes / 1e6).toFixed(0)} MB` : 'tamanho n/d';
          console.log(`  [${c.formato}] ${c.nome}${ano ? ` (${ano})` : ''} — ${tamanho}`);
          console.log(`      conjunto: ${c.conjunto}`);
          console.log(`      ${c.url}\n`);
        }
        console.log('Para ingerir:  npm run etl -- atualizar <url>');
        break;
      }

      case 'atualizar': {
        const url = resto[0];
        if (!url) throw new Error('Uso: npm run etl -- atualizar <url-do-recurso>');

        console.log(`[baixar] ${url}`);
        const arquivo = await baixarRecurso(url, { forcar: resto.includes('--forcar') });
        console.log(
          `[baixar] ${arquivo.reaproveitado ? 'reaproveitado' : 'concluido'}: ` +
            `${(arquivo.bytes / 1e6).toFixed(1)} MB | sha256 ${arquivo.sha256.slice(0, 16)}...`,
        );

        const csvs = await prepararCsvs(arquivo);
        console.log(`[preparar] ${csvs.length} arquivo(s) para processar`);

        for (const csv of csvs) {
          await importar(db, csv, {
            url,
            dadosDemonstrativos: false,
          });
        }
        build(db);
        break;
      }

      case 'sincronizar': {
        const indiceAnos = resto.indexOf('--anos');
        const anos = indiceAnos >= 0 ? Number(resto[indiceAnos + 1]) : 2;
        if (!Number.isInteger(anos) || anos < 1 || anos > 20) {
          throw new Error('Uso: npm run etl -- sincronizar [--anos N]  (N entre 1 e 20)');
        }

        console.log(`[sincronizar] procurando os ${anos} ano(s) mais recentes...`);
        const { selecionados, descartados, falhas, paginas } = await descobrirESelecionar({ anos });

        for (const falha of falhas) {
          console.warn(`[aviso] ${falha.catalogo}: ${falha.motivo}`);
        }

        if (selecionados.length === 0) {
          console.error(
            `\nNenhum recurso selecionavel (${descartados.length} candidato(s) descartado(s)).`,
          );
          for (const p of paginas) {
            console.error(`  pagina do assunto: ${p.url}`);
          }
          console.error(
            'Rode "npm run etl -- descobrir" para inspecionar o catalogo, ou importe\n' +
              'um arquivo manualmente com "npm run etl -- importar <csv>".',
          );
          process.exitCode = 1;
          break;
        }

        // Imprimir a selecao ANTES de baixar: ninguem deve descobrir que o
        // pipeline escolheu o arquivo errado depois que os dados ja entraram.
        console.log(`\n[sincronizar] ${selecionados.length} recurso(s) selecionado(s):`);
        for (const r of selecionados) {
          console.log(`  ${anoDoRecurso(r)} | [${r.formato}] ${r.nome}`);
          console.log(`         ${r.url}`);
        }
        console.log('');

        const anoMinimo = new Date().getUTCFullYear() - anos + 1;
        const falhasArquivo: Array<{ arquivo: string; motivo: string }> = [];
        let importados = 0;

        for (const recurso of selecionados) {
          const arquivo = await baixarRecurso(recurso.url);
          console.log(
            `[baixar] ${recurso.nome}: ${(arquivo.bytes / 1e6).toFixed(1)} MB | ` +
              `sha256 ${arquivo.sha256.slice(0, 16)}...`,
          );

          const csvs = await prepararCsvs(arquivo);
          // O pacote e particionado por periodo. Pular safras inteiras fora da
          // janela evita ler milhoes de linhas que seriam descartadas depois.
          const dentro = csvs.filter((c) => arquivoDentroDaJanela(c, anoMinimo));
          const pulados = csvs.length - dentro.length;
          if (pulados > 0) {
            console.log(
              `[preparar] ${pulados} arquivo(s) fora da janela (anterior a ${anoMinimo}) ignorado(s)`,
            );
          }
          if (dentro.length === 0) {
            console.warn(
              `[preparar] nenhum arquivo dentro da janela. Aumente --anos para incluir safras anteriores.`,
            );
          }

          // Um arquivo problematico nao pode descartar os que ja carregaram.
          // Falhas sao acumuladas e relatadas ao final; o pipeline so aborta
          // quando NENHUM arquivo entrou.
          for (const csv of dentro) {
            try {
              await importar(db, csv, { url: recurso.url, dadosDemonstrativos: false });
              importados += 1;
            } catch (erro) {
              falhasArquivo.push({
                arquivo: path.basename(csv),
                motivo: erro instanceof Error ? erro.message : String(erro),
              });
              console.error(`[erro] ${path.basename(csv)}: ${
                erro instanceof Error ? erro.message.split('\n')[0] : erro}`);
            }
          }
        }

        if (falhasArquivo.length > 0) {
          console.warn(`\n[atencao] ${falhasArquivo.length} arquivo(s) nao importado(s):`);
          for (const f of falhasArquivo) console.warn(`  ${f.arquivo}`);
        }

        if (importados === 0) {
          console.error(
            '\nNenhum arquivo foi importado. Nada a publicar.',
          );
          process.exitCode = 1;
          break;
        }

        console.log(`\n[sincronizar] ${importados} arquivo(s) importado(s) com sucesso.`);

        // Lacuna no meio da serie e invisivel num grafico e precisa gritar aqui.
        const lacunas = auditarLacunas(db);
        for (const a of lacunas) console.warn(`\n[CRITICO] ${a.mensagem}\n`);

        // Janela final: a maior sequencia consecutiva terminando na ultima
        // competencia disponivel, limitada a 50 meses.
        const janela = aplicarJanelaConsecutiva(db);
        console.log(
          `[janela] ${janela.meses} competencia(s) consecutiva(s): ` +
            `${janela.inicio} a ${janela.fim}` +
            (janela.removidos > 0
              ? ` | ${janela.removidos.toLocaleString('pt-BR')} fatos anteriores removidos`
              : ''),
        );
        if (janela.truncadaPorLacuna) {
          console.warn(
            `[janela] ATENCAO: a janela parou em ${janela.inicio} por falta da ` +
              `competencia anterior na fonte, e nao pelo limite de 50 meses. ` +
              `Uma serie menor e integra e preferivel a uma serie longa com buraco.`,
          );
        }

        build(db);
        break;
      }

      case 'sondar': {
        // Deduzir uma URL e chute; perguntar ao servidor se ela responde e
        // evidencia. So enderecos confirmados entram no pipeline.
        const extras = resto.filter((r) => /^https?:\/\//i.test(r));
        console.log('[sondar] testando enderecos candidatos da Anatel...\n');

        const resultados = await sondarCandidatos(extras);
        const encontrados = resultados.filter(existe);

        for (const r of resultados) {
          const marca = existe(r) ? 'OK ' : '   ';
          const detalhe = existe(r)
            ? `${((r.bytes ?? 0) / 1e6).toFixed(0)} MB, ${r.tipo ?? 'tipo n/d'}`
            : r.erro ?? `HTTP ${r.status}`;
          console.log(`${marca} ${r.url}\n      ${detalhe}`);
        }

        console.log(`\n${encontrados.length} endereco(s) confirmado(s) de ${resultados.length} testados.`);
        if (encontrados.length > 0) {
          console.log('\nPara importar:');
          for (const r of encontrados) {
            console.log(`  npm run etl -- atualizar ${r.url}`);
          }
        } else {
          console.log(
            '\nNenhum candidato respondeu. O endereco precisa vir do portal:\n' +
              '  botao direito no botao de download -> copiar endereco do link',
          );
          process.exitCode = 1;
        }
        break;
      }

      case 'inventario': {
        // Diagnostico: imprime o layout real do inventario da Anatel, para que
        // a leitura tolerante possa ser apertada quando o formato for conhecido.
        console.log(`[inventario] ${URL_INVENTARIO}\n`);
        const bruto = await baixarInventario();
        const { cabecalho, linhas } = interpretarInventario(bruto);

        console.log(`Bytes: ${bruto.length}`);
        console.log(`Colunas detectadas (${cabecalho.length}):`);
        cabecalho.forEach((c, i) => console.log(`  [${i}] ${c}`));
        console.log(`\nLinhas: ${linhas.length}`);

        const relevantes = filtrarBandaLargaFixa(linhas);
        console.log(`Linhas sobre acessos de banda larga fixa: ${relevantes.length}\n`);
        for (const linha of relevantes) {
          console.log(`  ${linha.celulas.filter(Boolean).join(' | ').slice(0, 300)}`);
          for (const url of linha.urls) console.log(`      [arquivo] ${url}`);
          for (const url of linha.urlsPagina) console.log(`      [pagina]  ${url}`);
        }

        if (relevantes.length === 0) {
          console.log('Nenhuma linha casou com o filtro. Linhas com "ACESSO" no texto:');
          for (const linha of linhas.filter((l) => l.textoCanonico.includes('ACESSO'))) {
            console.log(`  ${linha.celulas.filter(Boolean).join(' | ').slice(0, 300)}`);
          }
        }
        break;
      }

      case 'bdd-inspecionar': {
        // Ao contrario de um CSV, o BigQuery e introspectavel. Em vez de supor
        // nomes de coluna, perguntamos ao proprio banco.
        const cliente = criarCliente();
        console.log('[bdd] listando tabelas do dataset da Anatel...');
        const tabelas = await listarTabelas(cliente);
        console.log(`Tabelas (${tabelas.length}): ${tabelas.join(', ')}\n`);

        const colunas = await descreverColunas(cliente);
        const porTabela = new Map<string, string[]>();
        for (const c of colunas) {
          const lista = porTabela.get(c.tabela) ?? [];
          lista.push(c.coluna);
          porTabela.set(c.tabela, lista);
        }
        for (const [tabela, lista] of porTabela) {
          console.log(`${tabela} (${lista.length} colunas):`);
          for (const c of colunas.filter((x) => x.tabela === tabela)) {
            console.log(`  ${c.coluna.padEnd(32)} ${c.tipo}`);
          }
          console.log('');
        }

        const escolhida = escolherTabela(porTabela);
        console.log(`Tabela escolhida para importacao: ${escolhida ?? '(nenhuma)'}`);
        if (escolhida) {
          try {
            const mapa = mapearColunas(escolhida, porTabela.get(escolhida)!);
            console.log('Mapeamento de campos:');
            for (const [campo, coluna] of Object.entries(mapa)) {
              console.log(`  ${campo.padEnd(12)} -> ${coluna}`);
            }
          } catch (erro) {
            console.error(erro instanceof Error ? erro.message : erro);
          }
        }
        break;
      }

      case 'bdd-importar': {
        const indice = resto.indexOf('--anos');
        const anos = indice >= 0 ? Number(resto[indice + 1]) : 2;
        if (!Number.isInteger(anos) || anos < 1 || anos > 30) {
          throw new Error('Uso: npm run etl -- bdd-importar [--anos N]  (N entre 1 e 30)');
        }
        const anoMinimo = new Date().getUTCFullYear() - anos + 1;

        const cliente = criarCliente();
        const colunas = await descreverColunas(cliente);
        const porTabela = new Map<string, string[]>();
        for (const c of colunas) {
          const lista = porTabela.get(c.tabela) ?? [];
          lista.push(c.coluna);
          porTabela.set(c.tabela, lista);
        }
        const tabela = escolherTabela(porTabela);
        if (!tabela) throw new Error('Nenhuma tabela utilizavel no dataset da Base dos Dados.');

        const mapa = mapearColunas(tabela, porTabela.get(tabela)!);
        console.log(`[bdd] tabela ${tabela}, a partir de ${anoMinimo}`);
        console.log('[bdd] consultando (filtro e agregacao no servidor)...');

        const linhas = await consultarRj(cliente, tabela, mapa, anoMinimo);
        console.log(`[bdd] ${linhas.length} linhas agregadas do RJ`);

        const fonteId = registrarFonte(db, {
          nome: PROCEDENCIA_BDD.fonte,
          url: PROCEDENCIA_BDD.url,
          arquivo: `bigquery:${tabela}`,
          hashSha256: null,
          bytes: null,
          coletadoEm: new Date().toISOString(),
          dadosDemonstrativos: false,
        });
        const execucaoId = iniciarExecucao(db, fonteId);

        try {
          const extracao = converterParaExtracao(linhas, carregarOverrides());
          console.log(
            `[bdd] ${extracao.registros.length} fatos | ` +
              `${extracao.estatisticas.linhasRejeitadas} rejeitados | ` +
              `${extracao.competencias.size} competencias`,
          );
          carregar(db, extracao, execucaoId);

          const alertas: Alerta[] = [...auditarExtracao(extracao)];
          for (const competencia of [...extracao.competencias].sort()) {
            alertas.push(...auditarCompetencia(db, competencia));
          }
          persistirAlertas(db, execucaoId, alertas);
          console.log(`[qualidade] ${alertas.length} alerta(s)`);
          for (const a of alertas.filter((x) => x.severidade === 'CRITICO')) {
            console.warn(`  [CRITICO] ${a.tipo}: ${a.mensagem}`);
          }

          concluirExecucao(db, execucaoId, 'SUCESSO', extracao.estatisticas);
        } catch (erro) {
          concluirExecucao(
            db, execucaoId, 'FALHA',
            { linhasLidas: 0, linhasRj: 0, linhasRejeitadas: 0, motivosRejeicao: {} },
            erro instanceof Error ? erro.message : String(erro),
          );
          throw erro;
        }
        break;
      }

      case 'municipios': {
        // Nomes oficiais: a malha traz so o codigo, e a Base dos Dados tambem.
        const indiceArquivo = resto.indexOf('--arquivo');
        const arquivo = indiceArquivo >= 0 ? resto[indiceArquivo + 1] : undefined;

        const lista = arquivo
          ? lerLocalidadesDeArquivo(resolverCaminho(arquivo))
          : await baixarLocalidades();
        console.log(`[municipios] ${lista.length} municipios do RJ recebidos do IBGE`);

        const upsert = db.prepare(
          `INSERT INTO municipios (codigo_ibge, nome, uf, regiao) VALUES (?, ?, 'RJ', ?)
             ON CONFLICT(codigo_ibge) DO UPDATE SET
               nome = excluded.nome,
               regiao = COALESCE(excluded.regiao, municipios.regiao)`,
        );
        const transacao = db.transaction(() => {
          for (const m of lista) upsert.run(m.codigoIbge, m.nome, m.regiao);
        });
        transacao();

        const comRegiao = lista.filter((m) => m.regiao !== null).length;
        console.log(
          `[municipios] nomes gravados | ${comRegiao} com regiao identificada`,
        );
        break;
      }

      case 'malhas': {
        const municipios = db
          .prepare('SELECT codigo_ibge, nome FROM municipios')
          .all() as Array<{ codigo_ibge: string; nome: string }>;
        const nomes = new Map(municipios.map((m) => [m.codigo_ibge, m.nome]));

        const indiceArquivo = resto.indexOf('--arquivo');
        const arquivoLocal = indiceArquivo >= 0 ? resto[indiceArquivo + 1] : undefined;

        let resultado;
        if (arquivoLocal) {
          console.log(`[malhas] processando arquivo local ${arquivoLocal}`);
          resultado = processarMalhaLocal(resolverCaminho(arquivoLocal), nomes);
        } else {
          console.log('[malhas] consultando a API de malhas do IBGE...');
          resultado = await baixarMalhaMunicipios(nomes);
        }

        // A Base dos Dados entrega apenas o codigo do municipio. O IBGE e a
        // autoridade sobre a nomenclatura, entao o nome vem da malha — mas so
        // preenche onde ainda nao ha nome de verdade, nunca sobrescreve.
        const atualizar = db.prepare(
          'UPDATE municipios SET nome = ? WHERE codigo_ibge = ? AND (nome IS NULL OR nome = codigo_ibge)',
        );
        let renomeados = 0;
        const transacao = db.transaction(() => {
          for (const [codigo, nome] of resultado.nomes) {
            if (nome !== codigo) renomeados += atualizar.run(nome, codigo).changes;
          }
        });
        transacao();
        if (renomeados > 0) {
          console.log(`[malhas] ${renomeados} municipio(s) passaram a exibir o nome do IBGE.`);
        }
        console.log(
          `[malhas] ${resultado.municipios} municipios | ` +
            `${(resultado.bytes / 1e6).toFixed(2)} MB | ${resultado.caminho}`,
        );

        // A malha cobre o Estado inteiro; o warehouse so tem os municipios com
        // acessos registrados. A diferenca e esperada e informada, nao e erro.
        if (nomes.size > 0 && resultado.municipios !== nomes.size) {
          console.log(
            `[malhas] a malha tem ${resultado.municipios} municipios e o warehouse ` +
              `tem ${nomes.size} com acessos registrados. Municipios sem acesso ` +
              `aparecem no mapa sem preenchimento.`,
          );
        }
        break;
      }

      case 'build':
        build(db);
        break;
      case 'receita': {
        await atualizarCadastroReceita(db);
        break;
      }
      case 'receita-sondar': {
        await sondarFontesReceita(
          resto.length > 0 ? resto : ['66970229000167', '40432544000147', '02558157000162'],
        );
        break;
      }
      case 'status':
        status(db);
        break;
      default:
        console.log(
          'Comandos:\n' +
            '  descobrir                lista os arquivos da Anatel no catalogo aberto\n' +
            '  sincronizar [--anos N]   descobre, baixa e importa sem intervencao\n' +
            '  atualizar <url> [--forcar]  baixa, importa e reconstroi os artefatos\n' +
            '  importar <csv> [--latin1]   importa um arquivo ja baixado\n' +
            '  demo                     gera fixture sintetica e roda o pipeline\n' +
            '  sondar [url...]          testa enderecos candidatos da Anatel\n' +
            '  inventario               imprime o inventario de bases da Anatel (diagnostico)\n' +
            '  bdd-inspecionar          descreve o schema da Base dos Dados (BigQuery)\n' +
            '  bdd-importar [--anos N]  importa os dados do RJ via BigQuery\n' +
            '  municipios [--arquivo <json>] nomes oficiais dos municipios (IBGE)\n' +
            '  malhas [--arquivo <geojson>]  malha municipal do IBGE para o mapa\n' +
            '  build                    reconstroi artefatos a partir do warehouse\n' +
            '  status                   estado do warehouse e alertas de qualidade',
        );
        process.exitCode = 1;
    }
  } finally {
    db.close();
  }
}

principal().catch((erro: unknown) => {
  console.error(erro instanceof Error ? erro.message : erro);
  process.exitCode = 1;
});
