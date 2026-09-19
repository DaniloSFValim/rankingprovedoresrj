/**
 * Classificação de tipo de atuação: Operadora, Provedor ou Ambos.
 *
 * Define se uma empresa é:
 * - OPERADORA: Gerencia infraestrutura nacional/regional (backbone)
 * - PROVEDOR: ISP local/regional que entrega ao cliente final
 * - AMBOS: Grande empresa que faz backbone e entrega direto
 * - INDEFINIDO: Dados insuficientes para classificar
 *
 * Baseado em: grupo econômico, cobertura territorial, e patterns conhecidos.
 */

export type TipoAtuacao = 'OPERADORA' | 'PROVEDOR' | 'AMBOS' | 'INDEFINIDO';

interface DadosClassificacao {
  nome: string;
  grupoEconomico: string | null;
  municipiosAtendidos: number;
  acessosTotais: number;
  tecnologiasPrincipais: string[]; // ex: ['Fibra', 'ADSL']
}

/**
 * Classifica o tipo de atuação de uma empresa de telecomunicações.
 *
 * Regras aplicadas em ordem:
 * 1. Operadoras nacionais conhecidas (Claro, OI, Vivo, TIM)
 * 2. Provedores satelitais puros (Hughes, Starlink)
 * 3. Telebras (estatal de backbone)
 * 4. Heurísticas por cobertura e grupo econômico
 */
export function classificarTipoAtuacao(dados: DadosClassificacao): TipoAtuacao {
  const nome = dados.nome.toLowerCase();
  const grupo = (dados.grupoEconomico ?? '').toLowerCase();
  const municipios = dados.municipiosAtendidos;

  // Operadoras nacionais: sempre AMBOS (backbone + provedor direto)
  // Claro: América Móvil (México)
  if (
    nome.includes('claro') ||
    grupo.includes('américa móvil') ||
    grupo.includes('america movil')
  ) {
    return 'AMBOS';
  }

  // OI: Grupo Oi/Oi Móvel
  if (nome.includes('oi s.a') || nome.includes('oi móvel') || grupo.includes('oi móvel')) {
    return 'AMBOS';
  }

  // Vivo: Telefónica Brasil
  if (
    nome.includes('vivo') ||
    nome.includes('telefônica brasil') ||
    grupo.includes('telefónica') ||
    grupo.includes('telefonica')
  ) {
    return 'AMBOS';
  }

  // TIM: Telecom Italia
  if (
    nome.includes('tim') ||
    nome.includes('telecom italia') ||
    grupo.includes('telecom italia')
  ) {
    return 'AMBOS';
  }

  // Operadora estatal (backbone)
  if (
    nome.includes('telebras') ||
    nome.includes('telecomunicações brasileiras')
  ) {
    return 'OPERADORA';
  }

  // Provedores satelitais puros: SEMPRE PROVEDOR
  if (nome.includes('starlink') || nome.includes('hughes')) {
    return 'PROVEDOR';
  }

  // Algar/CTBC: Grande operadora regional
  if (
    nome.includes('algar') ||
    nome.includes('ctbc') ||
    grupo.includes('algar')
  ) {
    return 'AMBOS';
  }

  // Sem dados suficientes: nenhum municipio atendido
  if (municipios === 0) {
    return 'INDEFINIDO';
  }

  // Heurísticas baseadas em cobertura territorial
  // Presença em 70+ municípios + grupo independente = ambição de operadora regional
  if (municipios >= 70 && grupo.includes('independente')) {
    return 'AMBOS';
  }

  // Presença em 50-69 municípios = provedor regional
  if (municipios >= 50 && municipios < 70) {
    return 'PROVEDOR';
  }

  // Presença em 1-49 municípios = provedor local
  if (municipios > 0 && municipios < 50) {
    return 'PROVEDOR';
  }

  // Sem dados suficientes
  return 'INDEFINIDO';
}

/**
 * Aplica classificação em massa a um conjunto de empresas.
 * Útil para o pipeline ETL.
 */
export function classificarEmpresas(
  empresas: Array<{
    id: string;
    nome: string;
    grupoEconomico: string | null;
  }>,
  metadadosEmpresa: Map<
    string,
    { municipiosAtendidos: number; acessosTotais: number; tecnologias: string[] }
  >,
): Map<string, TipoAtuacao> {
  const resultado = new Map<string, TipoAtuacao>();

  for (const empresa of empresas) {
    const meta = metadadosEmpresa.get(empresa.id) ?? {
      municipiosAtendidos: 0,
      acessosTotais: 0,
      tecnologias: [],
    };

    const tipo = classificarTipoAtuacao({
      nome: empresa.nome,
      grupoEconomico: empresa.grupoEconomico,
      municipiosAtendidos: meta.municipiosAtendidos,
      acessosTotais: meta.acessosTotais,
      tecnologiasPrincipais: meta.tecnologias,
    });

    resultado.set(empresa.id, tipo);
  }

  return resultado;
}
