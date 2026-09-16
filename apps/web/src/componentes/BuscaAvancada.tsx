'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import Link from 'next/link';
import { canonizarTexto } from '@netrank/core';

export interface ItemBusca {
  id: string;
  titulo: string;
  descricao?: string;
  categoria: 'municipio' | 'provedor' | 'pagina';
  href: string;
  texto: string;
}

interface Props {
  itens: ItemBusca[];
  placeholder?: string;
  aoSelecionarItem?: (item: ItemBusca) => void;
}

export function BuscaAvancada({
  itens,
  placeholder = 'Buscar municípios, provedores...',
  aoSelecionarItem,
}: Props) {
  const [busca, setBusca] = useState('');
  const [aberto, setAberto] = useState(false);
  const [indiceFoco, setIndiceFoco] = useState(0);
  const container = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  const termo = canonizarTexto(busca);
  const resultados = useMemo(() => {
    if (!termo) return [];

    const encontrados = itens.filter((item) => canonizarTexto(item.texto).includes(termo));

    encontrados.sort((a, b) => {
      const aComeca = canonizarTexto(a.texto).startsWith(termo) ? 0 : 1;
      const bComeca = canonizarTexto(b.texto).startsWith(termo) ? 0 : 1;
      return aComeca - bComeca;
    });

    return encontrados.slice(0, 10);
  }, [busca, itens]);

  useEffect(() => {
    setIndiceFoco(0);
  }, [busca]);

  useEffect(() => {
    if (!aberto) return;
    const aoClicarFora = (evento: MouseEvent) => {
      if (!container.current?.contains(evento.target as Node)) {
        setAberto(false);
      }
    };
    document.addEventListener('mousedown', aoClicarFora);
    return () => document.removeEventListener('mousedown', aoClicarFora);
  }, [aberto]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIndiceFoco((i) => Math.min(i + 1, resultados.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIndiceFoco((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && resultados[indiceFoco]) {
      const item = resultados[indiceFoco];
      aoSelecionarItem?.(item);
      window.location.href = item.href;
    } else if (e.key === 'Escape') {
      setAberto(false);
    }
  };

  const getCategoryLabel = (categoria: string) => {
    const labels: Record<string, string> = {
      municipio: '🏢 Município',
      provedor: '🌐 Provedor',
      pagina: '📄 Página',
    };
    return labels[categoria] || categoria;
  };

  return (
    <div ref={container} className="relative w-full">
      <input
        ref={input}
        type="text"
        value={busca}
        onChange={(e) => {
          setBusca(e.target.value);
          setAberto(true);
        }}
        onFocus={() => setAberto(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full rounded-lg border border-grafite-700 bg-grafite-900 px-4 py-2 text-sm text-white placeholder:text-grafite-500 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-marca-400"
        aria-autocomplete="list"
        aria-expanded={aberto && resultados.length > 0}
        aria-label="Busca avançada"
      />

      {aberto && termo && resultados.length > 0 && (
        <div
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-96 overflow-y-auto rounded-lg border border-grafite-700 bg-grafite-900 shadow-2xl"
          role="listbox"
        >
          {resultados.map((item, indice) => (
            <Link
              key={item.id}
              href={item.href}
              onClick={() => {
                aoSelecionarItem?.(item);
                setAberto(false);
                setBusca('');
              }}
              className={`flex items-start gap-3 border-b border-grafite-800/50 last:border-0 px-4 py-3 transition ${
                indice === indiceFoco ? 'bg-marca-900/40' : 'hover:bg-grafite-800/50'
              }`}
              role="option"
              aria-selected={indice === indiceFoco}
            >
              <div className="mt-0.5 shrink-0 text-xs font-medium text-marca-400">
                {getCategoryLabel(item.categoria)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-white">{item.titulo}</div>
                {item.descricao && (
                  <div className="mt-0.5 text-xs text-grafite-400 truncate">{item.descricao}</div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {aberto && termo && resultados.length === 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border border-grafite-700 bg-grafite-900 px-4 py-3 text-center text-sm text-grafite-400">
          Nenhum resultado para "{busca}"
        </div>
      )}
    </div>
  );
}
