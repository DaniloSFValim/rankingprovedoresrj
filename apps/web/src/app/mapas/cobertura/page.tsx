'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { rotularCompetencia } from '@netrank/core';
import { Secao } from '@/componentes/Secao';
import { MapaCoropletaCobertura } from '@/componentes/MapaCoropletaCobertura';
import { percentual } from '@/lib/formato';

interface Provedor {
  id: string;
  nome: string;
  acessos: number;
}

interface MunicipioCobertura {
  codigoIbge: string;
  nome: string;
  cobertura: number;
}

interface DetalheProvedor {
  id: string;
  nome: string;
  acessos: number;
  marketShare: number;
  municipiosCobertos: number;
  coberturaTerritorial: number;
}

export default function MapaCobertura() {
  const [provedores, setProvedores] = useState<Provedor[]>([]);
  const [municipios, setMunicipios] = useState<MunicipioCobertura[]>([]);
  const [provedorSelecionado, setProvedorSelecionado] = useState<Provedor | null>(null);
  const [detalheProvedor, setDetalheProvedor] = useState<DetalheProvedor | null>(null);
  const [loading, setLoading] = useState(true);
  const [competencia, setCompetencia] = useState<string>('');

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await fetch('/data/municipios/index.json');
        const data = await res.json();

        setCompetencia(data.competencia);

        // Extrair lista de provedores do ranking estadual
        const provedoresList: Provedor[] = data.ranking.map((p: any) => ({
          id: p.id,
          nome: p.nome,
          acessos: p.acessos,
        }));

        setProvedores(provedoresList);

        // Selecionar primeiro provedor por padrão
        if (provedoresList.length > 0) {
          setProvedorSelecionado(provedoresList[0]);
        }
      } catch (err) {
        console.error('Erro ao carregar dados:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    if (!provedorSelecionado) return;

    const loadCoverageData = async () => {
      try {
        const slug = provedorSelecionado.nome
          .toLowerCase()
          .normalize('NFD')
          .replace(/[̀-ͯ]/g, '')
          .replace(/\s+/g, '-');

        const res = await fetch(`/data/provedores/${slug}.json`);
        if (res.ok) {
          const data = await res.json();

          // Calcular cobertura por município
          const coberturaMap = new Map<string, number>();

          if (data.ranking && Array.isArray(data.ranking)) {
            data.ranking.forEach((m: any) => {
              coberturaMap.set(m.codigoIbge, m.cobertura || 0);
            });
          }

          // Carregar índice de municípios para ter lista completa
          const indiceRes = await fetch('/data/municipios/index.json');
          const indiceData = await indiceRes.json();

          const municipiosCoberturaList = indiceData.municipios.map((m: any) => ({
            codigoIbge: m.codigoIbge,
            nome: m.nome,
            cobertura: coberturaMap.get(m.codigoIbge) || 0,
          }));

          setMunicipios(municipiosCoberturaList);

          // Calcular estatísticas do provedor
          const municipiosCobertos = municipiosCoberturaList.filter(
            (m: any) => m.cobertura > 0,
          ).length;
          const coberturaMédia =
            municipiosCoberturaList.reduce((sum: number, m: any) => sum + m.cobertura, 0) /
            municipiosCoberturaList.length;

          setDetalheProvedor({
            id: data.id || provedorSelecionado.id,
            nome: data.nome || provedorSelecionado.nome,
            acessos: data.acessos || provedorSelecionado.acessos,
            marketShare: data.marketShare || 0,
            municipiosCobertos,
            coberturaTerritorial: coberturaMédia,
          });
        }
      } catch (err) {
        console.error('Erro ao carregar dados de cobertura:', err);
      }
    };

    loadCoverageData();
  }, [provedorSelecionado]);

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
        <h1 className="text-3xl font-bold tracking-tight text-white">Cobertura de Provedores</h1>
        <p className="mt-2 text-sm text-grafite-400">
          Visualização da abrangência geográfica por provedor
        </p>
        {competencia && (
          <p className="mt-1 text-xs text-grafite-500">Dados de competência {rotularCompetencia(competencia)}</p>
        )}
      </div>

      {/* Seletor de Provedor */}
      {provedores.length > 0 && (
        <Secao titulo="Selecione um Provedor" descricao="Clique para visualizar cobertura">
          <div className="relative">
            <select
              value={provedorSelecionado?.id || ''}
              onChange={(e) => {
                const selecionado = provedores.find((p) => p.id === e.target.value);
                if (selecionado) setProvedorSelecionado(selecionado);
              }}
              className="w-full px-4 py-3 rounded bg-grafite-800 text-white border border-grafite-700 hover:border-grafite-600 focus:border-marca-500 focus:outline-none transition"
            >
              {provedores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome} — {p.acessos.toLocaleString('pt-BR')} acessos
                </option>
              ))}
            </select>
          </div>
        </Secao>
      )}

      {/* Mapa */}
      {municipios.length > 0 && (
        <Secao titulo="Mapa de Cobertura" descricao="Clique em um município para ver detalhes">
          <MapaCoropletaCobertura municipios={municipios} />
        </Secao>
      )}

      {/* Estatísticas do Provedor */}
      {detalheProvedor && (
        <Secao titulo="Estatísticas do Provedor" descricao={detalheProvedor.nome}>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="cartao p-4">
              <p className="text-xs font-semibold uppercase text-grafite-400 mb-1">Acessos Totais</p>
              <p className="text-2xl font-bold text-marca-300">
                {detalheProvedor.acessos.toLocaleString('pt-BR')}
              </p>
              <p className="text-xs text-grafite-400 mt-1">Conexões ativas</p>
            </div>

            <div className="cartao p-4">
              <p className="text-xs font-semibold uppercase text-grafite-400 mb-1">Market Share</p>
              <p className="text-2xl font-bold text-marca-300">{percentual(detalheProvedor.marketShare, 1)}</p>
              <p className="text-xs text-grafite-400 mt-1">Do total estadual</p>
            </div>

            <div className="cartao p-4">
              <p className="text-xs font-semibold uppercase text-grafite-400 mb-1">Municípios Cobertos</p>
              <p className="text-2xl font-bold text-marca-300">{detalheProvedor.municipiosCobertos}</p>
              <p className="text-xs text-grafite-400 mt-1">De 92 possíveis</p>
            </div>

            <div className="cartao p-4">
              <p className="text-xs font-semibold uppercase text-grafite-400 mb-1">Cobertura Média</p>
              <p className="text-2xl font-bold text-marca-300">
                {percentual(detalheProvedor.coberturaTerritorial, 1)}
              </p>
              <p className="text-xs text-grafite-400 mt-1">Territorial</p>
            </div>
          </div>
        </Secao>
      )}

      {/* Interpretação */}
      <Secao titulo="Como Interpretar" descricao="Entenda o mapa de cobertura">
        <div className="space-y-3">
          <div className="cartao p-4 border-l-4 border-red-500">
            <p className="font-semibold text-white text-sm">🔴 Sem Cobertura (0%)</p>
            <p className="text-xs text-grafite-400 mt-1">
              Provedor não está presente no município.
            </p>
          </div>

          <div className="cartao p-4 border-l-4 border-blue-300">
            <p className="font-semibold text-white text-sm">🔵 Cobertura Baixa (1-30%)</p>
            <p className="text-xs text-grafite-400 mt-1">
              Provedor presente em poucos localidades. Cobertura limitada dentro do município.
            </p>
          </div>

          <div className="cartao p-4 border-l-4 border-blue-500">
            <p className="font-semibold text-white text-sm">🔵 Cobertura Média (31-60%)</p>
            <p className="text-xs text-grafite-400 mt-1">
              Provedor com presença significativa. Cobertura regional estabelecida.
            </p>
          </div>

          <div className="cartao p-4 border-l-4 border-blue-900">
            <p className="font-semibold text-white text-sm">🔵 Cobertura Alta (61-90%)</p>
            <p className="text-xs text-grafite-400 mt-1">
              Provedor com forte presença. Cobertura generalizada no município.
            </p>
          </div>

          <div className="cartao p-4 border-l-4 border-purple-600">
            <p className="font-semibold text-white text-sm">🟣 Cobertura Total (91-100%)</p>
            <p className="text-xs text-grafite-400 mt-1">
              Provedor praticamente onipresente. Cobertura estadual consolidada.
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
