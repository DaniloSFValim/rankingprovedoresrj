import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TabelaRanking } from '../TabelaRanking';
import type { LinhaRankingEstadual } from '@/lib/dados';

const mockLinhas: LinhaRankingEstadual[] = [
  {
    empresaId: '1',
    posicao: 1,
    nome: 'Provedor A',
    slug: 'provedor-a',
    cnpj: '12345678901234',
    grupoEconomico: 'Grupo A',
    tipoAtuacao: 'PROVEDOR',
    acessos: 1000,
    marketShare: 0.45,
    municipiosAtendidos: 50,
    variacaoPosicao: null,
    posicaoAnterior: 1,
    variacaoAbsoluta: 50,
    variacaoPercentual: 0.05,
    variacao12Absoluta: 200,
    variacao12Percentual: 0.25,
  },
  {
    empresaId: '2',
    posicao: 2,
    nome: 'Provedor B',
    slug: 'provedor-b',
    cnpj: null,
    grupoEconomico: null,
    tipoAtuacao: 'OPERADORA',
    acessos: 800,
    marketShare: 0.35,
    municipiosAtendidos: 40,
    variacaoPosicao: 1,
    posicaoAnterior: 3,
    variacaoAbsoluta: -30,
    variacaoPercentual: -0.04,
    variacao12Absoluta: 150,
    variacao12Percentual: 0.23,
  },
];

describe('TabelaRanking', () => {
  it('renders table with data', () => {
    render(<TabelaRanking linhas={mockLinhas} />);
    expect(screen.getByText('Provedor A')).toBeInTheDocument();
    expect(screen.getByText('Provedor B')).toBeInTheDocument();
  });

  it('respects limite prop', () => {
    render(<TabelaRanking linhas={mockLinhas} limite={1} />);
    expect(screen.getByText('Provedor A')).toBeInTheDocument();
    expect(screen.queryByText('Provedor B')).not.toBeInTheDocument();
  });

  it('displays position variation badge', () => {
    render(<TabelaRanking linhas={mockLinhas} />);
    expect(
      screen.getByLabelText(/Variação de posição: subiu 1 posição/)
    ).toBeInTheDocument();
  });

  it('displays "NOVO" badge when posicaoAnterior is null', () => {
    const novaLinhas: LinhaRankingEstadual[] = [
      { ...mockLinhas[0], posicaoAnterior: null },
    ];
    render(<TabelaRanking linhas={novaLinhas} />);
    expect(
      screen.getByLabelText('Provedor novo nesta competência')
    ).toBeInTheDocument();
  });

  it('hides municípios column when ocultarMunicipios is true', () => {
    const { container } = render(
      <TabelaRanking linhas={mockLinhas} ocultarMunicipios={true} />
    );
    const ths = container.querySelectorAll('th');
    const hasMunicipiosHeader = Array.from(ths).some((th) =>
      th.textContent?.includes('Municípios')
    );
    expect(hasMunicipiosHeader).toBe(false);
  });

  it('mostra o CNPJ apenas quando o nome se repete', () => {
    const homonimas: LinhaRankingEstadual[] = [
      { ...mockLinhas[0]!, empresaId: 'a', slug: 'claro-2', nome: 'CLARO', cnpj: '66970229000167' },
      { ...mockLinhas[0]!, empresaId: 'b', slug: 'claro', nome: 'Claro', cnpj: '40432544000147', posicao: 2 },
      { ...mockLinhas[0]!, empresaId: 'c', slug: 'tim', nome: 'TIM', cnpj: '02421421000111', posicao: 3 },
    ];
    render(<TabelaRanking linhas={homonimas} />);
    expect(screen.getByText('CNPJ 66.970.229/0001-67')).toBeInTheDocument();
    expect(screen.getByText('CNPJ 40.432.544/0001-47')).toBeInTheDocument();
    expect(screen.queryByText(/02\.421\.421/)).not.toBeInTheDocument();
  });
});
