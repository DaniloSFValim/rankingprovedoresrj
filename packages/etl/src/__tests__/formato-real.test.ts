/**
 * Testes derivados do formato REAL do arquivo da Anatel, observado na primeira
 * execucao de producao. Cada caso aqui corresponde a um defeito que chegou a
 * acontecer — nao a uma hipotese.
 */
import { describe, expect, it } from 'vitest';
import {
  arquivoDentroDaJanela,
  ehArquivoIgnorado,
  ehCabecalhoDeOutroConjunto,
  faixaDeAnos,
  mapearCabecalho,
} from '../sources/anatel.js';
import { extrairRjDeTexto } from '../pipeline/extrair.js';
import { abrirBancoMemoria } from '../warehouse/db.js';
import {
  aplicarJanelaConsecutiva,
  carregar,
  competenciasArmazenadas,
  concluirExecucao,
  iniciarExecucao,
  purgarDadosDemonstrativos,
  registrarFonte,
} from '../pipeline/carregar.js';
import { detectarLacunas } from '../pipeline/qualidade.js';
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

describe('outros conjuntos de dados no mesmo pacote', () => {
  // Cabecalhos reais que derrubaram importacoes de 21 milhoes de linhas.
  const TOTAL_NACIONAL = ['Ano', 'Mês', 'Acessos'];
  const DENSIDADE = [
    'Ano', 'Mês', 'UF', 'Município', 'Código IBGE', 'Densidade',
    'Nível Geográfico Densidade',
  ];

  it('reconhece o total nacional: nao identifica prestadora', () => {
    expect(ehCabecalhoDeOutroConjunto(TOTAL_NACIONAL)).toBe(true);
  });

  it('reconhece a densidade: tem territorio, mas nenhuma prestadora', () => {
    expect(ehCabecalhoDeOutroConjunto(DENSIDADE)).toBe(true);
  });

  it('nao confunde o arquivo granular com outro conjunto', () => {
    expect(ehCabecalhoDeOutroConjunto(CABECALHO_REAL.split(';'))).toBe(false);
  });

  it('basta CNPJ ou grupo economico para o arquivo ser nosso', () => {
    expect(ehCabecalhoDeOutroConjunto(['Ano', 'Mês', 'CNPJ', 'Acessos'])).toBe(false);
    expect(ehCabecalhoDeOutroConjunto(['Ano', 'Grupo Econômico', 'Acessos'])).toBe(false);
  });

  it('territorio sozinho NAO torna o arquivo nosso', () => {
    // Foi este o caso da densidade: UF e municipio presentes, prestadora nao.
    expect(ehCabecalhoDeOutroConjunto(['Ano', 'Mês', 'UF', 'Município', 'Densidade']))
      .toBe(true);
  });

  it('ignora sem abortar a importacao', async () => {
    const r = await extrairRjDeTexto(
      [TOTAL_NACIONAL.join(';'), '2026;8;45000000'].join('\n'),
    );
    expect(r.outroConjuntoIgnorado).toBe(true);
    expect(r.registros).toHaveLength(0);
  });

  it('arquivo NOSSO com colunas renomeadas continua abortando alto', async () => {
    // Tem prestadora, entao e nosso — e estar ilegivel precisa falhar, porque
    // seguir produziria ranking errado.
    await expect(
      extrairRjDeTexto(['UF;Empresa;Municipio', 'RJ;X;Niterói'].join('\n')),
    ).rejects.toThrow(/Cabecalho da Anatel incompativel/);
  });

  it('ignora densidade e total ja pelo nome, sem descompactar', () => {
    expect(ehArquivoIgnorado('Acessos_Banda_Larga_Fixa_Total.csv')).toBe(true);
    expect(ehArquivoIgnorado('Densidade_Banda_Larga_Fixa.csv')).toBe(true);
    expect(ehArquivoIgnorado('Acessos_Banda_Larga_Fixa_2026.csv')).toBe(false);
  });
});

describe('deteccao de lacunas na serie', () => {
  const extracaoMes = (competencia: string) => ({
    registros: [{
      competencia, codigoIbge: '3303302', empresaId: 'nome:X',
      tecnologia: 'FIBRA' as const, acessos: 100,
    }],
    empresas: new Map([['nome:X', {
      empresaId: 'nome:X', chaveNome: 'X', nomeOriginalAnatel: 'X',
      cnpj: null, grupoEconomico: null, origem: 'NOME_CANONICO' as const,
    }]]),
    municipios: new Map([['3303302', { codigoIbge: '3303302', nome: 'Niterói' }]]),
    competencias: new Set([competencia]),
    tecnologiasNaoMapeadas: new Map(),
    estatisticas: { linhasLidas: 1, linhasRj: 1, linhasRejeitadas: 0, motivosRejeicao: {} },
  });

  const comMeses = (meses: string[]) => {
    const db = abrirBancoMemoria();
    const fonteId = registrarFonte(db, {
      nome: 'Anatel', url: 'x', arquivo: 'a', hashSha256: null, bytes: null,
      coletadoEm: '2026-01-01T00:00:00Z', dadosDemonstrativos: false,
    });
    const execucaoId = iniciarExecucao(db, fonteId);
    for (const m of meses) carregar(db, extracaoMes(m), execucaoId);
    return db;
  };

  it('nao acusa lacuna em serie contigua', () => {
    const db = comMeses(['2026-01', '2026-02', '2026-03']);
    expect(detectarLacunas(db)).toEqual([]);
    db.close();
  });

  it('encontra o buraco no meio da serie', () => {
    const db = comMeses(['2026-01', '2026-04']);
    expect(detectarLacunas(db)).toEqual(['2026-02', '2026-03']);
    db.close();
  });

  it('reproduz o caso real: um ano inteiro ausente', () => {
    const db = comMeses(['2022-12', '2024-01']);
    const lacunas = detectarLacunas(db);
    expect(lacunas).toHaveLength(12);
    expect(lacunas[0]).toBe('2023-01');
    expect(lacunas[11]).toBe('2023-12');
    db.close();
  });

  it('nao considera lacuna o que esta fora do intervalo carregado', () => {
    const db = comMeses(['2026-06', '2026-07']);
    expect(detectarLacunas(db)).toEqual([]);
    db.close();
  });
});

describe('janela de 50 meses consecutivos', () => {
  const meses = (inicio: string, quantidade: number) =>
    Array.from({ length: quantidade }, (_, i) => {
      const [a, m] = inicio.split('-').map(Number);
      const total = a! * 12 + (m! - 1) + i;
      return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`;
    });

  const comMeses = (lista: string[]) => {
    const db = abrirBancoMemoria();
    const fonteId = registrarFonte(db, {
      nome: 'Anatel', url: 'x', arquivo: 'a', hashSha256: null, bytes: null,
      coletadoEm: '2026-01-01T00:00:00Z', dadosDemonstrativos: false,
    });
    const execucaoId = iniciarExecucao(db, fonteId);
    for (const m of lista) {
      carregar(db, {
        registros: [{
          competencia: m, codigoIbge: '3303302', empresaId: 'nome:X',
          tecnologia: 'FIBRA' as const, acessos: 100,
        }],
        empresas: new Map([['nome:X', {
          empresaId: 'nome:X', chaveNome: 'X', nomeOriginalAnatel: 'X',
          cnpj: null, grupoEconomico: null, origem: 'NOME_CANONICO' as const,
        }]]),
        municipios: new Map([['3303302', { codigoIbge: '3303302', nome: 'Niterói' }]]),
        competencias: new Set([m]),
        tecnologiasNaoMapeadas: new Map(),
        estatisticas: { linhasLidas: 1, linhasRj: 1, linhasRejeitadas: 0, motivosRejeicao: {} },
      }, execucaoId);
    }
    return db;
  };

  it('mantem exatamente 50 meses quando ha mais que isso', () => {
    const db = comMeses(meses('2020-01', 80));
    const j = aplicarJanelaConsecutiva(db);
    expect(j.meses).toBe(50);
    expect(j.truncadaPorLacuna).toBe(false);
    expect(competenciasArmazenadas(db)).toHaveLength(50);
    db.close();
  });

  it('mantem tudo quando ha menos de 50 meses', () => {
    const db = comMeses(meses('2025-01', 12));
    const j = aplicarJanelaConsecutiva(db);
    expect(j.meses).toBe(12);
    expect(j.removidos).toBe(0);
    db.close();
  });

  it('para na lacuna: prefere serie curta e integra a serie longa com buraco', () => {
    // Caso real: 2022 presente, 2023 inteiro ausente, 2024 em diante presente.
    const db = comMeses([...meses('2022-01', 12), ...meses('2024-01', 31)]);
    const j = aplicarJanelaConsecutiva(db);

    expect(j.truncadaPorLacuna).toBe(true);
    expect(j.inicio).toBe('2024-01');
    expect(j.meses).toBe(31);
    // As doze competencias de 2022 saem: estavam do outro lado do buraco.
    expect(competenciasArmazenadas(db)).toHaveLength(31);
    db.close();
  });

  it('conta a partir da ultima competencia disponivel, nao do mes corrente', () => {
    // A Anatel publica com defasagem; exigir o mes atual esvaziaria a base.
    const db = comMeses(meses('2024-01', 10));
    const j = aplicarJanelaConsecutiva(db);
    expect(j.fim).toBe('2024-10');
    expect(j.meses).toBe(10);
    db.close();
  });

  it('nao deixa lacuna na janela resultante', () => {
    const db = comMeses([...meses('2022-01', 12), ...meses('2024-01', 31)]);
    aplicarJanelaConsecutiva(db);
    expect(detectarLacunas(db)).toEqual([]);
    db.close();
  });
});
