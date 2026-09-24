import fs from 'node:fs';
import path from 'node:path';
import { CAMINHOS, PREFIXO_IBGE_RJ } from '../config.js';

/**
 * Domicilios particulares permanentes ocupados, Censo 2022 (IBGE, SIDRA
 * tabela 4712, variavel 381). Denominador da densidade: acessos de pessoa
 * fisica por 100 domicilios, o mesmo conceito da densidade da Anatel.
 *
 * A densidade publicada pela Anatel nao e usada: a serie tem lacunas (2023 e
 * 2024 ausentes) e valores de 2026 incompativeis com os proprios acessos.
 */
export const URL_SIDRA_DOMICILIOS =
  'https://apisidra.ibge.gov.br/values/t/4712/n6/in%20n3%2033/v/381/p/2022';

export interface DomiciliosCenso {
  fonte: string;
  url: string;
  referencia: string;
  consultadoEm: string;
  municipios: Record<string, number>;
}

/** Converte a resposta do SIDRA; aborta se o formato nao for o esperado. */
export function converterRespostaSidra(corpo: unknown): Record<string, number> {
  if (!Array.isArray(corpo) || corpo.length < 2) throw new Error('SIDRA: resposta vazia');
  const municipios: Record<string, number> = {};
  for (const linha of corpo.slice(1) as Array<Record<string, string>>) {
    if (linha['D2C'] !== '381') continue;
    const codigo = String(linha['D1C'] ?? '');
    const valor = Number(linha['V']);
    if (!/^\d{7}$/.test(codigo) || !codigo.startsWith(PREFIXO_IBGE_RJ)) continue;
    if (!Number.isInteger(valor) || valor <= 0) throw new Error(`SIDRA: valor invalido para ${codigo}: ${linha['V']}`);
    municipios[codigo] = valor;
  }
  const total = Object.keys(municipios).length;
  if (total !== 92) throw new Error(`SIDRA: esperados 92 municipios do RJ, recebidos ${total}`);
  return municipios;
}

export function lerDomicilios(caminho: string = CAMINHOS.domicilios): DomiciliosCenso | null {
  if (!fs.existsSync(caminho)) return null;
  return JSON.parse(fs.readFileSync(caminho, 'utf8')) as DomiciliosCenso;
}

export async function baixarDomicilios(caminho: string = CAMINHOS.domicilios): Promise<void> {
  const resposta = await fetch(URL_SIDRA_DOMICILIOS, { headers: { Accept: 'application/json' } });
  if (!resposta.ok) throw new Error(`SIDRA: HTTP ${resposta.status}`);
  const municipios = converterRespostaSidra(await resposta.json());
  const dados: DomiciliosCenso = {
    fonte: 'IBGE, Censo Demográfico 2022 — domicílios particulares permanentes ocupados (SIDRA, tabela 4712)',
    url: URL_SIDRA_DOMICILIOS,
    referencia: '2022',
    consultadoEm: new Date().toISOString(),
    municipios,
  };
  fs.mkdirSync(path.dirname(caminho), { recursive: true });
  fs.writeFileSync(caminho, JSON.stringify(dados, null, 1) + '\n', 'utf8');
  const soma = Object.values(municipios).reduce((a, b) => a + b, 0);
  console.log(`[domicilios] 92 municipios, ${soma.toLocaleString('pt-BR')} domicilios (Censo 2022)`);
}
