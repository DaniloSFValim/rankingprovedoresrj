'use client';

import { createContext, useContext, useEffect, useState } from 'react';

interface CidadeSelecionadaContextType {
  slugCidade: string | null;
  selecionarCidade: (slug: string) => void;
  limparSelecao: () => void;
}

const CidadeSelecionadaContext = createContext<CidadeSelecionadaContextType | undefined>(undefined);

const CHAVE_CIDADE_SELECIONADA = 'netrank:cidade-selecionada';

export function CidadeSelecionadaProvider({ children }: { children: React.ReactNode }) {
  const [slugCidade, setSlugCidade] = useState<string | null>(null);

  useEffect(() => {
    try {
      const salvo = localStorage.getItem(CHAVE_CIDADE_SELECIONADA);
      setSlugCidade(salvo);
    } catch {
      setSlugCidade(null);
    }
  }, []);

  function selecionarCidade(slug: string) {
    try {
      localStorage.setItem(CHAVE_CIDADE_SELECIONADA, slug);
    } catch {
      // Navegação anônima ou armazenamento bloqueado
    }
    setSlugCidade(slug);
  }

  function limparSelecao() {
    try {
      localStorage.removeItem(CHAVE_CIDADE_SELECIONADA);
    } catch {
      // Ignorar erro
    }
    setSlugCidade(null);
  }

  return (
    <CidadeSelecionadaContext.Provider value={{ slugCidade, selecionarCidade, limparSelecao }}>
      {children}
    </CidadeSelecionadaContext.Provider>
  );
}

export function useCidadeSelecionada() {
  const contexto = useContext(CidadeSelecionadaContext);
  if (!contexto) {
    throw new Error('useCidadeSelecionada deve ser usado dentro de CidadeSelecionadaProvider');
  }
  return contexto;
}
