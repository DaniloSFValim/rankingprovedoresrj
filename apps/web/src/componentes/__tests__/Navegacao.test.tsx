import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Navegacao } from '../Navegacao';
import type { Meta } from '@/lib/dados';
import type { CidadeOpcao } from '@/componentes/SeletorCidade';

vi.mock('@/componentes/SeletorCidade', () => ({
  SeletorCidadeNav: () => <div>Seletor de Cidade</div>,
}));

vi.mock('@/componentes/BuscaAvancada', () => ({
  BuscaAvancada: () => <div>Busca Avançada</div>,
}));

vi.mock('next/link', () => ({
  default: ({ href, children }: any) => <a href={href}>{children}</a>,
}));

const mockMeta: Meta = {
  competenciaAtual: '2025-01',
  ultimaAtualizacao: '2025-01-15T10:00:00Z',
};

const mockCidades: CidadeOpcao[] = [
  {
    codigoIbge: '3304557',
    nome: 'Niterói',
    slug: 'niteroi',
    mesorregiao: 'Metropolitana do Rio de Janeiro',
  },
];

describe('Navegacao', () => {
  it('renders header with logo', () => {
    render(<Navegacao meta={mockMeta} cidades={mockCidades} />);
    expect(screen.getByText(/NETRANK/i)).toBeInTheDocument();
  });

  it('renders institutional bar', () => {
    render(<Navegacao meta={mockMeta} cidades={mockCidades} />);
    expect(screen.getByText('Prefeitura de Niterói')).toBeInTheDocument();
  });

  it('renders main navigation items', () => {
    render(<Navegacao meta={mockMeta} cidades={mockCidades} />);
    expect(screen.getByText('Visão geral')).toBeInTheDocument();
    expect(screen.getByText('Ranking')).toBeInTheDocument();
    expect(screen.getByText('Municípios')).toBeInTheDocument();
  });

  it('displays current competência', () => {
    render(<Navegacao meta={mockMeta} cidades={mockCidades} />);
    expect(screen.getByText('Competência')).toBeInTheDocument();
    expect(screen.getByText(/2025/)).toBeInTheDocument();
  });

  it('renders city selector', () => {
    render(<Navegacao meta={mockMeta} cidades={mockCidades} />);
    expect(screen.getByText('Seletor de Cidade')).toBeInTheDocument();
  });

  it('optionally renders advanced search', () => {
    render(
      <Navegacao
        meta={mockMeta}
        cidades={mockCidades}
        itensBusca={[
          { tipo: 'municipio', nome: 'Rio de Janeiro', slug: 'rio' },
        ]}
      />
    );
    expect(screen.getByText('Busca Avançada')).toBeInTheDocument();
  });

  it('has proper navigation aria-label', () => {
    const { container } = render(<Navegacao meta={mockMeta} cidades={mockCidades} />);
    const nav = container.querySelector('nav[aria-label="Navegação principal"]');
    expect(nav).toBeInTheDocument();
  });
});
