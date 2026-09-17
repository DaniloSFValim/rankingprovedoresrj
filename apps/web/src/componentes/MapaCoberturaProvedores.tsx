'use client';

import { useEffect, useMemo, useState } from 'react';
import * as echarts from 'echarts';
import type { EChartsOption } from 'echarts';
import { Grafico } from '@/componentes/Grafico';
import type { MunicipioIndice } from '@/lib/dados';

interface MapaCoberturaProps {
  municipios: MunicipioIndice[];
}

export function MapaCoberturaProvedores({ municipios }: MapaCoberturaProps) {
  const [geoJsonMap, setGeoJsonMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/data/malhas/rj-municipios.json')
      .then((res) => res.json())
      .then((data) => {
        echarts.registerMap('RJ', data);
        setGeoJsonMap(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Erro ao carregar mapa:', err);
        setLoading(false);
      });
  }, []);

  const opcao = useMemo<EChartsOption>(() => {
    if (!geoJsonMap || !geoJsonMap.features) {
      return {};
    }

    // Agrupar provedores por município usando código IBGE
    const dadosPorIbge = new Map<string, { nome: string; numeroProvedores: number }>();
    for (const municipio of municipios) {
      dadosPorIbge.set(municipio.codigoIbge, {
        nome: municipio.nome,
        numeroProvedores: municipio.numeroProvedores,
      });
    }

    // Preparar dados para o mapa
    const serieData = geoJsonMap.features.map((feature: any) => {
      const codigo = feature.properties?.adm2_id;
      const dados = dadosPorIbge.get(codigo);
      return {
        name: feature.properties?.adm2_name || feature.properties?.name,
        value: dados?.numeroProvedores ?? 0,
      };
    });

    return {
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c} provedores',
      },
      visualMap: {
        min: 0,
        max: Math.max(...municipios.map((m) => m.numeroProvedores), 1),
        splitNumber: 5,
        inRange: {
          color: ['#0c2d3a', '#0e7490', '#22d3ee', '#a5f3fc', '#06b6d4'],
        },
        textStyle: {
          color: '#cbd5e1',
        },
      },
      series: [
        {
          name: 'Provedores',
          type: 'map',
          map: 'RJ',
          data: serieData,
          roam: false,
          label: {
            show: false,
          },
          itemStyle: {
            borderColor: '#334155',
            borderWidth: 1,
            areaColor: '#1e293b',
          },
          emphasis: {
            itemStyle: {
              areaColor: '#0e7490',
            },
          },
        },
      ],
    };
  }, [geoJsonMap, municipios]);

  if (loading) {
    return (
      <div className="cartao p-8 text-center">
        <div className="text-grafite-400">Carregando mapa...</div>
      </div>
    );
  }

  return (
    <div className="cartao p-4">
      <Grafico
        opcao={opcao}
        altura={400}
        descricao="Distribuição de provedores de banda larga fixa pelos municípios do Rio de Janeiro. Cores mais intensas indicam maior número de provedores."
      />
    </div>
  );
}
