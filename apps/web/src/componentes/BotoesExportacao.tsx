'use client';

import { useState } from 'react';
import { paraCSV, paraJSON, type ExportRecord } from '@/lib/exportacao';

interface Props {
  dados: ExportRecord[];
  nomeArquivo: string;
  rotulo?: string;
  descricao?: string;
  disabled?: boolean;
}

export function BotoesExportacao({
  dados,
  nomeArquivo,
  rotulo = 'Exportar dados',
  descricao,
  disabled = false,
}: Props) {
  const [aberto, setAberto] = useState(false);
  const [exportando, setExportando] = useState<'csv' | 'json' | null>(null);

  const handleExportarCSV = async () => {
    setExportando('csv');
    try {
      paraCSV(dados, nomeArquivo);
    } finally {
      setExportando(null);
      setAberto(false);
    }
  };

  const handleExportarJSON = async () => {
    setExportando('json');
    try {
      paraJSON(dados, nomeArquivo);
    } finally {
      setExportando(null);
      setAberto(false);
    }
  };

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setAberto(!aberto)}
        disabled={disabled || dados.length === 0}
        className="inline-flex items-center gap-2 rounded-lg border border-grafite-700 bg-grafite-900 px-4 py-2 text-sm font-medium text-grafite-200 transition disabled:opacity-50 disabled:cursor-not-allowed hover:not-disabled:border-grafite-600 hover:not-disabled:bg-grafite-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca-400"
        aria-expanded={aberto}
        aria-haspopup="menu"
        title={descricao}
      >
        ⬇️ {rotulo}
      </button>

      {aberto && !disabled && dados.length > 0 && (
        <div className="absolute right-0 z-50 mt-2 w-48 overflow-hidden rounded-lg border border-grafite-700 bg-grafite-900 shadow-2xl">
          <div className="space-y-1 p-2">
            <button
              type="button"
              onClick={handleExportarCSV}
              disabled={exportando !== null}
              className="w-full rounded-md px-4 py-2 text-left text-sm text-grafite-200 transition hover:bg-grafite-800 disabled:opacity-50 disabled:cursor-not-allowed"
              role="menuitem"
            >
              📊 Exportar como CSV
              {exportando === 'csv' && <span className="text-xs text-marca-400 ml-2">(baixando...)</span>}
            </button>
            <button
              type="button"
              onClick={handleExportarJSON}
              disabled={exportando !== null}
              className="w-full rounded-md px-4 py-2 text-left text-sm text-grafite-200 transition hover:bg-grafite-800 disabled:opacity-50 disabled:cursor-not-allowed"
              role="menuitem"
            >
              {} Exportar como JSON
              {exportando === 'json' && <span className="text-xs text-marca-400 ml-2">(baixando...)</span>}
            </button>
          </div>
          <div className="border-t border-grafite-800 px-4 py-2 text-xs text-grafite-500">
            {dados.length} registro{dados.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}
    </div>
  );
}
