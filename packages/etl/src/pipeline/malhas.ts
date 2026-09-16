/**
 * Malha geografica dos municipios do Rio de Janeiro (§18, §19, §32).
 *
 * FONTE: API de malhas territoriais do IBGE. A Anatel publica os acessos, mas
 * nao a geometria; as duas bases se juntam pelo codigo IBGE de 7 digitos, que
 * e a chave comum.
 *
 * ATENCAO AO LEITOR: os endpoints abaixo seguem a documentacao publica da API
 * do IBGE, mas NAO puderam ser validados em producao no ambiente onde este
 * codigo foi escrito (sem acesso de rede a *.gov.br). Por isso ha uma lista de
 * candidatos, tentados em ordem, e a falha de todos produz erro explicito com
 * instrucao de download manual — nunca uma malha aproximada ou inventada.
 */

import fs from 'node:fs';
import path from 'node:path';
import { CAMINHOS, PREFIXO_IBGE_RJ } from '../config.js';

/** Codigo do Estado do Rio de Janeiro na base territorial do IBGE. */
const UF_IBGE_RJ = 33;

/**
 * Candidatos de endpoint, do mais preciso ao mais generico.
 * `qualidade=intermediaria` equilibra fidelidade e tamanho: a malha maxima
 * passa de dezenas de MB, inviavel para carregar no navegador.
 */
const ENDPOINTS = [
  `https://servicodados.ibge.gov.br/api/v3/malhas/estados/${UF_IBGE_RJ}` +
    `?formato=application/vnd.geo+json&qualidade=intermediaria&intrarregiao=municipio`,
  `https://servicodados.ibge.gov.br/api/v3/malhas/estados/${UF_IBGE_RJ}` +
    `?formato=application/vnd.geo+json&intrarregiao=municipio`,
  `https://servicodados.ibge.gov.br/api/v2/malhas/${UF_IBGE_RJ}` +
    `?formato=application/vnd.geo+json&resolucao=5`,
] as const;

interface Geometria {
  type: string;
  coordinates: unknown;
}

interface Feicao {
  type: 'Feature';
  properties: Record<string, unknown>;
  geometry: Geometria | null;
}

interface ColecaoGeoJson {
  type: 'FeatureCollection';
  features: Feicao[];
}

/**
 * Localiza o codigo IBGE nas propriedades da feicao.
 * As versoes da API usam nomes diferentes; tentamos todos antes de desistir.
 */
function extrairCodigoIbge(feicao: Feicao): string | null {
  const candidatos = ['codarea', 'CD_MUN', 'cd_mun', 'codigo', 'id', 'GEOCODIGO'];
  for (const chave of candidatos) {
    const valor = feicao.properties[chave];
    if (valor === undefined || valor === null) continue;
    const digitos = String(valor).replace(/\D/g, '');
    if (digitos.length === 7 && digitos.startsWith(PREFIXO_IBGE_RJ)) return digitos;
  }
  return null;
}

/**
 * Reduz a precisao das coordenadas para 4 casas decimais (~11 m).
 *
 * Numa visualizacao estadual esse erro e menor que a espessura da linha
 * desenhada, e a reducao de tamanho do arquivo costuma passar de 50%. E
 * simplificacao de representacao, nao alteracao de dado analitico: nenhum
 * indicador do produto depende da geometria.
 */
function reduzirPrecisao(valor: unknown): unknown {
  if (typeof valor === 'number') return Math.round(valor * 1e4) / 1e4;
  if (Array.isArray(valor)) return valor.map(reduzirPrecisao);
  return valor;
}

export interface ResultadoMalha {
  caminho: string;
  municipios: number;
  bytes: number;
  endpoint: string;
  /**
   * Nome de cada municipio conforme o IBGE.
   *
   * A Base dos Dados entrega apenas o codigo IBGE; sem esta fonte, as paginas
   * municipais exibiriam numeros no lugar de nomes. O IBGE e a autoridade
   * sobre a nomenclatura oficial, entao e dele que o nome vem.
   */
  nomes: Map<string, string>;
}

/**
 * Processa uma malha ja baixada, para quando o download automatico nao e
 * possivel. Mesmo tratamento do caminho online.
 */
export function processarMalhaLocal(
  caminhoArquivo: string,
  nomesConhecidos: ReadonlyMap<string, string> = new Map(),
): ResultadoMalha {
  const bruto = fs.readFileSync(caminhoArquivo, 'utf8');
  const colecao = JSON.parse(bruto) as ColecaoGeoJson;
  const resultado = normalizarColecao(colecao, nomesConhecidos);
  if (resultado.feicoes.length === 0) {
    throw new Error(
      `Nenhuma feicao com codigo IBGE do RJ reconhecivel em ${caminhoArquivo}. ` +
        `Confira se o arquivo e a malha municipal do Estado do Rio de Janeiro.`,
    );
  }
  return gravarMalha(resultado, `arquivo local: ${caminhoArquivo}`);
}

interface ColecaoNormalizada {
  feicoes: Feicao[];
  semCodigo: number;
  nomes: Map<string, string>;
}

function normalizarColecao(
  colecao: ColecaoGeoJson,
  nomesConhecidos: ReadonlyMap<string, string>,
): ColecaoNormalizada {
  const feicoes: Feicao[] = [];
  const nomes = new Map<string, string>();
  let semCodigo = 0;

  for (const feicao of colecao.features ?? []) {
    const codigo = extrairCodigoIbge(feicao);
    if (!codigo) {
      semCodigo += 1;
      continue;
    }
    const nome = nomeDaFeicao(feicao) ?? nomesConhecidos.get(codigo) ?? codigo;
    nomes.set(codigo, nome);
    feicoes.push({
      type: 'Feature',
      // O ECharts casa geometria com dados pelo campo `name`. Usamos o codigo
      // IBGE: e estavel e nao sofre com divergencia de grafia entre fontes.
      properties: { name: codigo, codigoIbge: codigo, nome },
      geometry: feicao.geometry
        ? { type: feicao.geometry.type, coordinates: reduzirPrecisao(feicao.geometry.coordinates) }
        : null,
    });
  }

  return { feicoes, semCodigo, nomes };
}

/** Procura o nome do municipio nas propriedades da feicao. */
function nomeDaFeicao(feicao: Feicao): string | null {
  for (const chave of ['nome', 'NM_MUN', 'nm_mun', 'name', 'NOME', 'municipio']) {
    const valor = feicao.properties[chave];
    if (typeof valor === 'string' && valor.trim() !== '' && !/^\d+$/.test(valor.trim())) {
      return valor.trim();
    }
  }
  return null;
}

function gravarMalha(normalizada: ColecaoNormalizada, endpoint: string): ResultadoMalha {
  const destino = path.join(CAMINHOS.artefatos, 'malhas/rj-municipios.json');
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.writeFileSync(
    destino,
    JSON.stringify({ type: 'FeatureCollection', features: normalizada.feicoes }),
    'utf8',
  );
  if (normalizada.semCodigo > 0) {
    console.warn(
      `[malhas] ${normalizada.semCodigo} feicao(oes) sem codigo IBGE reconhecivel foram ignoradas.`,
    );
  }
  return {
    caminho: destino,
    municipios: normalizada.feicoes.length,
    bytes: fs.statSync(destino).size,
    endpoint,
    nomes: normalizada.nomes,
  };
}

/**
 * Baixa, normaliza e grava a malha municipal do RJ.
 *
 * `nomesPorCodigo` vem do warehouse: a malha do IBGE traz o codigo, e usamos
 * o nome ja normalizado pelo pipeline para que mapa e tabelas exibam
 * exatamente o mesmo rotulo.
 */
export async function baixarMalhaMunicipios(
  nomesPorCodigo: ReadonlyMap<string, string>,
  timeoutMs = 120_000,
): Promise<ResultadoMalha> {
  const falhas: string[] = [];

  for (const endpoint of ENDPOINTS) {
    const controlador = new AbortController();
    const temporizador = setTimeout(() => controlador.abort(), timeoutMs);
    try {
      const resposta = await fetch(endpoint, {
        signal: controlador.signal,
        headers: {
          accept: 'application/geo+json, application/json',
          'user-agent': 'NETRANK-RJ/0.1 (malhas IBGE)',
        },
      });
      if (!resposta.ok) {
        falhas.push(`${endpoint} -> HTTP ${resposta.status}`);
        continue;
      }

      const colecao = (await resposta.json()) as ColecaoGeoJson;
      if (!colecao.features || colecao.features.length === 0) {
        falhas.push(`${endpoint} -> resposta sem feicoes`);
        continue;
      }

      const normalizada = normalizarColecao(colecao, nomesPorCodigo);
      if (normalizada.feicoes.length === 0) {
        falhas.push(
          `${endpoint} -> nenhuma feicao com codigo IBGE do RJ reconhecivel ` +
            `(${colecao.features.length} feicoes recebidas)`,
        );
        continue;
      }
      return gravarMalha(normalizada, endpoint);
    } catch (erro) {
      falhas.push(`${endpoint} -> ${erro instanceof Error ? erro.message : String(erro)}`);
    } finally {
      clearTimeout(temporizador);
    }
  }

  throw new Error(
    `Nao foi possivel obter a malha municipal do IBGE.\n` +
      falhas.map((f) => `  - ${f}`).join('\n') +
      `\n\nAlternativa manual: baixe o GeoJSON dos municipios do RJ em\n` +
      `  https://servicodados.ibge.gov.br/api/docs/malhas\n` +
      `e grave em ${path.join(CAMINHOS.artefatos, 'malhas/rj-municipios.json')},\n` +
      `com cada feicao tendo properties.name igual ao codigo IBGE de 7 digitos.\n` +
      `Sem a malha, o mapa de calor continua funcionando como treemap.`,
  );
}
