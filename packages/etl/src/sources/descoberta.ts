/**
 * Descoberta de arquivos da Anatel no catalogo de dados abertos.
 *
 * POR QUE DESCOBRIR EM VEZ DE FIXAR URLs
 * --------------------------------------
 * O painel em informacoes.anatel.gov.br e um Qlik Sense: camada de
 * visualizacao sobre um backend proprietario. Raspa-lo exigiria engenharia
 * reversa de API interna nao documentada, que quebra sem aviso e sem sinal.
 *
 * Os mesmos numeros sao publicados como dados abertos em CSV. Mas o caminho
 * exato dos arquivos muda entre republicacoes. Fixar URL no codigo produz um
 * pipeline que funciona hoje e falha em silencio depois.
 *
 * Por isso este modulo consulta a API do catalogo (CKAN) e devolve os recursos
 * candidatos. Quem decide o que baixar e o operador — o pipeline nao adivinha.
 *
 * ATENCAO AO LEITOR: os endpoints seguem o padrao CKAN, adotado pelo
 * dados.gov.br. Eles NAO foram validados contra a API em producao no ambiente
 * em que este codigo foi escrito (sem acesso de rede a *.gov.br). Rode
 * `npm run etl -- descobrir` na primeira vez e confira a saida antes de
 * confiar no resultado.
 */

import {
  baixarInventario,
  filtrarBandaLargaFixa,
  interpretarInventario,
  URL_INVENTARIO,
} from './inventario-anatel.js';

const CATALOGOS = [
  {
    nome: 'dados.gov.br',
    base: 'https://dados.gov.br/api/3/action',
    portal: 'https://dados.gov.br/dados/conjuntos-dados',
  },
] as const;

/**
 * Chave de acesso da API do dados.gov.br.
 *
 * A API respondeu HTTP 401 sem ela numa execucao real. A chave e obtida em
 * https://dados.gov.br (cadastro gratuito) e fornecida pelo ambiente — nunca
 * gravada no repositorio. Sem chave, a descoberta ainda funciona pelo
 * inventario da Anatel, que nao exige autenticacao.
 */
function chaveDadosGovBr(): string | null {
  return process.env['DADOS_GOV_BR_API_KEY']?.trim() || null;
}

/**
 * Identificador do conjunto no dados.gov.br, extraido da URL publica:
 * https://dados.gov.br/dados/conjuntos-dados/acessos---banda-larga-fixa
 *
 * Consultar o conjunto pelo id e preciso; a busca textual e o plano B para o
 * caso de o conjunto ser renomeado ou movido.
 */
const ID_CONJUNTO = 'acessos---banda-larga-fixa';

/** Termos usados quando a consulta direta pelo id nao retorna nada. */
const CONSULTA = 'acessos banda larga fixa';

export interface RecursoCandidato {
  catalogo: string;
  conjunto: string;
  conjuntoUrl: string;
  nome: string;
  formato: string;
  url: string;
  bytes: number | null;
  atualizadoEm: string | null;
}

interface ConjuntoCkan {
  name?: string;
  title?: string;
  notes?: string;
  resources?: Array<{
    name?: string;
    format?: string;
    url?: string;
    size?: number | null;
    last_modified?: string | null;
    created?: string | null;
  }>;
}

interface RespostaPacoteCkan {
  success?: boolean;
  result?: ConjuntoCkan;
}

interface RespostaCkan {
  success?: boolean;
  result?: {
    results?: Array<{
      name?: string;
      title?: string;
      notes?: string;
      resources?: Array<{
        name?: string;
        format?: string;
        url?: string;
        size?: number | null;
        last_modified?: string | null;
        created?: string | null;
      }>;
    }>;
  };
}

function cabecalhosCatalogo(): Record<string, string> {
  const cabecalhos: Record<string, string> = { accept: 'application/json' };
  const chave = chaveDadosGovBr();
  // Nome do cabecalho conforme a documentacao da API do dados.gov.br.
  if (chave) cabecalhos['chave-api-dados-abertos'] = chave;
  return cabecalhos;
}

/** Formatos que o pipeline sabe processar. */
const FORMATOS_ACEITOS = new Set(['CSV', 'ZIP', 'TXT', 'GZ']);

function extrairRecursos(
  catalogo: (typeof CATALOGOS)[number],
  conjunto: ConjuntoCkan,
): RecursoCandidato[] {
  const candidatos: RecursoCandidato[] = [];
  for (const recurso of conjunto.resources ?? []) {
    const formato = (recurso.format ?? '').toUpperCase();
    if (!recurso.url || !FORMATOS_ACEITOS.has(formato)) continue;
    candidatos.push({
      catalogo: catalogo.nome,
      conjunto: conjunto.title ?? conjunto.name ?? '(sem titulo)',
      conjuntoUrl: `${catalogo.portal}/${conjunto.name ?? ''}`,
      nome: recurso.name ?? recurso.url.split('/').pop() ?? '(sem nome)',
      formato,
      url: recurso.url,
      bytes: recurso.size ?? null,
      atualizadoEm: recurso.last_modified ?? recurso.created ?? null,
    });
  }
  return candidatos;
}

/** Consulta direta pelo id conhecido do conjunto. */
async function consultarConjunto(
  catalogo: (typeof CATALOGOS)[number],
  sinalTempo: AbortSignal,
): Promise<RecursoCandidato[]> {
  const resposta = await fetch(
    `${catalogo.base}/package_show?id=${encodeURIComponent(ID_CONJUNTO)}`,
    { signal: sinalTempo, headers: cabecalhosCatalogo() },
  );
  if (!resposta.ok) return [];
  const corpo = (await resposta.json()) as RespostaPacoteCkan;
  return corpo.result ? extrairRecursos(catalogo, corpo.result) : [];
}

async function consultarCatalogo(
  catalogo: (typeof CATALOGOS)[number],
  sinalTempo: AbortSignal,
): Promise<RecursoCandidato[]> {
  const url =
    `${catalogo.base}/package_search?q=${encodeURIComponent(CONSULTA)}&rows=25`;

  const resposta = await fetch(url, { signal: sinalTempo, headers: cabecalhosCatalogo() });
  if (!resposta.ok) {
    throw new Error(`${catalogo.nome} respondeu HTTP ${resposta.status}`);
  }

  const corpo = (await resposta.json()) as RespostaCkan;
  const conjuntos = corpo.result?.results ?? [];
  const candidatos: RecursoCandidato[] = [];

  for (const conjunto of conjuntos) {
    for (const recurso of conjunto.resources ?? []) {
      const formato = (recurso.format ?? '').toUpperCase();
      if (!recurso.url || !FORMATOS_ACEITOS.has(formato)) continue;
      candidatos.push({
        catalogo: catalogo.nome,
        conjunto: conjunto.title ?? conjunto.name ?? '(sem titulo)',
        conjuntoUrl: `${catalogo.portal}/${conjunto.name ?? ''}`,
        nome: recurso.name ?? recurso.url.split('/').pop() ?? '(sem nome)',
        formato,
        url: recurso.url,
        bytes: recurso.size ?? null,
        atualizadoEm: recurso.last_modified ?? recurso.created ?? null,
      });
    }
  }
  return candidatos;
}

export interface ResultadoDescoberta {
  candidatos: RecursoCandidato[];
  falhas: Array<{ catalogo: string; motivo: string }>;
  /**
   * Paginas do assunto certo que nao expoem link direto de arquivo.
   *
   * Nao servem para download automatico, mas transformam um beco sem saida em
   * proximo passo: o operador abre a pagina, copia a URL do arquivo e roda
   * `atualizar <url>`.
   */
  paginas: Array<{ descricao: string; url: string }>;
}

/**
 * Varre os catalogos conhecidos e devolve os recursos candidatos.
 *
 * Falha de um catalogo nao derruba a descoberta: o erro e reportado e os
 * demais continuam. Assim, indisponibilidade de um portal nao impede o
 * operador de trabalhar com o outro.
 */
export async function descobrirRecursos(
  timeoutMs = 30_000,
): Promise<ResultadoDescoberta> {
  const candidatos: RecursoCandidato[] = [];
  const falhas: ResultadoDescoberta['falhas'] = [];
  const paginas: ResultadoDescoberta['paginas'] = [];

  // Fonte preferencial: o inventario da Anatel nao exige chave de acesso.
  try {
    const bruto = await baixarInventario(timeoutMs);
    const { linhas } = interpretarInventario(bruto);
    for (const linha of filtrarBandaLargaFixa(linhas)) {
      const descricao = linha.celulas
        .filter((c: string) => c && !/^https?:\/\//i.test(c))
        .join(' — ')
        .slice(0, 160);
      for (const url of linha.urlsPagina) {
        paginas.push({ descricao: descricao || 'Acessos — Banda Larga Fixa', url });
      }
      for (const url of linha.urls) {
        candidatos.push({
          catalogo: 'inventario Anatel',
          conjunto: descricao || 'Acessos — Banda Larga Fixa',
          conjuntoUrl: URL_INVENTARIO,
          nome: decodeURIComponent(url.split('/').pop() ?? url),
          formato: (/\.(zip|csv|txt)/i.exec(url)?.[1] ?? '').toUpperCase(),
          url,
          bytes: null,
          atualizadoEm: null,
        });
      }
    }
  } catch (erro) {
    falhas.push({
      catalogo: 'inventario Anatel',
      motivo: erro instanceof Error ? erro.message : String(erro),
    });
  }

  for (const catalogo of CATALOGOS) {
    const controlador = new AbortController();
    const temporizador = setTimeout(() => controlador.abort(), timeoutMs);
    try {
      // Consulta pelo id conhecido primeiro; busca textual so se nao houver retorno.
      let encontrados = await consultarConjunto(catalogo, controlador.signal);
      if (encontrados.length === 0) {
        encontrados = await consultarCatalogo(catalogo, controlador.signal);
      }
      candidatos.push(...encontrados);
    } catch (erro) {
      falhas.push({
        catalogo: catalogo.nome,
        motivo: erro instanceof Error ? erro.message : String(erro),
      });
    } finally {
      clearTimeout(temporizador);
    }
  }

  // Mais recentes primeiro: a safra que interessa costuma ser a ultima.
  candidatos.sort((a, b) => (b.atualizadoEm ?? '').localeCompare(a.atualizadoEm ?? ''));
  return { candidatos, falhas, paginas };
}

/** Extrai o ano do nome do recurso, quando presente (ex.: "..._2026.zip"). */
export function anoDoRecurso(recurso: RecursoCandidato): number | null {
  const encontrado = /(19|20)\d{2}/.exec(`${recurso.nome} ${recurso.url}`);
  return encontrado ? Number(encontrado[0]) : null;
}
