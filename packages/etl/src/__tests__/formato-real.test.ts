/**
 * Testes derivados do formato REAL do arquivo da Anatel, observado na primeira
 * execucao de producao. Cada caso aqui corresponde a um defeito que chegou a
 * acontecer — nao a uma hipotese.
 */
import { describe, expect, it } from 'vitest';
import {
  arquivoDentroDaJanela,
  ehArquivoIgnorado,
  ehCabecalhoAgregado,
  faixaDeAnos,
  mapearCabecalho,
} from '../sources/anatel.js';
import { extrairRjDeTexto } from '../pipeline/extrair.js';
import { abrirBancoMemoria } from '../warehouse/db.js';
import {
  carregar,
  competenciasArmazenadas,
  concluirExecucao,
  iniciarExecucao,
  purgarDadosDemonstrativos,
  registrarFonte,
} from '../pipeline/carregar.js';
import type { ResultadoExtracao } from '../pipeline/extrair.js';

// Cabecalho exatamente como veio do arquivo de producao.
const CABECALHO_REAL =
  'Ano;Mês;CNPJ;Município;UF;Faixa de Velocidade;Tecnologia;Empresa;' +
  'Porte da Prestadora;Código IBGE Município;Grupo Econômico;Meio de Acesso;Acessos';

describe('cabecalho real da Anatel', () => {
  it('resolve "Código IBGE Município" — a coluna que rejeitava 100% das linhas', () => {
    const mapa = mapearCabecalho(CABECALHO_REAL.split(';'));
    expect(mapa.codigoIbge).toBe('Código IBGE Município');
  });

  it('resolve todos os campos obrigatorios do arquivo de producao', () => {
    const mapa = mapearCabecalho(CABECALHO_REAL.split(';'));
    expect(mapa.ano).toBe('Ano');
    expect(mapa.mes).toBe('Mês');
    expect(mapa.acessos).toBe('Acessos');
    expect(mapa.empresa).toBe('Empresa');
    expect(mapa.uf).toBe('UF');
    expect(mapa.grupoEconomico).toBe('Grupo Econômico');
  });

  it('importa uma linha no formato real de ponta a ponta', async () => {
    const r = await extrairRjDeTexto(
      [
        CABECALHO_REAL,
        '2026;8;12345678000195;Niterói;RJ;Acima de 34 Mbps;Fibra;ALFA TELECOM LTDA;' +
          'Grande Porte;3303302;Grupo Alfa;Fibra;1500',
      ].join('\n'),
    );
    expect(r.estatisticas.linhasRejeitadas).toBe(0);
    expect(r.registros).toHaveLength(1);
    expect(r.registros[0]).toMatchObject({
      competencia: '2026-08', codigoIbge: '3303302', tecnologia: 'FIBRA', acessos: 1500,
    });
  });

  it('expoe o mapeamento resolvido para conferencia', async () => {
    const r = await extrairRjDeTexto(
      [CABECALHO_REAL, '2026;8;1;Niterói;RJ;x;Fibra;A;P;3303302;G;Fibra;1'].join('\n'),
    );
    expect(r.mapaColunas?.codigoIbge).toBe('Código IBGE Município');
  });
});

describe('arquivos ignorados dentro do pacote', () => {
  it('ignora a versao em formato largo, que duplicaria todos os acessos', () => {
    expect(ehArquivoIgnorado('Acessos_Banda_Larga_Fixa_2007-2010_Colunas.csv')).toBe(true);
    expect(ehArquivoIgnorado('/tmp/x/Acessos_Banda_Larga_Fixa_2023-2026_Colunas.csv')).toBe(true);
  });

  it('mantem a versao em formato longo', () => {
    expect(ehArquivoIgnorado('Acessos_Banda_Larga_Fixa_2007-2010.csv')).toBe(false);
    expect(ehArquivoIgnorado('Acessos_Banda_Larga_Fixa_2023-2026.csv')).toBe(false);
  });

  it('ignora dicionario de dados e leia-me', () => {
    expect(ehArquivoIgnorado('Dicionario_de_Dados.csv')).toBe(true);
    expect(ehArquivoIgnorado('LEIA-ME.txt')).toBe(true);
  });

  it('nao descarta os dados por conterem a palavra acessos', () => {
    expect(ehArquivoIgnorado('Acessos_Banda_Larga_Fixa_2011-2014.csv')).toBe(false);
  });
});

describe('purgarDadosDemonstrativos', () => {
  const extracaoFalsa = (competencia: string, acessos: number): ResultadoExtracao => ({
    registros: [
      { competencia, codigoIbge: '3303302', empresaId: 'nome:X', tecnologia: 'FIBRA', acessos },
    ],
    empresas: new Map([
      ['nome:X', {
        empresaId: 'nome:X', chaveNome: 'X', nomeOriginalAnatel: 'X',
        cnpj: null, grupoEconomico: null, origem: 'NOME_CANONICO' as const,
      }],
    ]),
    municipios: new Map([['3303302', { codigoIbge: '3303302', nome: 'Niterói' }]]),
    competencias: new Set([competencia]),
    tecnologiasNaoMapeadas: new Map(),
    estatisticas: { linhasLidas: 1, linhasRj: 1, linhasRejeitadas: 0, motivosRejeicao: {} },
  });

  const importar = (db: ReturnType<typeof abrirBancoMemoria>, competencia: string, demo: boolean) => {
    const fonteId = registrarFonte(db, {
      nome: demo ? 'DEMO' : 'Anatel', url: 'x', arquivo: `${competencia}-${demo}`,
      hashSha256: null, bytes: null, coletadoEm: '2026-01-01T00:00:00Z',
      dadosDemonstrativos: demo,
    });
    const execucaoId = iniciarExecucao(db, fonteId);
    carregar(db, extracaoFalsa(competencia, demo ? 999 : 100), execucaoId);
    concluirExecucao(db, execucaoId, 'SUCESSO',
      { linhasLidas: 1, linhasRj: 1, linhasRejeitadas: 0, motivosRejeicao: {} });
  };

  it('remove competencias que so a fixture cobria', () => {
    const db = abrirBancoMemoria();
    importar(db, '2026-01', true);
    importar(db, '2026-02', true);
    expect(competenciasArmazenadas(db)).toEqual(['2026-01', '2026-02']);

    expect(purgarDadosDemonstrativos(db)).toBe(2);
    expect(competenciasArmazenadas(db)).toEqual([]);
    // Empresas orfas tambem saem, sem violar integridade referencial.
    const empresas = db.prepare('SELECT COUNT(*) AS n FROM empresas').get() as { n: number };
    expect(empresas.n).toBe(0);
    db.close();
  });

  it('preserva os dados reais ja importados', () => {
    const db = abrirBancoMemoria();
    importar(db, '2026-01', true);
    importar(db, '2026-03', false);

    purgarDadosDemonstrativos(db);
    expect(competenciasArmazenadas(db)).toEqual(['2026-03']);
    const acessos = db
      .prepare('SELECT acessos FROM fato_acessos WHERE competencia = ?')
      .get('2026-03') as { acessos: number };
    expect(acessos.acessos).toBe(100);
    db.close();
  });

  it('e inofensivo quando nao ha dados demonstrativos', () => {
    const db = abrirBancoMemoria();
    importar(db, '2026-03', false);
    expect(purgarDadosDemonstrativos(db)).toBe(0);
    expect(competenciasArmazenadas(db)).toEqual(['2026-03']);
    db.close();
  });
});

describe('recorte por faixa de anos do nome do arquivo', () => {
  it('le a faixa do padrao real do pacote', () => {
    expect(faixaDeAnos('Acessos_Banda_Larga_Fixa_2007-2010.csv'))
      .toEqual({ inicio: 2007, fim: 2010 });
    expect(faixaDeAnos('Acessos_Banda_Larga_Fixa_2023-2026.csv'))
      .toEqual({ inicio: 2023, fim: 2026 });
  });

  it('aceita arquivo de ano unico', () => {
    expect(faixaDeAnos('Acessos_2026.csv')).toEqual({ inicio: 2026, fim: 2026 });
  });

  it('pula safras inteiramente anteriores a janela', () => {
    expect(arquivoDentroDaJanela('Acessos_Banda_Larga_Fixa_2007-2010.csv', 2023)).toBe(false);
    expect(arquivoDentroDaJanela('Acessos_Banda_Larga_Fixa_2019-2022.csv', 2023)).toBe(false);
  });

  it('mantem a safra que toca a janela, mesmo comecando antes', () => {
    expect(arquivoDentroDaJanela('Acessos_Banda_Larga_Fixa_2023-2026.csv', 2025)).toBe(true);
    expect(arquivoDentroDaJanela('Acessos_Banda_Larga_Fixa_2019-2022.csv', 2021)).toBe(true);
  });

  it('processa arquivo sem faixa identificavel — pular perderia dado em silencio', () => {
    expect(faixaDeAnos('acessos_banda_larga_fixa.csv')).toBeNull();
    expect(arquivoDentroDaJanela('acessos_banda_larga_fixa.csv', 2025)).toBe(true);
  });
});

describe('arquivo de totais agregados', () => {
  // Cabecalho real do Acessos_Banda_Larga_Fixa_Total.csv, que derrubou uma
  // importacao de 21 milhoes de linhas ja bem-sucedida.
  const CABECALHO_TOTAL = ['Ano', 'Mês', 'Acessos'];

  it('reconhece o agregado pelo nome do arquivo', () => {
    expect(ehArquivoIgnorado('Acessos_Banda_Larga_Fixa_Total.csv')).toBe(true);
  });

  it('reconhece o agregado pelo cabecalho, mesmo com outro nome', () => {
    expect(ehCabecalhoAgregado(CABECALHO_TOTAL)).toBe(true);
  });

  it('nao confunde arquivo granular com agregado', () => {
    expect(ehCabecalhoAgregado(CABECALHO_REAL.split(';'))).toBe(false);
  });

  it('basta um identificador de territorio para nao ser agregado', () => {
    expect(ehCabecalhoAgregado(['Ano', 'Mês', 'UF', 'Acessos'])).toBe(false);
  });

  it('basta um identificador de prestadora para nao ser agregado', () => {
    expect(ehCabecalhoAgregado(['Ano', 'Mês', 'Empresa', 'Acessos'])).toBe(false);
  });

  it('ignora o agregado sem abortar a importacao', async () => {
    const r = await extrairRjDeTexto(
      [CABECALHO_TOTAL.join(';'), '2026;8;45000000'].join('\n'),
    );
    expect(r.agregadoIgnorado).toBe(true);
    expect(r.registros).toHaveLength(0);
  });

  it('cabecalho desconhecido COM identificador continua abortando', async () => {
    // Uma safra com colunas renomeadas deve falhar alto, nao ser ignorada.
    await expect(
      extrairRjDeTexto(['UF;Empresa;Municipio', 'RJ;X;Niterói'].join('\n')),
    ).rejects.toThrow(/Cabecalho da Anatel incompativel/);
  });
});
