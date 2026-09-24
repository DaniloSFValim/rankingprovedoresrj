import { describe, expect, it } from 'vitest';
import { converterRespostaSidra } from '../pipeline/domicilios.js';

const cabecalho = { NC: 'Nível Territorial (Código)', D1C: 'Município (Código)', D2C: 'Variável (Código)', V: 'Valor' };
const linha = (codigo: string, variavel: string, valor: string) => ({ NC: '6', D1C: codigo, D2C: variavel, V: valor });
const municipiosRj = Array.from({ length: 92 }, (_, i) => `33${String(i).padStart(5, '0')}`);

describe('converterRespostaSidra', () => {
  it('le a variavel 381 dos 92 municipios e ignora as demais variaveis', () => {
    const corpo = [
      cabecalho,
      ...municipiosRj.map((c) => linha(c, '381', '1000')),
      ...municipiosRj.map((c) => linha(c, '382', '2600')),
    ];
    const r = converterRespostaSidra(corpo);
    expect(Object.keys(r)).toHaveLength(92);
    expect(r['3300000']).toBe(1000);
  });
  it('aborta quando faltam municipios', () => {
    const corpo = [cabecalho, ...municipiosRj.slice(1).map((c) => linha(c, '381', '1000'))];
    expect(() => converterRespostaSidra(corpo)).toThrow(/92/);
  });
  it('aborta com valor nao numerico, em vez de gravar zero', () => {
    const corpo = [cabecalho, ...municipiosRj.map((c, i) => linha(c, '381', i === 0 ? '...' : '1000'))];
    expect(() => converterRespostaSidra(corpo)).toThrow(/invalido/);
  });
});
