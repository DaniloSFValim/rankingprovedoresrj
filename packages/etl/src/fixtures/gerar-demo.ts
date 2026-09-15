/**
 * Gerador de dados DEMONSTRATIVOS (§48).
 *
 * AVISO INEGOCIAVEL: nada aqui e dado da Anatel. O arquivo produzido serve
 * exclusivamente para exercitar o pipeline e a interface em desenvolvimento.
 *
 * Tres salvaguardas impedem que este dado seja confundido com o oficial:
 *   1. Os provedores tem nomes ostensivamente ficticios ("Provedor Alfa").
 *      Nenhum nome de empresa real aparece.
 *   2. A procedencia gravada no warehouse carrega dadosDemonstrativos = true,
 *      e a interface exibe faixa de aviso permanente enquanto a flag estiver
 *      ligada.
 *   3. O build de producao recusa artefatos com a flag ligada.
 *
 * Os codigos IBGE abaixo correspondem a municipios reais do RJ para que o
 * formato seja realista, mas os ACESSOS sao integralmente sinteticos.
 */

import fs from 'node:fs';
import path from 'node:path';
import { asCompetencia, deslocarCompetencia, type Competencia } from '@netrank/core';

const MUNICIPIOS_DEMO: ReadonlyArray<readonly [string, string, number]> = [
  ['3304557', 'Rio de Janeiro', 100],
  ['3304904', 'São Gonçalo', 22],
  ['3301702', 'Duque de Caxias', 18],
  ['3303500', 'Nova Iguaçu', 16],
  ['3303302', 'Niterói', 15],
  ['3301009', 'Campos dos Goytacazes', 9],
  ['3303906', 'Petrópolis', 7],
  ['3306305', 'Volta Redonda', 6],
  ['3302403', 'Macaé', 5],
  ['3300704', 'Cabo Frio', 4],
];

interface ProvedorDemo {
  nome: string;
  cnpj: string;
  grupo: string;
  tecnologia: string;
  peso: number;
  tendenciaMensal: number;
  cobertura: number;
}

const PROVEDORES_DEMO: readonly ProvedorDemo[] = [
  { nome: 'Provedor Alfa Telecom LTDA', cnpj: '11111111000191', grupo: 'Grupo Alfa', tecnologia: 'Fibra', peso: 30, tendenciaMensal: 0.004, cobertura: 1.0 },
  { nome: 'Beta Fibra S.A.', cnpj: '22222222000172', grupo: 'Grupo Beta', tecnologia: 'Fibra', peso: 22, tendenciaMensal: 0.012, cobertura: 1.0 },
  { nome: 'Gama Cabo Comunicações LTDA', cnpj: '33333333000153', grupo: 'Grupo Gama', tecnologia: 'Cable Modem', peso: 16, tendenciaMensal: -0.009, cobertura: 0.6 },
  { nome: 'Delta Net EIRELI', cnpj: '44444444000134', grupo: 'Grupo Delta', tecnologia: 'Fibra', peso: 9, tendenciaMensal: 0.021, cobertura: 0.5 },
  { nome: 'Epsilon Banda Larga ME', cnpj: '55555555000115', grupo: 'Grupo Epsilon', tecnologia: 'Fibra', peso: 6, tendenciaMensal: 0.018, cobertura: 0.4 },
  { nome: 'Zeta Conecta LTDA', cnpj: '66666666000196', grupo: 'Grupo Zeta', tecnologia: 'Rádio', peso: 4, tendenciaMensal: -0.015, cobertura: 0.7 },
  { nome: 'Eta Digital LTDA', cnpj: '77777777000177', grupo: 'Grupo Eta', tecnologia: 'Fibra', peso: 3, tendenciaMensal: 0.03, cobertura: 0.3 },
  { nome: 'Theta Telecom ME', cnpj: '88888888000158', grupo: 'Grupo Theta', tecnologia: 'ADSL', peso: 3, tendenciaMensal: -0.035, cobertura: 0.4 },
  { nome: 'Iota Redes LTDA', cnpj: '99999999000139', grupo: 'Grupo Iota', tecnologia: 'Fibra', peso: 2, tendenciaMensal: 0.025, cobertura: 0.3 },
  { nome: 'Kappa Satélite LTDA', cnpj: '10101010000112', grupo: 'Grupo Kappa', tecnologia: 'Satélite', peso: 1, tendenciaMensal: 0.006, cobertura: 1.0 },
  { nome: 'Lambda Fibra ME', cnpj: '12121212000193', grupo: 'Grupo Lambda', tecnologia: 'Fibra', peso: 2, tendenciaMensal: 0.04, cobertura: 0.2 },
  { nome: 'Mu Conexão EIRELI', cnpj: '13131313000174', grupo: 'Grupo Mu', tecnologia: 'Fibra', peso: 2, tendenciaMensal: 0.01, cobertura: 0.2 },
];

/** PRNG deterministico — o mesmo comando sempre gera o mesmo arquivo. */
function criarRandom(semente: number): () => number {
  let estado = semente >>> 0;
  return () => {
    estado = (Math.imul(estado, 1664525) + 1013904223) >>> 0;
    return estado / 0x100000000;
  };
}

const CABECALHO = [
  'Ano', 'Mês', 'Grupo Econômico', 'Empresa', 'CNPJ', 'UF',
  'Município', 'Código IBGE', 'Tecnologia', 'Acessos',
].join(';');

export interface OpcoesDemo {
  meses?: number;
  competenciaFinal?: Competencia;
  semente?: number;
}

export function gerarCsvDemo(opcoes: OpcoesDemo = {}): string {
  const meses = opcoes.meses ?? 24;
  const fim =
    opcoes.competenciaFinal ??
    asCompetencia(new Date().getUTCFullYear(), new Date().getUTCMonth() + 1);
  const random = criarRandom(opcoes.semente ?? 20260915);

  const linhas: string[] = [CABECALHO];
  const municipiosOrdenados = [...MUNICIPIOS_DEMO];

  for (let i = meses - 1; i >= 0; i -= 1) {
    const competencia = deslocarCompetencia(fim, -i);
    const [ano, mes] = competencia.split('-') as [string, string];
    const mesesDecorridos = meses - 1 - i;

    for (const provedor of PROVEDORES_DEMO) {
      const alcance = Math.max(1, Math.round(municipiosOrdenados.length * provedor.cobertura));
      for (const [codigoIbge, nome, pesoMunicipio] of municipiosOrdenados.slice(0, alcance)) {
        const base = provedor.peso * pesoMunicipio * 12;
        const tendencia = Math.pow(1 + provedor.tendenciaMensal, mesesDecorridos);
        const ruido = 0.97 + random() * 0.06;
        const acessos = Math.round(base * tendencia * ruido);
        if (acessos <= 0) continue;
        linhas.push(
          [
            ano, String(Number(mes)), provedor.grupo, provedor.nome, provedor.cnpj,
            'RJ', nome, codigoIbge, provedor.tecnologia, String(acessos),
          ].join(';'),
        );
      }
    }

    // Linha de outra UF em toda competencia: garante que o filtro RJ (§37)
    // esteja sendo exercitado pelo pipeline, e nao apenas pelos testes.
    linhas.push(
      [ano, String(Number(mes)), 'Grupo Externo', 'Provedor Fora do Escopo LTDA',
       '14141414000155', 'SP', 'São Paulo', '3550308', 'Fibra', '999999'].join(';'),
    );
  }

  return linhas.join('\n');
}

export function escreverCsvDemo(destino: string, opcoes: OpcoesDemo = {}): string {
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.writeFileSync(destino, gerarCsvDemo(opcoes), 'utf8');
  return destino;
}
