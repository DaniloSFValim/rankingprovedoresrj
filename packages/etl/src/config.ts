import path from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
export const RAIZ_REPO = path.resolve(aqui, '../../..');

export const CAMINHOS = {
  /** Arquivos baixados da Anatel, sem qualquer modificacao (§5). */
  brutos: path.join(RAIZ_REPO, 'data/raw'),
  /** Arquivos intermediarios descompactados. */
  trabalho: path.join(RAIZ_REPO, 'data/work'),
  /** Warehouse relacional. */
  banco: path.join(RAIZ_REPO, 'data/netrank.sqlite'),
  /** Artefatos JSON consumidos pelo front-end. */
  artefatos: path.join(RAIZ_REPO, 'apps/web/public/data'),
  /** Overrides manuais de normalizacao de empresas (§8, §39). */
  overrides: path.join(RAIZ_REPO, 'data/overrides/empresas.json'),
  /** Cadastro das prestadoras na Receita Federal, versionado como cache. */
  receita: path.join(RAIZ_REPO, 'data/receita/cnpjs.json'),
  /** Domicilios do Censo 2022 (IBGE), denominador da densidade. */
  domicilios: path.join(RAIZ_REPO, 'data/ibge/domicilios-censo-2022.json'),
} as const;

/** Escopo geografico do produto. O filtro e aplicado o mais cedo possivel (§37). */
export const UF_ALVO = 'RJ';

/** Prefixo dos codigos IBGE do Estado do Rio de Janeiro. */
export const PREFIXO_IBGE_RJ = '33';
