'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { canonizarTexto } from '@netrank/core';
import { inteiro } from '@/lib/formato';

/**
 * Seletor global de cidade.
 *
 * O produto tem 92 municípios e o usuário quase sempre chega querendo um deles.
 * Uma lista suspensa com 92 itens é inútil na prática — por isso a busca é por
 * texto, insensível a acento e caixa: "sao goncalo" encontra "São Gonçalo".
 *
 * A navegação é feita por rota, e não por estado de aplicação, porque cada
 * cidade tem sua própria página estática. Isso mantém a URL compartilhável e
 * indexável, o que um filtro puramente client-side perderia.
 */

export interface CidadeOpcao {
  slug: string;
  nome: string;
  totalAcessos: number;
  numeroProvedores: number;
}

interface Props {
  cidades: CidadeOpcao[];
  /** Cidade já selecionada, quando o seletor aparece dentro de uma delas. */
  slugAtual?: string;
  /** `destaque` usa a versão grande da home; `compacto`, a da navegação. */
  variante?: 'destaque' | 'compacto';
}

const CHAVE_ULTIMA_CIDADE = 'netrank:ultima-cidade';

export function SeletorCidade({ cidades, slugAtual, variante = 'compacto' }: Props) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState('');
  const [indiceFoco, setIndiceFoco] = useState(0);
  const container = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLInputElement>(null);

  const atual = cidades.find((c) => c.slug === slugAtual);

  const filtradas = useMemo(() => {
    const termo = canonizarTexto(busca);
    if (termo === '') return cidades;
    // Começar com o termo vale mais que apenas conter: quem digita "nit"
    // espera Niterói antes de qualquer cidade que tenha "nit" no meio.
    const contem = cidades.filter((c) => canonizarTexto(c.nome).includes(termo));
    return contem.sort((a, b) => {
      const aComeca = canonizarTexto(a.nome).startsWith(termo) ? 0 : 1;
      const bComeca = canonizarTexto(b.nome).startsWith(termo) ? 0 : 1;
      return aComeca - bComeca || b.totalAcessos - a.totalAcessos;
    });
  }, [busca, cidades]);

  useEffect(() => {
    setIndiceFoco(0);
  }, [busca]);

  useEffect(() => {
    if (!aberto) return;
    const aoClicarFora = (evento: MouseEvent) => {
      if (!container.current?.contains(evento.target as Node)) setAberto(false);
    };
    document.addEventListener('mousedown', aoClicarFora);
    return () => document.removeEventListener('mousedown', aoClicarFora);
  }, [aberto]);

  useEffect(() => {
    if (aberto) campo.current?.focus();
  }, [aberto]);

  function escolher(cidade: CidadeOpcao) {
    try {
      localStorage.setItem(CHAVE_ULTIMA_CIDADE, cidade.slug);
    } catch {
      // Navegação anônima ou armazenamento bloqueado: lembrar é conveniência,
      // não requisito. A escolha funciona do mesmo jeito.
    }
    setAberto(false);
    setBusca('');
    router.push(`/municipios/${cidade.slug}/`);
  }

  function aoTeclar(evento: React.KeyboardEvent<HTMLInputElement>) {
    if (evento.key === 'ArrowDown') {
      evento.preventDefault();
      setIndiceFoco((i) => Math.min(i + 1, filtradas.length - 1));
    } else if (evento.key === 'ArrowUp') {
      evento.preventDefault();
      setIndiceFoco((i) => Math.max(i - 1, 0));
    } else if (evento.key === 'Enter') {
      evento.preventDefault();
      const escolhida = filtradas[indiceFoco];
      if (escolhida) escolher(escolhida);
    } else if (evento.key === 'Escape') {
      setAberto(false);
    }
  }

  const ehDestaque = variante === 'destaque';

  return (
    <div ref={container} className={`relative ${ehDestaque ? 'w-full max-w-xl' : 'w-full sm:w-64'}`}>
      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        className={
          ehDestaque
            ? 'flex w-full items-center justify-between gap-3 rounded-xl border border-marca-700 bg-marca-950/50 px-5 py-4 text-left transition hover:border-marca-500 hover:bg-marca-950'
            : 'flex w-full items-center justify-between gap-2 rounded-lg border border-grafite-700 bg-grafite-900 px-3 py-2 text-left text-sm transition hover:border-grafite-600'
        }
        aria-expanded={aberto}
        aria-haspopup="listbox"
      >
        <span className="min-w-0">
          <span className={ehDestaque ? 'rotulo' : 'sr-only'}>
            {ehDestaque ? 'Analisar uma cidade' : 'Selecionar cidade'}
          </span>
          <span
            className={`block truncate ${
              ehDestaque ? 'mt-1 text-xl font-semibold text-white' : 'text-grafite-200'
            }`}
          >
            {atual ? atual.nome : 'Escolher município…'}
          </span>
        </span>
        <span className={`shrink-0 ${ehDestaque ? 'text-marca-400' : 'text-grafite-500'}`}>▾</span>
      </button>

      {aberto && (
        <div className="absolute left-0 right-0 z-50 mt-2 overflow-hidden rounded-xl border border-grafite-700 bg-grafite-900 shadow-2xl">
          <input
            ref={campo}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            onKeyDown={aoTeclar}
            placeholder="Buscar município…"
            className="w-full border-b border-grafite-800 bg-grafite-950 px-4 py-3 text-sm text-white outline-none placeholder:text-grafite-500"
            aria-label="Buscar município"
          />
          <ul role="listbox" className="max-h-80 overflow-y-auto">
            {filtradas.length === 0 && (
              <li className="px-4 py-3 text-sm text-grafite-400">
                Nenhum município encontrado.
              </li>
            )}
            {filtradas.map((cidade, indice) => (
              <li key={cidade.slug}>
                <button
                  type="button"
                  onMouseEnter={() => setIndiceFoco(indice)}
                  onClick={() => escolher(cidade)}
                  className={`flex w-full items-baseline justify-between gap-3 px-4 py-2.5 text-left text-sm transition ${
                    indice === indiceFoco ? 'bg-grafite-800 text-white' : 'text-grafite-200'
                  }`}
                >
                  <span className="truncate">{cidade.nome}</span>
                  <span className="numerico shrink-0 text-xs text-grafite-500">
                    {inteiro(cidade.totalAcessos)} acessos · {cidade.numeroProvedores} prov.
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * Atalho para a última cidade consultada.
 *
 * Renderiza apenas depois da montagem: o valor vem de `localStorage`, que não
 * existe na geração estática, e renderizá-lo no servidor causaria divergência
 * de hidratação.
 */
export function UltimaCidade({ cidades }: { cidades: CidadeOpcao[] }) {
  const [slug, setSlug] = useState<string | null>(null);

  useEffect(() => {
    try {
      setSlug(localStorage.getItem(CHAVE_ULTIMA_CIDADE));
    } catch {
      setSlug(null);
    }
  }, []);

  const cidade = cidades.find((c) => c.slug === slug);
  if (!cidade) return null;

  return (
    <a
      href={`/municipios/${cidade.slug}/`}
      className="inline-flex items-center gap-1.5 text-sm text-grafite-400 underline-offset-2 hover:text-marca-300 hover:underline"
    >
      ↩ Voltar para {cidade.nome}
    </a>
  );
}
