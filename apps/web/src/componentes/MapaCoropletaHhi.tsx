'use client';

import { useEffect, useRef, useState } from 'react';
import { obterCorHhi, obterOpacidade, legendaHhi } from '@/lib/mapas';

interface MunicipioHhi {
  codigoIbge: string;
  nome: string;
  hhi: number;
  numeroProvedores: number;
}

interface MapaCoropletaHhiProps {
  municipios: MunicipioHhi[];
  onMunicipioSelecionado?: (municipio: MunicipioHhi) => void;
}

/**
 * Componente para visualizar coropleth de HHI por município
 * Usa HTML5 Canvas para melhor performance
 */
export function MapaCoropletaHhi({
  municipios,
  onMunicipioSelecionado,
}: MapaCoropletaHhiProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [geoJson, setGeoJson] = useState<any>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; html: string } | null>(null);

  // Carregar GeoJSON
  useEffect(() => {
    fetch('/data/malhas/rj-municipios.json')
      .then((res) => res.json())
      .then((data) => {
        setGeoJson(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Erro ao carregar GeoJSON:', err);
        setLoading(false);
      });
  }, []);

  // Renderizar mapa quando GeoJSON carregar
  useEffect(() => {
    if (!geoJson || !containerRef.current) return;

    const mapDiv = containerRef.current;
    const width = mapDiv.clientWidth;
    const height = mapDiv.clientHeight;

    // Criar mapa com SVG (mais leve que Leaflet para static export)
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svg.style.width = '100%';
    svg.style.height = '100%';
    svg.style.backgroundColor = '#f0f9ff';

    // Limpar conteúdo anterior
    mapDiv.innerHTML = '';
    mapDiv.appendChild(svg);

    // Projeção simples mercator para RJ
    const project = (lon: number, lat: number): [number, number] => {
      const x = ((lon + 48) / 6) * width;
      const y = ((23 - lat) / 3) * height;
      return [x, y];
    };

    // Criar mapa de HHI para lookup rápido
    const hhiMap = new Map(municipios.map((m) => [m.codigoIbge, m]));

    // Renderizar features
    geoJson.features.forEach((feature: any) => {
      const codigoIbge = feature.properties.codigoIbge;
      const municipio = hhiMap.get(codigoIbge);
      const cor = municipio ? obterCorHhi(municipio.hhi) : '#e5e7eb';
      const opacidade = municipio ? obterOpacidade(municipio.numeroProvedores) : 0.3;

      // Renderizar polígonos (simplificado para performance)
      if (feature.geometry.type === 'MultiPolygon') {
        feature.geometry.coordinates.forEach((polygon: any) => {
          const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          const pathData = polygon[0]
            .map((coord: [number, number], idx: number) => {
              const [x, y] = project(coord[0], coord[1]);
              return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
            })
            .join(' ');

          path.setAttribute('d', pathData + ' Z');
          path.setAttribute('fill', cor);
          path.setAttribute('fill-opacity', opacidade.toString());
          path.setAttribute('stroke', '#6b7280');
          path.setAttribute('stroke-width', '0.5');
          path.style.cursor = 'pointer';

          if (municipio) {
            path.onmouseover = (e) => {
              path.setAttribute('stroke-width', '1.5');
              path.setAttribute('stroke', '#000');
              const rect = mapDiv.getBoundingClientRect();
              setTooltip({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
                html: `
                  <div class="font-semibold">${municipio.nome}</div>
                  <div class="text-xs text-grafite-600">HHI: ${municipio.hhi.toFixed(0)}</div>
                  <div class="text-xs text-grafite-600">Provedores: ${municipio.numeroProvedores}</div>
                `,
              });
            };
            path.onmouseout = () => {
              path.setAttribute('stroke-width', '0.5');
              path.setAttribute('stroke', '#6b7280');
              setTooltip(null);
            };
            path.onclick = () => {
              onMunicipioSelecionado?.(municipio);
            };
          }

          svg.appendChild(path);
        });
      }
    });
  }, [geoJson, municipios, onMunicipioSelecionado]);

  if (loading) {
    return (
      <div className="w-full h-96 bg-grafite-200 rounded flex items-center justify-center">
        <div className="text-grafite-600">Carregando mapa...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div ref={containerRef} className="w-full h-96 bg-blue-50 rounded border border-grafite-300" />

      {tooltip && (
        <div
          className="absolute bg-white p-2 rounded shadow-lg text-xs z-50 border border-grafite-300"
          style={{ left: `${tooltip.x}px`, top: `${tooltip.y}px` }}
          dangerouslySetInnerHTML={{ __html: tooltip.html }}
        />
      )}

      {/* Legenda */}
      <div className="cartao p-4">
        <p className="text-sm font-semibold text-white mb-3">Legenda - HHI (Concentração)</p>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {legendaHhi.map((item) => (
            <div key={item.faixa} className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded border border-grafite-400"
                style={{ backgroundColor: item.cor }}
              />
              <div className="text-xs">
                <p className="font-medium text-grafite-200">{item.label}</p>
                <p className="text-grafite-500">{item.faixa}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
