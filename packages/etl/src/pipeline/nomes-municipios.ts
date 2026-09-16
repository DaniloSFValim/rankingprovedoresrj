/**
 * Nomes oficiais dos municipios do RJ (API de localidades do IBGE).
 *
 * POR QUE ESTE MODULO EXISTE
 * --------------------------
 * A malha territorial do IBGE traz apenas o codigo (`codarea`), sem nome. A
 * Base dos Dados tambem entrega so o codigo. Sem esta fonte, as paginas
 * municipais exibiriam "3303302" no lugar de "Niteroi".
 *
 * Os nomes NAO sao codificados neste repositorio. Transcrever 92 pares de
 * codigo e nome de memoria e exatamente o tipo de trabalho em que um erro
 * passa despercebido — e um municipio com nome trocado e um dado errado
 * apresentado como oficial. O IBGE e a autoridade sobre a nomenclatura, entao
 * e dele que os nomes vem.
 */

import fs from 'node:fs';
import { PREFIXO_IBGE_RJ } from '../config.js';

export const URL_LOCALIDADES =
  'https://servicodados.ibge.gov.br/api/v1/localidades/estados/33/municipios';

export interface MunicipioIbge {
  codigoIbge: string;
  nome: string;
  /** Mesorregiao ou regiao imediata, quando a resposta trouxer. */
  regiao: string | null;
}

/**
 * Extrai codigo, nome e regiao de um item da resposta.
 *
 * A API do IBGE ja mudou a hierarquia de regioes entre versoes (microrregiao/
 * mesorregiao versus regiao-imediata/regiao-intermediaria). A leitura tenta os
 * dois caminhos e aceita a ausencia: regiao e opcional no modelo, nome nao e.
 */
function interpretarItem(item: unknown): MunicipioIbge | null {
  if (typeof item !== 'object' || item === null) return null;
  const registro = item as Record<string, unknown>;

  const codigo = String(registro['id'] ?? '').replace(/\D/g, '');
  const nome = String(registro['nome'] ?? '').trim();
  if (codigo.length !== 7 || !codigo.startsWith(PREFIXO_IBGE_RJ) || nome === '') return null;

  const caminho = (...chaves: string[]): string | null => {
    let atual: unknown = registro;
    for (const chave of chaves) {
      if (typeof atual !== 'object' || atual === null) return null;
      atual = (atual as Record<string, unknown>)[chave];
    }
    const texto = typeof atual === 'string' ? atual.trim() : '';
    return texto === '' ? null : texto;
  };

  const regiao =
    caminho('microrregiao', 'mesorregiao', 'nome') ??
    caminho('regiao-imediata', 'regiao-intermediaria', 'nome') ??
    caminho('mesorregiao', 'nome') ??
    null;

  return { codigoIbge: codigo, nome, regiao };
}

export function interpretarLocalidades(bruto: string): MunicipioIbge[] {
  const dados = JSON.parse(bruto) as unknown;
  if (!Array.isArray(dados)) {
    throw new Error(
      'Resposta de localidades do IBGE nao e uma lista. ' +
        'Confira se o arquivo veio de /localidades/estados/33/municipios.',
    );
  }
  const municipios = dados
    .map(interpretarItem)
    .filter((m): m is MunicipioIbge => m !== null);

  if (municipios.length === 0) {
    throw new Error(
      'Nenhum municipio do RJ reconhecido na resposta de localidades do IBGE.',
    );
  }
  return municipios;
}

export function lerLocalidadesDeArquivo(caminho: string): MunicipioIbge[] {
  return interpretarLocalidades(fs.readFileSync(caminho, 'utf8'));
}

export async function baixarLocalidades(timeoutMs = 60_000): Promise<MunicipioIbge[]> {
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), timeoutMs);
  try {
    const resposta = await fetch(URL_LOCALIDADES, {
      signal: controlador.signal,
      headers: { accept: 'application/json', 'user-agent': 'NETRANK-RJ/0.1 (IBGE localidades)' },
    });
    if (!resposta.ok) {
      throw new Error(`API de localidades do IBGE respondeu HTTP ${resposta.status}`);
    }
    return interpretarLocalidades(await resposta.text());
  } finally {
    clearTimeout(temporizador);
  }
}
