import { describe, expect, it } from 'vitest';
import {
  chaveNomeEmpresa,
  normalizarCnpj,
  raizCnpj,
  resolverIdentidadeEmpresa,
} from '../normalize';
import { classificarTecnologia } from '../tecnologia';
import {
  asCompetencia,
  deslocarCompetencia,
  diferencaEmMeses,
  ehCompetenciaValida,
  intervaloCompetencias,
} from '../competencia';

describe('chaveNomeEmpresa', () => {
  it('unifica grafias da mesma prestadora', () => {
    const esperado = 'FULANO TELECOM';
    expect(chaveNomeEmpresa('FULANO TELECOM LTDA')).toBe(esperado);
    expect(chaveNomeEmpresa('Fulano Telecom')).toBe(esperado);
    expect(chaveNomeEmpresa('FULANO TELECOM - ME')).toBe(esperado);
    expect(chaveNomeEmpresa('Fulano  Telecom  EIRELI ME')).toBe(esperado);
  });

  it('remove acentuacao', () => {
    expect(chaveNomeEmpresa('CONEXÃO NET LTDA')).toBe('CONEXAO NET');
  });

  it('nao funde empresas distintas', () => {
    expect(chaveNomeEmpresa('ALFA NET LTDA')).not.toBe(chaveNomeEmpresa('BETA NET LTDA'));
  });
});

describe('cnpj', () => {
  it('aceita apenas 14 digitos', () => {
    expect(normalizarCnpj('12.345.678/0001-95')).toBe('12345678000195');
    expect(normalizarCnpj('123')).toBeNull();
    expect(normalizarCnpj(null)).toBeNull();
  });

  it('agrupa filiais pela raiz', () => {
    expect(raizCnpj('12.345.678/0001-95')).toBe('12345678');
    expect(raizCnpj('12.345.678/0002-76')).toBe('12345678');
  });
});

describe('resolverIdentidadeEmpresa', () => {
  it('prioriza override manual sobre qualquer heuristica', () => {
    const overrides = new Map([['FULANO TELECOM', 'grupo:xyz']]);
    const r = resolverIdentidadeEmpresa(
      { nomeAnatel: 'Fulano Telecom LTDA', cnpj: '12345678000195' },
      overrides,
    );
    expect(r).toEqual({ empresaId: 'grupo:xyz', origem: 'OVERRIDE_MANUAL' });
  });

  it('usa raiz do CNPJ quando disponivel', () => {
    const a = resolverIdentidadeEmpresa({ nomeAnatel: 'X LTDA', cnpj: '12345678000195' });
    const b = resolverIdentidadeEmpresa({ nomeAnatel: 'X FILIAL', cnpj: '12345678000276' });
    expect(a.empresaId).toBe(b.empresaId);
    expect(a.origem).toBe('RAIZ_CNPJ');
  });

  it('cai para nome canonico quando nao ha CNPJ, sinalizando a origem', () => {
    const r = resolverIdentidadeEmpresa({ nomeAnatel: 'Sem Documento Telecom ME' });
    expect(r.origem).toBe('NOME_CANONICO');
    expect(r.empresaId).toBe('nome:SEM DOCUMENTO TELECOM');
  });
});

describe('classificarTecnologia', () => {
  it.each([
    ['Fibra Óptica', 'FIBRA'],
    ['FTTH', 'FIBRA'],
    ['Cable Modem', 'CABO'],
    ['HFC', 'CABO'],
    ['Satélite', 'SATELITE'],
    ['Rádio', 'RADIO'],
    ['WiMAX', 'RADIO'],
    ['ADSL', 'XDSL'],
    ['Tecnologia Inexistente 9000', 'OUTRAS'],
    ['', 'OUTRAS'],
  ])('classifica %s como %s', (bruto, esperado) => {
    expect(classificarTecnologia(bruto)).toBe(esperado);
  });
});

describe('competencia', () => {
  it('valida o formato YYYY-MM', () => {
    expect(ehCompetenciaValida('2026-08')).toBe(true);
    expect(ehCompetenciaValida('2026-13')).toBe(false);
    expect(ehCompetenciaValida('2026-8')).toBe(false);
  });

  it('atravessa a virada de ano nos dois sentidos', () => {
    expect(deslocarCompetencia('2026-01', -1)).toBe('2025-12');
    expect(deslocarCompetencia('2025-12', 1)).toBe('2026-01');
    expect(deslocarCompetencia('2026-08', -12)).toBe('2025-08');
    expect(deslocarCompetencia('2024-03', 25)).toBe('2026-04');
  });

  it('mede distancia em meses com sinal', () => {
    expect(diferencaEmMeses('2025-08', '2026-08')).toBe(12);
    expect(diferencaEmMeses('2026-08', '2025-08')).toBe(-12);
  });

  it('gera intervalo contiguo inclusivo', () => {
    expect(intervaloCompetencias('2025-11', '2026-02'))
      .toEqual(['2025-11', '2025-12', '2026-01', '2026-02']);
    expect(intervaloCompetencias('2026-02', '2025-11')).toEqual([]);
  });

  it('rejeita mes fora de faixa', () => {
    expect(() => asCompetencia(2026, 0)).toThrow(RangeError);
    expect(() => asCompetencia(2026, 13)).toThrow(RangeError);
  });
});
