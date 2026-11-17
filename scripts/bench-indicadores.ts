/**
 * Mede o tempo dos cálculos de indicadores sobre um volume sintético do tamanho
 * da base real (cerca de 1.300 prestadoras, 92 municípios, 21 competências).
 * Uso: npx tsx scripts/bench-indicadores.ts
 */
import { calcularConcentracao, compararRankings, construirRanking } from '@netrank/core';
import type { ParticipanteMercado } from '@netrank/core';

const PRESTADORAS = 1300;
const MUNICIPIOS = 92;
const COMPETENCIAS = 21;

let semente = 42;
const aleatorio = () => ((semente = (semente * 16807) % 2147483647) / 2147483647);

const gerar = (n: number): ParticipanteMercado[] =>
  Array.from({ length: n }, (_, i) => ({
    empresaId: `cnpj:${String(i).padStart(8, '0')}`,
    acessos: Math.floor(aleatorio() ** 3 * 100000),
  }));

const inicio = performance.now();
let registros = 0;
for (let c = 0; c < COMPETENCIAS; c++) {
  const estado = gerar(PRESTADORAS);
  registros += estado.length;
  const atual = construirRanking(estado);
  compararRankings(atual, construirRanking(gerar(PRESTADORAS)));
  calcularConcentracao(estado);
  for (let m = 0; m < MUNICIPIOS; m++) {
    const local = gerar(Math.floor(PRESTADORAS / 8));
    registros += local.length;
    construirRanking(local);
    calcularConcentracao(local);
  }
}
const ms = performance.now() - inicio;
console.log(`${registros.toLocaleString('pt-BR')} combinações prestadora × local × mês em ${ms.toFixed(0)} ms`);
