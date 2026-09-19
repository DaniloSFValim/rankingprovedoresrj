/**
 * Classificacao de tecnologia de acesso (§33).
 *
 * A Anatel publica o campo "Tecnologia" com dezenas de rotulos e a grafia
 * varia entre safras do arquivo. Reduzimos a um conjunto fechado e estavel,
 * preservando o rotulo bruto no warehouse para auditoria.
 *
 * Rotulo desconhecido NAO e descartado nem chutado: cai em 'OUTRAS' e e
 * contabilizado no relatorio de qualidade (§40), para que a lista abaixo
 * possa ser estendida conscientemente.
 */

import { canonizarTexto } from './normalize';
import type { Tecnologia } from './types';

const REGRAS: ReadonlyArray<readonly [RegExp, Tecnologia]> = [
  [/\bFIBRA\b|\bFTT[HBCX]\b|\bGPON\b|\bOPTIC/, 'FIBRA'],
  [/\bCABO\b|\bCABLE\s*MODEM\b|\bHFC\b|\bDOCSIS\b|\bCOAXIAL\b/, 'CABO'],
  [/\bSATELIT|\bVSAT\b|\bGEO\b|\bLEO\b/, 'SATELITE'],
  [/\bRADIO\b|\bWIFI\b|\bWI FI\b|\bWIMAX\b|\bMMDS\b|\bESPALHAMENTO/, 'RADIO'],
  [/\bDSL\b|\bADSL\b|\bVDSL\b|\bHDSL\b|\bSDSL\b|\bXDSL\b|\bCOBRE\b/, 'XDSL'],
];

export function classificarTecnologia(rotuloBruto: string): Tecnologia {
  const texto = canonizarTexto(rotuloBruto);
  if (!texto) return 'OUTRAS';
  for (const [padrao, tecnologia] of REGRAS) {
    if (padrao.test(texto)) return tecnologia;
  }
  return 'OUTRAS';
}

/** true quando o rotulo nao casou com nenhuma regra conhecida. */
export function ehTecnologiaNaoMapeada(rotuloBruto: string): boolean {
  return classificarTecnologia(rotuloBruto) === 'OUTRAS'
    && canonizarTexto(rotuloBruto) !== 'OUTRAS';
}
