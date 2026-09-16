'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { rotularCompetencia } from '@netrank/core';
import { Secao } from '@/componentes/Secao';
import { MapaCoropletaHhi } from '@/componentes/MapaCoropletaHhi';
import { inteiro, percentual } from '@/lib/formato';
import { descreverHhi } from '@/lib/mapas';

interface MunicipioHhi {
  codigoIbge: string;
  nome: string;
  hhi: number;
  numeroProvedores: number;
}

interface DetalheMunicipio {
  codigoIbge: string;
  nome: string;
  hhi: number;
  cr1: number;
  cr3: number;
  numeroProvedores: number;
  totalAcessos: number;
  lider: string;
  liderMarketShare: number;
}

/**
 * Página de mapa coropleth HHI (Phase 4)
 * Visualiza concentração de mercado por município
 */
export default function MapaHhi() {
  const [municipios, setMunicipios] = useState<MunicipioHhi[]>([]);
  const [detalhesSelecionado, setDetalhesSelecionado] = useState<DetalheMunicipio | null>(null);
  const [loading, setLoading] = useState(true);
  const [competencia, setCompetencia] = useState<string>('');

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await fetch('/data/municipios/index.json');
        const data = await res.json();

        setCompetencia(data.competencia);

        // Extrair HHI de cada município
        const municIndustry = data.municipios.map(
          (m: any) => ({
            codigoIbge: m.codigoIbge,
            nome: m.nome,
            hhi: m.hhi || 0,
            numeroProvedores: m.numeroProvedores || 0,
          }),
        );

        setMunicipios(municIndustry);
      } catch (err) {
        console.error('Erro ao carregar dados:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleMunicipioSelecionado = async (municipio: MunicipioHhi) => {
    try {
      // Carregar detalhes do município
      const slug = municipio.nome
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/\s+/g, '-');

      const res = await fetch(`/data/municipios/${slug}.json`);
      if (res.ok) {
        const data = await res.json();
        setDetalhesSelecionado({
          codigoIbge: data.codigoIbge,
          nome: data.nome,
          hhi: data.concentracao?.hhi || 0,
          cr1: data.concentracao?.cr1 || 0,
          cr3: data.concentracao?.cr3 || 0,
          numeroProvedores: data.ranking?.length || 0,
          totalAcessos: data.ranking?.[0]?.acessos || 0,
          lider: data.ranking?.[0]?.nome || '—',
          liderMarketShare: data.ranking?.[0]?.marketShare || 0,
        });
      }
    } catch (err) {
      console.error('Erro ao carregar detalhes:', err);
    }
  };

  if (loading) {
    return (
      <main className="space-y-8">
        <div className="text-grafite-400">Carregando mapa...</div>
      </main>
    );
  }

  return (
    <main className="space-y-8">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Concentração de Mercado (HHI)</h1>
        <p className="mt-2 text-sm text-grafite-400">
          Visualização do Índice Herfindahl-Hirschman por município
        </p>
        {competencia && (
          <p className="mt-1 text-xs text-grafite-500">Dados de competência {rotularCompetencia(competencia)}</p>
        )}
      </div>

      {/* Mapa */}
      <Secao titulo="Mapa de Concentração" descricao="Clique em um município para ver detalhes">
        {municipios.length > 0 && (
          <MapaCoropletaHhi municipios={municipios} onMunicipioSelecionado={handleMunicipioSelecionado} />
        )}
      </Secao>

      {/* Detalhes do município selecionado */}
      {detalhesSelecionado && (
        <Secao titulo="Detalhes do Município" descricao={detalhesSelecionado.nome}>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="cartao p-4">
              <p className="text-xs font-semibold uppercase text-grafite-400 mb-1">HHI</p>
              <p className="text-2xl font-bold text-marca-300">{inteiro(detalhesSelecionado.hhi)}</p>
              <p className="text-xs text-grafite-400 mt-1">{descreverHhi(detalhesSelecionado.hhi)}</p>
            </div>

            <div className="cartao p-4">
              <p className="text-xs font-semibold uppercase text-grafite-400 mb-1">CR1 (Líder)</p>
              <p className="text-2xl font-bold text-marca-300">{percentual(detalhesSelecionado.cr1, 1)}</p>
              <p className="text-xs text-grafite-400 mt-1">{detalhesSelecionado.lider}</p>
            </div>

            <div className="cartao p-4">
              <p className="text-xs font-semibold uppercase text-grafite-400 mb-1">CR3 (Top 3)</p>
              <p className="text-2xl font-bold text-marca-300">{percentual(detalhesSelecionado.cr3, 1)}</p>
              <p className="text-xs text-grafite-400 mt-1">Concentração top 3</p>
            </div>

            <div className="cartao p-4">
              <p className="text-xs font-semibold uppercase text-grafite-400 mb-1">Provedores</p>
              <p className="text-2xl font-bold text-marca-300">{inteiro(detalhesSelecionado.numeroProvedores)}</p>
              <p className="text-xs text-grafite-400 mt-1">Com cobertura</p>
            </div>
          </div>
        </Secao>
      )}

      {/* Interpretação */}
      <Secao titulo="Como Interpretar" descricao="Entenda o índice HHI">
        <div className="space-y-3">
          <div className="cartao p-4 border-l-4 border-green-500">
            <p className="font-semibold text-white text-sm">🟢 Desconcentrado (HHI &lt; 1.500)</p>
            <p className="text-xs text-grafite-400 mt-1">
              Muitos concorrentes de tamanhos similares. Mercado competitivo com oportunidades para novos
              entrantes.
            </p>
          </div>

          <div className="cartao p-4 border-l-4 border-yellow-500">
            <p className="font-semibold text-white text-sm">🟡 Moderado (1.500-2.500)</p>
            <p className="text-xs text-grafite-400 mt-1">
              Alguns concorrentes dominantes, mas mercado ainda competitivo. Oportunidades para consolidação.
            </p>
          </div>

          <div className="cartao p-4 border-l-4 border-red-500">
            <p className="font-semibold text-white text-sm">🔴 Concentrado (HHI &gt; 2.500)</p>
            <p className="text-xs text-grafite-400 mt-1">
              Um ou dois concorrentes dominantes. Mercado com baixa competição e possível monopólio.
            </p>
          </div>
        </div>
      </Secao>

      {/* Navegação */}
      <div className="flex gap-3">
        <Link href="/mapas">
          <button className="px-4 py-2 rounded bg-grafite-800 hover:bg-grafite-700 text-white text-sm transition">
            ← Voltar a Mapas
          </button>
        </Link>
        <Link href="/">
          <button className="px-4 py-2 rounded bg-grafite-800 hover:bg-grafite-700 text-white text-sm transition">
            ← Dashboard
          </button>
        </Link>
      </div>
    </main>
  );
}
