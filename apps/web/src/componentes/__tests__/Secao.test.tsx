import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Secao } from '../Secao';

describe('Secao', () => {
  it('renders titulo and descricao', () => {
    render(
      <Secao titulo="Dados Estaduais" descricao="Indicadores agregados">
        <p>Conteúdo da seção</p>
      </Secao>
    );
    expect(screen.getByText('Dados Estaduais')).toBeInTheDocument();
    expect(screen.getByText('Indicadores agregados')).toBeInTheDocument();
  });

  it('renders children', () => {
    render(
      <Secao titulo="Teste" descricao="">
        <p>Conteúdo teste</p>
      </Secao>
    );
    expect(screen.getByText('Conteúdo teste')).toBeInTheDocument();
  });

  it('applies correct semantic structure', () => {
    const { container } = render(
      <Secao titulo="Teste" descricao="">
        <p>Conteúdo</p>
      </Secao>
    );
    const section = container.querySelector('section');
    expect(section).toBeInTheDocument();
  });

  it('renders without descricao when not provided', () => {
    const { container } = render(
      <Secao titulo="Teste">
        <p>Conteúdo</p>
      </Secao>
    );
    // Should still render but descricao might be undefined
    expect(screen.getByText('Teste')).toBeInTheDocument();
  });
});
