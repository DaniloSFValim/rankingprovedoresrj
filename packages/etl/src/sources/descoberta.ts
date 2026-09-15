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
 * ATENCAO AO LEITOR: os endpoints abaixo seguem o padrao CKAN, adotado pelo
 * dados.gov.br. Eles NAO foram validados contra a API em producao no ambiente
 * em que este codigo foi escrito (sem acesso de rede a *.gov.br). Rode
 * `npm run etl -- descobrir` na primeira vez e confira a saida antes de
 * confiar no resultado.
 */

const CATALOGOS = [
  {
    nome: 'dados.gov.br',
    base: 'https://dados.gov.br/api/3/action',
    portal: 'https://dados.gov.br/dados/conjuntos-dados',
  },
  {
    nome: 'dados.anatel.gov.br',
    base: 'https://dados.anatel.gov.br/api/3/action',
    portal: 'https://dados.anatel.gov.br/dataset',
  },
] as const;

/** Termos usados para localizar o conjunto de acessos de banda larga fixa. */
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

/** Formatos que o pipeline sabe processar. */
const FORMATOS_ACEITOS = new Set(['CSV', 'ZIP', 'TXT', 'GZ']);

async function consultarCatalogo(
  catalogo: (typeof CATALOGOS)[number],
  sinalTempo: AbortSignal,
): Promise<RecursoCandidato[]> {
  const url =
    `${catalogo.base}/package_search?q=${encodeURIComponent(CONSULTA)}&rows=25`;

  const resposta = await fetch(url, {
    signal: sinalTempo,
    headers: { accept: 'application/json' },
  });
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

  for (const catalogo of CATALOGOS) {
    const controlador = new AbortController();
    const temporizador = setTimeout(() => controlador.abort(), timeoutMs);
    try {
      candidatos.push(...(await consultarCatalogo(catalogo, controlador.signal)));
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
  return { candidatos, falhas };
}

/** Extrai o ano do nome do recurso, quando presente (ex.: "..._2026.zip"). */
export function anoDoRecurso(recurso: RecursoCandidato): number | null {
  const encontrado = /(19|20)\d{2}/.exec(`${recurso.nome} ${recurso.url}`);
  return encontrado ? Number(encontrado[0]) : null;
}
