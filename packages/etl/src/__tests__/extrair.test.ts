import { describe, expect, it } from 'vitest';
import { extrairRjDeTexto } from '../pipeline/extrair.js';
import { CabecalhoIncompativelError, mapearCabecalho } from '../sources/anatel.js';

const CABECALHO =
  'Ano;Mês;Grupo Econômico;Empresa;CNPJ;UF;Município;Código IBGE;Tecnologia;Acessos';

const csv = (...linhas: string[]) => [CABECALHO, ...linhas].join('\n');

describe('mapearCabecalho', () => {
  it('resolve colunas acentuadas e com grafias alternativas', () => {
    const mapa = mapearCabecalho(CABECALHO.split(';'));
    expect(mapa.codigoIbge).toBe('Código IBGE');
    expect(mapa.mes).toBe('Mês');
    expect(mapa.acessos).toBe('Acessos');
  });

  it('aceita sinonimos de outra safra', () => {
    const mapa = mapearCabecalho(
      ['ANO', 'MES_REFERENCIA', 'SIGLA_UF', 'PRESTADORA', 'QTDE_ACESSOS', 'CO_MUNICIPIO'],
    );
    expect(mapa.empresa).toBe('PRESTADORA');
    expect(mapa.codigoIbge).toBe('CO_MUNICIPIO');
  });

  it('aborta com erro explicito quando falta campo obrigatorio', () => {
    expect(() => mapearCabecalho(['Ano', 'Mês', 'UF', 'Empresa']))
      .toThrow(CabecalhoIncompativelError);
  });
});

describe('extrairRj', () => {
  it('descarta linhas de outras UFs antes de qualquer processamento', async () => {
    const r = await extrairRjDeTexto(
      csv(
        '2026;8;Grupo A;Alfa Telecom LTDA;12345678000195;RJ;Niterói;3303302;Fibra;1000',
        '2026;8;Grupo B;Beta SP;98765432000110;SP;São Paulo;3550308;Fibra;9999999',
      ),
    );
    expect(r.estatisticas.linhasLidas).toBe(2);
    expect(r.estatisticas.linhasRj).toBe(1);
    expect(r.registros).toHaveLength(1);
    expect(r.registros[0]!.acessos).toBe(1000);
  });

  it('agrega linhas mais granulares que o fato do NETRANK', async () => {
    // Mesma empresa/municipio/tecnologia em faixas de velocidade diferentes.
    const r = await extrairRjDeTexto(
      csv(
        '2026;8;Grupo A;Alfa Telecom LTDA;12345678000195;RJ;Niterói;3303302;Fibra;600',
        '2026;8;Grupo A;Alfa Telecom LTDA;12345678000195;RJ;Niterói;3303302;Fibra;400',
      ),
    );
    expect(r.registros).toHaveLength(1);
    expect(r.registros[0]!.acessos).toBe(1000);
  });

  it('unifica grafias distintas da mesma empresa pela raiz do CNPJ', async () => {
    const r = await extrairRjDeTexto(
      csv(
        '2026;8;Grupo A;ALFA TELECOM LTDA;12345678000195;RJ;Niterói;3303302;Fibra;600',
        '2026;8;Grupo A;Alfa Telecom;12345678000276;RJ;Niterói;3303302;Fibra;400',
      ),
    );
    expect(r.empresas.size).toBe(1);
    expect(r.registros).toHaveLength(1);
    expect(r.registros[0]!.acessos).toBe(1000);
  });

  it('separa tecnologias distintas no mesmo municipio', async () => {
    const r = await extrairRjDeTexto(
      csv(
        '2026;8;Grupo A;Alfa Telecom LTDA;12345678000195;RJ;Niterói;3303302;Fibra;600',
        '2026;8;Grupo A;Alfa Telecom LTDA;12345678000195;RJ;Niterói;3303302;Cable Modem;400',
      ),
    );
    expect(r.registros).toHaveLength(2);
    expect(r.registros.map((x) => x.tecnologia).sort()).toEqual(['CABO', 'FIBRA']);
  });

  it('rejeita registro sem codigo IBGE valido em vez de adivinhar o municipio', async () => {
    const r = await extrairRjDeTexto(
      csv('2026;8;Grupo A;Alfa Telecom LTDA;12345678000195;RJ;Ignorado;;Fibra;500'),
    );
    expect(r.registros).toHaveLength(0);
    expect(r.estatisticas.motivosRejeicao['codigo_ibge_invalido']).toBe(1);
  });

  it('rejeita acessos nao numericos em vez de converter para zero', async () => {
    const r = await extrairRjDeTexto(
      csv('2026;8;Grupo A;Alfa Telecom LTDA;12345678000195;RJ;Niterói;3303302;Fibra;n/d'),
    );
    expect(r.registros).toHaveLength(0);
    expect(r.estatisticas.motivosRejeicao['acessos_nao_numerico']).toBe(1);
  });

  it('interpreta separador de milhar da fonte', async () => {
    const r = await extrairRjDeTexto(
      csv('2026;8;Grupo A;Alfa Telecom LTDA;12345678000195;RJ;Niterói;3303302;Fibra;1.234'),
    );
    expect(r.registros[0]!.acessos).toBe(1234);
  });

  it('aceita mes por extenso', async () => {
    const r = await extrairRjDeTexto(
      csv('2026;Agosto;Grupo A;Alfa Telecom LTDA;12345678000195;RJ;Niterói;3303302;Fibra;10'),
    );
    expect(r.registros[0]!.competencia).toBe('2026-08');
  });

  it('registra tecnologias nao mapeadas para revisao', async () => {
    const r = await extrairRjDeTexto(
      csv('2026;8;Grupo A;Alfa Telecom LTDA;12345678000195;RJ;Niterói;3303302;PLC Rede Elétrica;10'),
    );
    expect(r.registros[0]!.tecnologia).toBe('OUTRAS');
    expect(r.tecnologiasNaoMapeadas.get('PLC Rede Elétrica')).toBe(1);
  });

  it('coleta municipios e competencias observados', async () => {
    const r = await extrairRjDeTexto(
      csv(
        '2026;7;Grupo A;Alfa Telecom LTDA;12345678000195;RJ;Niterói;3303302;Fibra;10',
        '2026;8;Grupo A;Alfa Telecom LTDA;12345678000195;RJ;Niterói;3303302;Fibra;12',
        '2026;8;Grupo A;Alfa Telecom LTDA;12345678000195;RJ;Rio de Janeiro;3304557;Fibra;50',
      ),
    );
    expect([...r.competencias].sort()).toEqual(['2026-07', '2026-08']);
    expect(r.municipios.get('3304557')!.nome).toBe('Rio de Janeiro');
  });
});

describe('perfil de acessos (tipo de pessoa e velocidade)', () => {
  const CABECALHO_2026 =
    'Ano;Mês;Grupo Econômico;Empresa;CNPJ;Porte da Prestadora;UF;Município;Código IBGE Município;' +
    'Faixa de Velocidade;Velocidade;Tecnologia;Meio de Acesso;Tipo de Pessoa;Tipo de Produto;Acessos';

  it('soma pessoa fisica e distribui acessos por faixa de velocidade contratada', async () => {
    const csv = [
      CABECALHO_2026,
      '2026;7;OUTROS;PROV A;11111111000111;Pequeno Porte;RJ;Niterói;3303302;> 34Mbps;500,000000;FTTH;Fibra;Pessoa Física;INTERNET;10',
      '2026;7;OUTROS;PROV A;11111111000111;Pequeno Porte;RJ;Niterói;3303302;> 34Mbps;1048,000000;FTTH;Fibra;Pessoa Jurídica;INTERNET;2',
      '2026;7;OUTROS;PROV A;11111111000111;Pequeno Porte;RJ;Niterói;3303302;2Mbps a 12Mbps;4,000000;xDSL;Cabo Metálico;Pessoa Física;INTERNET;3',
      '2026;7;OUTROS;PROV A;11111111000111;Pequeno Porte;RJ;Niterói;3303302;2Mbps a 12Mbps;;xDSL;Cabo Metálico;Pessoa Física;INTERNET;1',
      '2026;7;OUTROS;PROV A;11111111000111;Pequeno Porte;SP;Santos;3548500;> 34Mbps;500,000000;FTTH;Fibra;Pessoa Física;INTERNET;99',
    ].join('\n');
    const r = await extrairRjDeTexto(csv);
    expect(r.perfis).toHaveLength(1);
    const p = r.perfis[0]!;
    expect(p.pessoaFisica).toBe(14);
    expect(p.velocidade.de500a1000).toBe(10);
    expect(p.velocidade.acima1000).toBe(2);
    expect(p.velocidade.ate10).toBe(3);
    expect(p.velocidadeNaoInformada).toBe(1);
    const totalAcessos = r.registros.reduce((s, x) => s + x.acessos, 0);
    const totalPerfil =
      Object.values(p.velocidade).reduce((s, n) => s + n, 0) + p.velocidadeNaoInformada;
    expect(totalPerfil).toBe(totalAcessos);
  });

  it('sem as colunas de velocidade e tipo de pessoa, nao gera perfil', async () => {
    const csv = [
      'Ano;Mês;Grupo Econômico;Empresa;CNPJ;Porte da Prestadora;UF;Município;Código IBGE Município;Faixa de Velocidade;Tecnologia;Meio de Acesso;Acessos',
      '2020;12;OUTROS;PROV A;11111111000111;Pequeno Porte;RJ;Niterói;3303302;> 34Mbps;FTTH;Fibra;5',
    ].join('\n');
    const r = await extrairRjDeTexto(csv);
    expect(r.registros).toHaveLength(1);
    expect(r.perfis).toHaveLength(0);
  });
});
