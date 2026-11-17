import { describe, it, expect, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { BuscaAvancada, type ItemBusca } from '../BuscaAvancada';

vi.mock('next/link', () => ({
  default: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props}>{children}</a>,
}));

const item = (titulo: string, categoria: ItemBusca['categoria'], href: string): ItemBusca => ({
  id: href, titulo, categoria, href, texto: titulo,
});
const itens = [
  item('Niterói', 'municipio', '/municipios/niteroi/'),
  item('São Gonçalo', 'municipio', '/municipios/sao-goncalo/'),
  item('Rede Niteroi Net', 'provedor', '/provedores/rede-niteroi-net/'),
  item('Paraty', 'municipio', '/municipios/paraty/'),
];

const buscar = (termo: string) => {
  cleanup();
  render(<BuscaAvancada itens={itens} />);
  const campo = screen.getByRole('combobox');
  fireEvent.focus(campo);
  fireEvent.change(campo, { target: { value: termo } });
  return screen.queryAllByRole('option').map((o) => o.textContent ?? '');
};

describe('BuscaAvancada', () => {
  it('ignora acentos e caixa', () => {
    expect(buscar('NITEROI')[0]).toContain('Niterói');
    expect(buscar('sao goncalo')[0]).toContain('São Gonçalo');
  });

  it('põe primeiro o que começa com o termo', () => {
    const resultados = buscar('niter');
    expect(resultados[0]).toContain('Niterói');
    expect(resultados[1]).toContain('Rede Niteroi Net');
  });

  it('não devolve nada para termo sem correspondência', () => {
    expect(buscar('xyzw')).toEqual([]);
  });
});
