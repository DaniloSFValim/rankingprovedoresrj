import { describe, it, expect } from 'vitest';
import {
  classificarTipoAtuacao,
  classificarEmpresas,
  type TipoAtuacao,
} from '../pipeline/classificar-tipo-atuacao.js';

describe('classificarTipoAtuacao', () => {
  // Operadoras nacionais
  describe('Operadoras Nacionais (AMBOS)', () => {
    it('classifica Claro como AMBOS', () => {
      const resultado = classificarTipoAtuacao({
        nome: 'CLARO S.A.',
        grupoEconomico: 'América Móvil',
        municipiosAtendidos: 92,
        acessosTotais: 1342408,
        tecnologiasPrincipais: ['Fibra'],
      });
      expect(resultado).toBe('AMBOS');
    });

    it('classifica OI como AMBOS', () => {
      const resultado = classificarTipoAtuacao({
        nome: 'OI S.A.',
        grupoEconomico: 'Oi Móvel',
        municipiosAtendidos: 92,
        acessosTotais: 657314,
        tecnologiasPrincipais: ['Fibra'],
      });
      expect(resultado).toBe('AMBOS');
    });

    it('classifica Vivo/Telefónica como AMBOS', () => {
      const resultado = classificarTipoAtuacao({
        nome: 'TELEFÔNICA BRASIL S.A.',
        grupoEconomico: 'Telefónica Group',
        municipiosAtendidos: 76,
        acessosTotais: 391515,
        tecnologiasPrincipais: ['Fibra'],
      });
      expect(resultado).toBe('AMBOS');
    });

    it('classifica TIM como AMBOS', () => {
      const resultado = classificarTipoAtuacao({
        nome: 'TELECOM ITALIA BRASIL S.A.',
        grupoEconomico: 'Telecom Italia Group',
        municipiosAtendidos: 41,
        acessosTotais: 112315,
        tecnologiasPrincipais: ['Fibra'],
      });
      expect(resultado).toBe('AMBOS');
    });

    it('classifica Algar/CTBC como AMBOS', () => {
      const resultado = classificarTipoAtuacao({
        nome: 'ALGAR TELECOM (CTBC TELECOM)',
        grupoEconomico: 'Grupo Algar',
        municipiosAtendidos: 48,
        acessosTotais: 3481,
        tecnologiasPrincipais: ['Fibra'],
      });
      expect(resultado).toBe('AMBOS');
    });
  });

  // Operadora estatal
  describe('Operadora Estatal (OPERADORA)', () => {
    it('classifica Telebras como OPERADORA', () => {
      const resultado = classificarTipoAtuacao({
        nome: 'TELECOMUNICAÇÕES BRASILEIRAS S.A.',
        grupoEconomico: 'Governo Brasileiro',
        municipiosAtendidos: 78,
        acessosTotais: 597,
        tecnologiasPrincipais: ['Fibra'],
      });
      expect(resultado).toBe('OPERADORA');
    });
  });

  // Provedores regionais
  describe('Provedores Regionais (PROVEDOR)', () => {
    it('classifica Giga Mais Fibra como PROVEDOR', () => {
      const resultado = classificarTipoAtuacao({
        nome: 'GIGA MAIS FIBRA LTDA.',
        grupoEconomico: 'Independente',
        municipiosAtendidos: 59,
        acessosTotais: 316906,
        tecnologiasPrincipais: ['Fibra'],
      });
      expect(resultado).toBe('PROVEDOR');
    });

    it('classifica PlayFibra como PROVEDOR', () => {
      const resultado = classificarTipoAtuacao({
        nome: 'PLAYFIBRA LTDA.',
        grupoEconomico: 'Independente',
        municipiosAtendidos: 3,
        acessosTotais: 4821,
        tecnologiasPrincipais: ['Fibra'],
      });
      expect(resultado).toBe('PROVEDOR');
    });

    it('classifica Vero como PROVEDOR', () => {
      const resultado = classificarTipoAtuacao({
        nome: 'VERO LTDA.',
        grupoEconomico: 'Independente',
        municipiosAtendidos: 10,
        acessosTotais: 1081,
        tecnologiasPrincipais: ['Fibra'],
      });
      expect(resultado).toBe('PROVEDOR');
    });

    it('classifica Leste Telecom como PROVEDOR', () => {
      const resultado = classificarTipoAtuacao({
        nome: 'LESTE TELECOM LTDA.',
        grupoEconomico: 'Independente',
        municipiosAtendidos: 1,
        acessosTotais: 2095,
        tecnologiasPrincipais: ['Fibra'],
      });
      expect(resultado).toBe('PROVEDOR');
    });
  });

  // Provedores satelitais
  describe('Provedores Satelitais (PROVEDOR)', () => {
    it('classifica Hughes como PROVEDOR', () => {
      const resultado = classificarTipoAtuacao({
        nome: 'HUGHES NETWORK SYSTEMS BRASIL LTDA.',
        grupoEconomico: 'Hughes Communications',
        municipiosAtendidos: 91,
        acessosTotais: 5223,
        tecnologiasPrincipais: ['Satélite'],
      });
      expect(resultado).toBe('PROVEDOR');
    });

    it('classifica Starlink como PROVEDOR', () => {
      const resultado = classificarTipoAtuacao({
        nome: 'STARLINK BRAZIL SERVIÇOS DE INTERNET LTDA.',
        grupoEconomico: 'SpaceX',
        municipiosAtendidos: 92,
        acessosTotais: 28164,
        tecnologiasPrincipais: ['Satélite'],
      });
      expect(resultado).toBe('PROVEDOR');
    });
  });

  // Heurísticas por cobertura
  describe('Classificação por heurísticas de cobertura', () => {
    it('classifica independente com 70+ municípios como AMBOS', () => {
      const resultado = classificarTipoAtuacao({
        nome: 'EMPRESA GRANDE FICTICIA',
        grupoEconomico: 'Independente',
        municipiosAtendidos: 75,
        acessosTotais: 100000,
        tecnologiasPrincipais: ['Fibra', 'ADSL'],
      });
      expect(resultado).toBe('AMBOS');
    });

    it('classifica independente com 50-69 municípios como PROVEDOR', () => {
      const resultado = classificarTipoAtuacao({
        nome: 'EMPRESA MEDIA FICTICIA',
        grupoEconomico: 'Independente',
        municipiosAtendidos: 55,
        acessosTotais: 50000,
        tecnologiasPrincipais: ['Fibra'],
      });
      expect(resultado).toBe('PROVEDOR');
    });

    it('classifica independente com <50 municípios como PROVEDOR', () => {
      const resultado = classificarTipoAtuacao({
        nome: 'EMPRESA PEQUENA FICTICIA',
        grupoEconomico: 'Independente',
        municipiosAtendidos: 20,
        acessosTotais: 10000,
        tecnologiasPrincipais: ['Fibra'],
      });
      expect(resultado).toBe('PROVEDOR');
    });
  });

  // Sem dados
  describe('Classificação com dados insuficientes (INDEFINIDO)', () => {
    it('retorna INDEFINIDO quando não há match', () => {
      const resultado = classificarTipoAtuacao({
        nome: 'EMPRESA DESCONHECIDA LTDA.',
        grupoEconomico: null,
        municipiosAtendidos: 0,
        acessosTotais: 0,
        tecnologiasPrincipais: [],
      });
      expect(resultado).toBe('INDEFINIDO');
    });
  });
});

describe('classificarEmpresas', () => {
  it('classifica múltiplas empresas', () => {
    const empresas = [
      {
        id: 'claro-1',
        nome: 'CLARO S.A.',
        grupoEconomico: 'América Móvil',
      },
      {
        id: 'giga-mais-1',
        nome: 'GIGA MAIS FIBRA LTDA.',
        grupoEconomico: 'Independente',
      },
    ];

    const metadados = new Map([
      ['claro-1', { municipiosAtendidos: 92, acessosTotais: 1000000, tecnologias: ['Fibra'] }],
      ['giga-mais-1', { municipiosAtendidos: 59, acessosTotais: 300000, tecnologias: ['Fibra'] }],
    ]);

    const resultado = classificarEmpresas(empresas, metadados);

    expect(resultado.get('claro-1')).toBe('AMBOS');
    expect(resultado.get('giga-mais-1')).toBe('PROVEDOR');
  });

  it('trata empresa sem metadados como INDEFINIDO', () => {
    const empresas = [
      {
        id: 'desconhecida-1',
        nome: 'EMPRESA DESCONHECIDA',
        grupoEconomico: null,
      },
    ];

    const metadados = new Map(); // Vazio

    const resultado = classificarEmpresas(empresas, metadados);

    expect(resultado.get('desconhecida-1')).toBe('INDEFINIDO');
  });
});
