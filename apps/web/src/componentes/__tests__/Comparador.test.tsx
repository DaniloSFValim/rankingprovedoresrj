import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { Comparador } from '../Comparador';
import type { ComparadorConfig } from '../Comparador';

const mockConfig: ComparadorConfig<any, any> = {
  tipo: 'municipios',
  tituloPlural: 'Municípios',
  descricaoSeletor: 'Selecione municípios para comparar',
  renderizador: {
    nomeItem: (item) => item.nome,
    subtextoItem: (item) => `${item.acessos} acessos`,
    nomeComparacao: (perfis) => `Comparação de ${perfis.length} municípios`,
    secoes: (perfis) => <div>Seções de comparação</div>,
  },
  urls: {
    indice: '/data/municipios/index.json',
    perfil: (slug) => `/data/municipios/${slug}.json`,
    kpis: '/data/estado/kpis.json',
  },
  extrairNomeDeSlug: (indice, slug) =>
    indice.find((x: any) => x.slug === slug)?.nome,
};

describe('Comparador', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('shows loading state initially', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ municipios: [] }),
    });
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ competencia: '202501' }),
    });

    render(<Comparador config={mockConfig} />);
    expect(screen.getByText('Carregando...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Selecionar Municípios/)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('renders selector UI when data loaded but no items selected', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        municipios: [
          { nome: 'Rio de Janeiro', slug: 'rio-de-janeiro', acessos: 100 },
        ],
      }),
    });
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ competencia: '202501' }),
    });

    render(<Comparador config={mockConfig} />);

    await waitFor(() => {
      expect(screen.getByText(/Rio de Janeiro/)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('handles fetch errors gracefully', async () => {
    (global.fetch as any).mockRejectedValueOnce(
      new Error('Network error')
    );

    render(<Comparador config={mockConfig} />);

    await waitFor(() => {
      expect(screen.getByText(/Erro ao carregar dados/)).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});
