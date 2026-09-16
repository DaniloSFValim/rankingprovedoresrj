/**
 * Sondagem de enderecos candidatos.
 *
 * POR QUE ISTO EXISTE
 * -------------------
 * A descoberta por catalogo falhou: a API do dados.gov.br exige chave de
 * Administrador de Organizacao, e o inventario publico da Anatel quase nunca
 * traz link direto de arquivo.
 *
 * O inventario revelou, porem, o padrao real de endereco dos arquivos:
 *   www.anatel.gov.br/dadosabertos/paineis_de_dados/<area>/<base>.zip
 *
 * Este modulo NAO assume que uma URL construida a partir desse padrao existe.
 * Ele pergunta ao servidor, por HEAD, e relata o que encontrou. Deduzir uma
 * URL e chute; verificar se ela responde e evidencia. A diferenca importa:
 * o pipeline so aceita enderecos confirmados pelo proprio servidor.
 */

const BASE = 'https://www.anatel.gov.br/dadosabertos/paineis_de_dados';

/**
 * Variacoes de nome observadas ou plausiveis para a base de acessos de banda
 * larga fixa, sob a area "acessos".
 */
function candidatosBase(): string[] {
  const nomes = [
    'acessos_banda_larga_fixa',
    'banda_larga_fixa',
    'Acessos_Banda_Larga_Fixa',
    'acessos_banda_larga',
    'scm',
    'acessos_scm',
  ];
  const areas = ['acessos', 'Acessos'];
  const extensoes = ['zip', 'csv'];

  const urls: string[] = [];
  for (const area of areas) {
    for (const nome of nomes) {
      for (const ext of extensoes) {
        urls.push(`${BASE}/${area}/${nome}.${ext}`);
      }
    }
  }
  return urls;
}

/** Acrescenta variacoes com ano, para fontes particionadas por safra. */
function candidatosComAno(anoAtual: number, anos: number): string[] {
  const urls: string[] = [];
  for (let ano = anoAtual; ano > anoAtual - anos; ano -= 1) {
    for (const nome of ['acessos_banda_larga_fixa', 'banda_larga_fixa']) {
      for (const ext of ['zip', 'csv']) {
        urls.push(`${BASE}/acessos/${nome}_${ano}.${ext}`);
        urls.push(`${BASE}/acessos/${ano}/${nome}.${ext}`);
      }
    }
  }
  return urls;
}

export interface ResultadoSondagem {
  url: string;
  status: number | null;
  bytes: number | null;
  tipo: string | null;
  erro: string | null;
}

/** Existe = respondeu 2xx. Qualquer outra coisa nao e endereco utilizavel. */
export function existe(r: ResultadoSondagem): boolean {
  return r.status !== null && r.status >= 200 && r.status < 300;
}

async function sondarUma(url: string, timeoutMs: number): Promise<ResultadoSondagem> {
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), timeoutMs);
  try {
    const resposta = await fetch(url, {
      method: 'HEAD',
      signal: controlador.signal,
      redirect: 'follow',
      headers: { 'user-agent': 'NETRANK-RJ/0.1 (sondagem de dados abertos)' },
    });
    const tamanho = resposta.headers.get('content-length');
    return {
      url,
      status: resposta.status,
      bytes: tamanho ? Number(tamanho) : null,
      tipo: resposta.headers.get('content-type'),
      erro: null,
    };
  } catch (erro) {
    return {
      url,
      status: null,
      bytes: null,
      tipo: null,
      erro: erro instanceof Error ? erro.message : String(erro),
    };
  } finally {
    clearTimeout(temporizador);
  }
}

/**
 * Sonda todos os candidatos e devolve o relatorio completo — inclusive as
 * falhas, porque saber o que NAO existe tambem orienta a proxima tentativa.
 */
export async function sondarCandidatos(
  extras: readonly string[] = [],
  anos = 3,
  timeoutMs = 20_000,
): Promise<ResultadoSondagem[]> {
  const anoAtual = new Date().getUTCFullYear();
  const urls = [...extras, ...candidatosBase(), ...candidatosComAno(anoAtual, anos)];
  const unicas = [...new Set(urls)];

  const resultados: ResultadoSondagem[] = [];
  // Sequencial de proposito: uma rajada de dezenas de requisicoes simultaneas
  // contra um servidor publico e abuso, e pode render bloqueio por IP.
  for (const url of unicas) {
    resultados.push(await sondarUma(url, timeoutMs));
  }
  return resultados;
}
