'use client';

import { useState, useCallback, useMemo } from 'react';

export interface FiltroConfig {
  id: string;
  nome: string;
  tipo: 'texto' | 'intervalo' | 'selecao' | 'checkbox';
  opcoes?: { valor: string; rotulo: string }[];
  min?: number;
  max?: number;
}

export interface FiltrosAplicados {
  [chave: string]: string | number | boolean | [number, number];
}

interface Props {
  filtros: FiltroConfig[];
  onFiltrosChange: (filtros: FiltrosAplicados) => void;
  onLimpar?: () => void;
}

export function FiltrosAvancados({ filtros, onFiltrosChange, onLimpar }: Props) {
  const [aberto, setAberto] = useState(false);
  const [aplicados, setAplicados] = useState<FiltrosAplicados>({});

  const totalFiltros = useMemo(() => {
    return Object.keys(aplicados).filter((k) => aplicados[k] !== undefined).length;
  }, [aplicados]);

  const handleFiltroChange = useCallback(
    (chave: string, valor: string | number | boolean | [number, number]) => {
      const novosFiltros = { ...aplicados, [chave]: valor };
      setAplicados(novosFiltros);
      onFiltrosChange(novosFiltros);
    },
    [aplicados, onFiltrosChange]
  );

  const handleLimpar = useCallback(() => {
    setAplicados({});
    onLimpar?.();
    onFiltrosChange({});
  }, [onFiltrosChange, onLimpar]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setAberto(!aberto)}
        className="inline-flex items-center gap-2 rounded-lg border border-grafite-700 bg-grafite-900 px-4 py-2 text-sm font-medium text-grafite-200 transition hover:border-grafite-600 hover:bg-grafite-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca-400"
        aria-expanded={aberto}
        aria-haspopup="dialog"
      >
        🔍 Filtros
        {totalFiltros > 0 && (
          <span className="inline-flex items-center justify-center rounded-full bg-marca-500/20 px-2 py-0.5 text-xs font-semibold text-marca-300">
            {totalFiltros}
          </span>
        )}
      </button>

      {aberto && (
        <div className="absolute right-0 z-40 mt-2 w-80 rounded-xl border border-grafite-700 bg-grafite-900 p-6 shadow-2xl">
          <div className="space-y-5">
            {filtros.map((filtro) => (
              <div key={filtro.id} className="space-y-2">
                <label className="rotulo">{filtro.nome}</label>

                {filtro.tipo === 'texto' && (
                  <input
                    type="text"
                    placeholder={`Buscar ${filtro.nome.toLowerCase()}...`}
                    value={(aplicados[filtro.id] as string) || ''}
                    onChange={(e) => handleFiltroChange(filtro.id, e.target.value)}
                    className="w-full rounded-lg border border-grafite-700 bg-grafite-800 px-3 py-2 text-sm text-white placeholder:text-grafite-500 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-marca-400"
                  />
                )}

                {filtro.tipo === 'selecao' && filtro.opcoes && (
                  <select
                    value={(aplicados[filtro.id] as string) || ''}
                    onChange={(e) => handleFiltroChange(filtro.id, e.target.value)}
                    className="w-full rounded-lg border border-grafite-700 bg-grafite-800 px-3 py-2 text-sm text-white focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-marca-400"
                  >
                    <option value="">Todas as opções</option>
                    {filtro.opcoes.map((opt) => (
                      <option key={opt.valor} value={opt.valor}>
                        {opt.rotulo}
                      </option>
                    ))}
                  </select>
                )}

                {filtro.tipo === 'checkbox' && (
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={(aplicados[filtro.id] as boolean) || false}
                      onChange={(e) => handleFiltroChange(filtro.id, e.target.checked)}
                      className="h-4 w-4 rounded border-grafite-700 bg-grafite-800 accent-marca-500"
                    />
                    <span className="text-sm text-grafite-300">{filtro.nome}</span>
                  </label>
                )}

                {filtro.tipo === 'intervalo' && filtro.min !== undefined && filtro.max !== undefined && (
                  <div className="space-y-2">
                    <input
                      type="range"
                      min={filtro.min}
                      max={filtro.max}
                      value={((aplicados[filtro.id] as [number, number])?.[1] || filtro.max)}
                      onChange={(e) => {
                        const novoMax = parseInt(e.target.value);
                        const [min] = (aplicados[filtro.id] as [number, number]) || [filtro.min, filtro.max];
                        handleFiltroChange(filtro.id, [min, novoMax]);
                      }}
                      className="w-full"
                    />
                    <div className="text-xs text-grafite-400">
                      Até {((aplicados[filtro.id] as [number, number])?.[1] || filtro.max).toLocaleString('pt-BR')}
                    </div>
                  </div>
                )}
              </div>
            ))}

            <div className="border-t border-grafite-800 pt-4">
              {totalFiltros > 0 && (
                <button
                  type="button"
                  onClick={handleLimpar}
                  className="text-sm text-marca-400 underline-offset-2 hover:text-marca-300 hover:underline"
                >
                  Limpar filtros
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
