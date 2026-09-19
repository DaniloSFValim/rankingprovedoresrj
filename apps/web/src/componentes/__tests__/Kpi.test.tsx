import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Kpi } from '../Kpi';

describe('Kpi', () => {
  it('renders with rotulo and valor', () => {
    render(<Kpi rotulo="Total de Acessos" valor="1.234" />);
    expect(screen.getByText('Total de Acessos')).toBeInTheDocument();
    expect(screen.getByText('1.234')).toBeInTheDocument();
  });

  it('displays unidade when provided', () => {
    render(<Kpi rotulo="Teste" valor="100" unidade="%" />);
    expect(screen.getByText('%')).toBeInTheDocument();
  });

  it('displays detalhe when provided', () => {
    render(
      <Kpi rotulo="Teste" valor="100" detalhe="Lider: Empresa X" />
    );
    expect(screen.getByText('Lider: Empresa X')).toBeInTheDocument();
  });

  it('displays variacao when provided', () => {
    const { container } = render(
      <Kpi
        rotulo="Teste"
        valor="100"
        variacao={5}
        variacaoTexto="+5% vs mês anterior"
      />
    );
    expect(screen.getByText(/5%/)).toBeInTheDocument();
    expect(container.querySelector('[aria-label="Variação: +5% vs mês anterior"]')).toBeInTheDocument();
  });

  it('has aria-label for accessibility', () => {
    const { container } = render(<Kpi rotulo="Teste" valor="100" />);
    const region = container.querySelector('[role="region"]');
    expect(region).toHaveAttribute('aria-label', 'Teste');
  });
});
