import { describe, expect, it } from 'vitest';
import {
  filtrarBandaLargaFixa,
  interpretarInventario,
} from '../sources/inventario-anatel.js';

const csv = (texto: string) => Buffer.from(texto, 'utf8');

describe('interpretarInventario', () => {
  it('detecta o delimitador ponto-e-virgula', () => {
    const { cabecalho } = interpretarInventario(
      csv('Nome;Descricao;Link\nBase A;texto;https://x/a.zip'),
    );
    expect(cabecalho).toEqual(['Nome', 'Descricao', 'Link']);
  });

  it('detecta o delimitador virgula', () => {
    const { cabecalho } = interpretarInventario(
      csv('Nome,Descricao,Link\nBase A,texto,https://x/a.zip'),
    );
    expect(cabecalho).toEqual(['Nome', 'Descricao', 'Link']);
  });

  it('extrai URLs processaveis de qualquer coluna', () => {
    const { linhas } = interpretarInventario(
      csv('A;B;C\nqualquer;https://x/dados.zip;https://x/outro.csv'),
    );
    expect(linhas[0]!.urls).toEqual(['https://x/dados.zip', 'https://x/outro.csv']);
  });

  it('ignora URLs de formatos que o pipeline nao processa', () => {
    const { linhas } = interpretarInventario(
      csv('A;B\nBase;https://x/manual.pdf'),
    );
    expect(linhas[0]!.urls).toEqual([]);
  });

  it('decodifica latin1 quando o arquivo nao e UTF-8 valido', () => {
    const latin1 = Buffer.concat([
      Buffer.from('Nome;Link\n', 'utf8'),
      Buffer.from([0x53, 0x65, 0x72, 0x76, 0x69, 0xe7, 0x6f]), // "Serviço"
      Buffer.from(';https://x/a.zip', 'utf8'),
    ]);
    const { linhas } = interpretarInventario(latin1);
    expect(linhas[0]!.celulas[0]).toBe('Serviço');
  });
});

describe('filtrarBandaLargaFixa', () => {
  const inventario = (texto: string) =>
    filtrarBandaLargaFixa(interpretarInventario(csv(texto)).linhas);

  it('encontra a base de acessos de banda larga fixa', () => {
    const r = inventario(
      'Nome;Link\n' +
        'Acessos - Banda Larga Fixa;https://x/acessos_2026.zip\n' +
        'Reclamacoes;https://x/reclamacoes.zip\n',
    );
    expect(r).toHaveLength(1);
    expect(r[0]!.urls[0]).toBe('https://x/acessos_2026.zip');
  });

  it('aceita a nomenclatura por SCM', () => {
    const r = inventario('Nome;Link\nAcessos SCM;https://x/scm.zip\n');
    expect(r).toHaveLength(1);
  });

  it('ignora acentuacao e caixa na comparacao', () => {
    const r = inventario('Nome;Link\nacessos — banda larga fixa;https://x/a.zip\n');
    expect(r).toHaveLength(1);
  });

  it('descarta linha sem URL processavel', () => {
    const r = inventario('Nome;Link\nAcessos Banda Larga Fixa;consultar no portal\n');
    expect(r).toHaveLength(0);
  });

  it('nao confunde com bases de outro servico', () => {
    const r = inventario(
      'Nome;Link\nAcessos - Telefonia Movel Pessoal;https://x/movel.zip\n',
    );
    expect(r).toHaveLength(0);
  });
});
