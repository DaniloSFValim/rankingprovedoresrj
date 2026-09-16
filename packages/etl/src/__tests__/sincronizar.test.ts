import { describe, expect, it } from 'vitest';
import { selecionarRecursos } from '../pipeline/sincronizar.js';
import type { RecursoCandidato } from '../sources/descoberta.js';

const recurso = (
  nome: string,
  formato = 'ZIP',
  url = `https://exemplo/${nome}`,
): RecursoCandidato => ({
  catalogo: 'teste',
  conjunto: 'Acessos Banda Larga Fixa',
  conjuntoUrl: 'https://exemplo',
  nome,
  formato,
  url,
  bytes: null,
  atualizadoEm: null,
});

describe('selecionarRecursos', () => {
  it('seleciona apenas os anos dentro da janela pedida', () => {
    const { selecionados } = selecionarRecursos(
      [
        recurso('Acessos_2026.zip'),
        recurso('Acessos_2025.zip'),
        recurso('Acessos_2024.zip'),
        recurso('Acessos_2019.zip'),
      ],
      { anos: 2, anoAtual: 2026 },
    );
    expect(selecionados.map((r) => r.nome)).toEqual([
      'Acessos_2025.zip',
      'Acessos_2026.zip',
    ]);
  });

  it('importa em ordem cronologica para os alertas compararem o mes correto', () => {
    const { selecionados } = selecionarRecursos(
      [recurso('Acessos_2026.zip'), recurso('Acessos_2024.zip'), recurso('Acessos_2025.zip')],
      { anos: 3, anoAtual: 2026 },
    );
    expect(selecionados.map((r) => r.nome)).toEqual([
      'Acessos_2024.zip',
      'Acessos_2025.zip',
      'Acessos_2026.zip',
    ]);
  });

  it('prefere ZIP quando ha ZIP e CSV do mesmo ano', () => {
    const { selecionados } = selecionarRecursos(
      [recurso('Acessos_2026.csv', 'CSV'), recurso('Acessos_2026.zip', 'ZIP')],
      { anos: 1, anoAtual: 2026 },
    );
    expect(selecionados).toHaveLength(1);
    expect(selecionados[0]!.formato).toBe('ZIP');
  });

  it('descarta recurso sem ano identificavel em vez de chutar o ano corrente', () => {
    const { selecionados, descartados } = selecionarRecursos(
      [recurso('dicionario_de_dados.csv', 'CSV')],
      { anos: 2, anoAtual: 2026 },
    );
    expect(selecionados).toHaveLength(0);
    expect(descartados).toHaveLength(1);
  });

  it('nao seleciona dois recursos para o mesmo ano', () => {
    const { selecionados } = selecionarRecursos(
      [recurso('Acessos_2026_parte1.zip'), recurso('Acessos_2026_parte2.zip')],
      { anos: 1, anoAtual: 2026 },
    );
    expect(selecionados).toHaveLength(1);
  });

  it('ignora ano absurdamente futuro', () => {
    const { selecionados } = selecionarRecursos(
      [recurso('Acessos_2099.zip')],
      { anos: 2, anoAtual: 2026 },
    );
    expect(selecionados).toHaveLength(0);
  });
});
