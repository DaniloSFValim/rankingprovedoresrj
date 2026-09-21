import Link from 'next/link';
import { rotularCompetencia } from '@netrank/core';
import { Secao } from '@/componentes/Secao';
import { lerKpis } from '@/lib/dados';
import { obterDatasetsDisponiveis, formatarTamanho } from '@/lib/exportacao';
import { MARCA } from '@/lib/marca';

export const metadata = {
  title: `Download de Dados — Banda Larga Fixa no ${MARCA.uf}`,
  description:
    `Exporte dados de banda larga do ${MARCA.uf} em múltiplos formatos: JSON, CSV e GeoJSON. ` +
    `Indicadores estaduais, rankings municipais e cobertura de provedores.`,
};

/**
 * Download Center (§50) - Página de exportação de dados
 *
 * Oferece download de datasets consolidados em múltiplos formatos:
 * - JSON: dados brutos estruturados
 * - CSV: formato tabular para análise
 * - GeoJSON: dados geográficos para mapas
 */
export default function CentroDados() {
  const kpis = lerKpis();
  const datasets = obterDatasetsDisponiveis();

  const porCategoria = {
    estado: datasets.filter((d) => ['KPIs Estaduais', 'Ranking Estadual', 'Série Histórica Estadual', 'Série Histórica por Provedor'].includes(d.nome)),
    municipios: datasets.filter((d) =>
      ['Ranking Municipal', 'Municípios (CSV)', 'Malha Geográfica RJ'].includes(d.nome),
    ),
    provedores: datasets.filter((d) =>
      ['Perfis de Provedores', 'Movimentações de Ranking'].includes(d.nome),
    ),
  };

  const formatoIcone = (formato: string) => {
    const iconMap: Record<string, string> = {
      json: '📋',
      csv: '📊',
      geojson: '🗺️',
    };
    return iconMap[formato] || '📥';
  };

  const formatoLabel = (formato: string) => {
    const labelMap: Record<string, string> = {
      json: 'JSON',
      csv: 'CSV',
      geojson: 'GeoJSON',
    };
    return labelMap[formato] || formato;
  };

  return (
    <main className="space-y-8">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Centro de Dados</h1>
        <p className="mt-2 text-sm text-grafite-400">
          Download de dados consolidados de banda larga fixa no {MARCA.uf}
        </p>
        <p className="mt-1 text-xs text-grafite-500">
          Dados de competência {rotularCompetencia(kpis.competencia)}
        </p>
      </div>

      {/* Informações de Referência */}
      <div className="grid gap-3 md:grid-cols-3">
        <div className="cartao p-4">
          <p className="text-xs font-semibold uppercase text-grafite-400 mb-2">Competência</p>
          <p className="text-xl font-bold text-marca-300">{rotularCompetencia(kpis.competencia)}</p>
        </div>
        <div className="cartao p-4">
          <p className="text-xs font-semibold uppercase text-grafite-400 mb-2">Total de Provedores</p>
          <p className="text-xl font-bold text-marca-300">{kpis.numeroProvedores}</p>
        </div>
        <div className="cartao p-4">
          <p className="text-xs font-semibold uppercase text-grafite-400 mb-2">Municípios Cobertos</p>
          <p className="text-xl font-bold text-marca-300">{kpis.numeroMunicipios}</p>
        </div>
      </div>

      {/* Datasets por Categoria */}

      {/* Estado */}
      <Secao
        titulo="Dados Estaduais"
        descricao="Indicadores agregados do estado e séries históricas"
      >
        <div className="space-y-2">
          {porCategoria.estado.map((dataset) => (
            <a
              key={dataset.arquivo}
              href={dataset.caminho}
              download={dataset.arquivo}
              className="cartao p-4 hover:bg-grafite-800/60 transition flex items-start justify-between"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{formatoIcone(dataset.formato)}</span>
                  <h3 className="font-semibold text-white">{dataset.nome}</h3>
                  <span className="px-2 py-0.5 rounded bg-marca-500/20 text-marca-300 text-xs font-medium">
                    {formatoLabel(dataset.formato)}
                  </span>
                </div>
                <p className="mt-2 text-sm text-grafite-400">{dataset.descricao}</p>
                <p className="mt-2 text-xs text-grafite-500">Tamanho estimado: {dataset.tamanhoEstimado}</p>
              </div>
              <div className="ml-4 flex-shrink-0">
                <button className="px-3 py-1.5 rounded bg-marca-500 hover:bg-marca-600 text-white text-sm transition">
                  ↓ Download
                </button>
              </div>
            </a>
          ))}
        </div>
      </Secao>

      {/* Municípios */}
      <Secao titulo="Dados Municipais" descricao="Rankings, indicadores e geometrias de municípios">
        <div className="space-y-2">
          {porCategoria.municipios.map((dataset) => (
            <a
              key={dataset.arquivo}
              href={dataset.caminho}
              download={dataset.arquivo}
              className="cartao p-4 hover:bg-grafite-800/60 transition flex items-start justify-between"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{formatoIcone(dataset.formato)}</span>
                  <h3 className="font-semibold text-white">{dataset.nome}</h3>
                  <span className="px-2 py-0.5 rounded bg-marca-500/20 text-marca-300 text-xs font-medium">
                    {formatoLabel(dataset.formato)}
                  </span>
                </div>
                <p className="mt-2 text-sm text-grafite-400">{dataset.descricao}</p>
                <p className="mt-2 text-xs text-grafite-500">Tamanho estimado: {dataset.tamanhoEstimado}</p>
              </div>
              <div className="ml-4 flex-shrink-0">
                <button className="px-3 py-1.5 rounded bg-marca-500 hover:bg-marca-600 text-white text-sm transition">
                  ↓ Download
                </button>
              </div>
            </a>
          ))}
        </div>
      </Secao>

      {/* Provedores */}
      <Secao titulo="Dados de Provedores" descricao="Perfis de prestadoras e análise de movimentações">
        <div className="space-y-2">
          {porCategoria.provedores.map((dataset) => (
            <a
              key={dataset.arquivo}
              href={dataset.caminho}
              download={dataset.arquivo}
              className="cartao p-4 hover:bg-grafite-800/60 transition flex items-start justify-between"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{formatoIcone(dataset.formato)}</span>
                  <h3 className="font-semibold text-white">{dataset.nome}</h3>
                  <span className="px-2 py-0.5 rounded bg-marca-500/20 text-marca-300 text-xs font-medium">
                    {formatoLabel(dataset.formato)}
                  </span>
                </div>
                <p className="mt-2 text-sm text-grafite-400">{dataset.descricao}</p>
                <p className="mt-2 text-xs text-grafite-500">Tamanho estimado: {dataset.tamanhoEstimado}</p>
              </div>
              <div className="ml-4 flex-shrink-0">
                <button className="px-3 py-1.5 rounded bg-marca-500 hover:bg-marca-600 text-white text-sm transition">
                  ↓ Download
                </button>
              </div>
            </a>
          ))}
        </div>
      </Secao>

      {/* Documentação */}
      <Secao
        titulo="Documentação e Metodologia"
        descricao="Saiba como interpretar e usar os dados"
      >
        <div className="grid gap-3 md:grid-cols-2">
          <Link href="/metodologia">
            <div className="cartao p-4 hover:bg-grafite-800/60 transition">
              <h3 className="font-semibold text-white">📖 Metodologia e Transparência</h3>
              <p className="mt-1 text-xs text-grafite-400">
                Explicação detalhada sobre fontes, pipeline de processamento, cálculos e indicadores.
              </p>
              <p className="mt-2 text-xs text-marca-400">→ Consultar →</p>
            </div>
          </Link>
          <div className="cartao p-4">
            <h3 className="font-semibold text-white">📊 Dicionário de Dados</h3>
            <p className="mt-1 text-xs text-grafite-400">
              Descrição de todos os campos, unidades e definições dos datasets.
            </p>
            <p className="mt-2 text-xs text-grafite-500">(Em desenvolvimento)</p>
          </div>
        </div>
      </Secao>

      {/* Termos de Uso */}
      <div className="cartao p-4 border-l-2 border-marca-500">
        <h3 className="font-semibold text-white text-sm mb-2">⚖️ Termos de Uso</h3>
        <p className="text-xs text-grafite-400 mb-3">
          Os dados fornecidos neste centro de downloads são:
        </p>
        <ul className="text-xs text-grafite-400 space-y-1 list-disc list-inside">
          <li>
            <strong>Públicos</strong> - Consolidados a partir de fontes de domínio público (ANATEL)
          </li>
          <li>
            <strong>Agregados</strong> - Em nível estadual e municipal, sem dados de cliente individual
          </li>
          <li>
            <strong>Processados</strong> - Com validações, enriquecimento e tratamento de qualidade
          </li>
          <li>
            <strong>Sob Licença CC BY 4.0</strong> - Uso livre com atribuição aos dados originais da ANATEL
          </li>
        </ul>
      </div>

      {/* Navegação */}
      <div className="flex gap-3">
        <Link href="/">
          <button className="px-4 py-2 rounded bg-grafite-800 hover:bg-grafite-700 text-white text-sm transition">
            ← Voltar ao Dashboard
          </button>
        </Link>
      </div>
    </main>
  );
}
