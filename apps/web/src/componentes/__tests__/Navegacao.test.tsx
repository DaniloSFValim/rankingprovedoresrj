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
  competencias: ['2024-12', '2025-01'],
  numeroEmpresas: 500,
  numeroMunicipios: 92,
  geradoEm: '2025-01-15T11:30:00Z',
  procedencia: {
    fonte: 'Teste',
    url: 'http://test',
    arquivo: 'test.csv',
    competenciaInicial: '2024-12',
    competenciaFinal: '2025-01',
    coletadoEm: '2025-01-15T10:00:00Z',
    processadoEm: '2025-01-15T11:00:00Z',
    dadosDemonstrativos: false,
  },
};

const mockCidades: CidadeOpcao[] = [
  {
    nome: 'Niterói',
    slug: 'niteroi',
    totalAcessos: 1500,
    numeroProvedores: 12,
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
          { id: '1', titulo: 'Rio de Janeiro', texto: 'Rio de Janeiro', categoria: 'municipio', href: '/municipios/rio-de-janeiro' },
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
