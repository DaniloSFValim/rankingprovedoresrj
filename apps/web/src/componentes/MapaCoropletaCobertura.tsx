'use client';

import { useEffect, useRef, useState } from 'react';
import { obterCorCobertura, obterEstiloFeature, legendaCobertura } from '@/lib/mapas';

interface MunicipioCobertura {
  codigoIbge: string;
  nome: string;
  cobertura: number;
}

interface MapaCoropletaCoberturaProps {
  municipios: MunicipioCobertura[];
  onMunicipioSelecionado?: (municipio: MunicipioCobertura) => void;
}

export function MapaCoropletaCobertura({
  municipios,
  onMunicipioSelecionado,
}: MapaCoropletaCoberturaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [geoJson, setGeoJson] = useState<any>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; html: string } | null>(null);

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

  useEffect(() => {
    if (!geoJson || !containerRef.current) return;

    const mapDiv = containerRef.current;
    const width = mapDiv.clientWidth;
    const height = mapDiv.clientHeight;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svg.style.width = '100%';
    svg.style.height = '100%';
    svg.style.backgroundColor = '#f0f9ff';

    mapDiv.innerHTML = '';
    mapDiv.appendChild(svg);

    const project = (lon: number, lat: number): [number, number] => {
      const x = ((lon + 48) / 6) * width;
      const y = ((23 - lat) / 3) * height;
      return [x, y];
    };

    const coberturaMap = new Map(municipios.map((m) => [m.codigoIbge, m]));

    geoJson.features.forEach((feature: any) => {
      const codigoIbge = feature.properties.codigoIbge;
      const municipio = coberturaMap.get(codigoIbge);
      const cor = municipio ? obterCorCobertura(municipio.cobertura) : '#e5e7eb';

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
          path.setAttribute('fill-opacity', '0.8');
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
                  <div class="text-xs text-grafite-600">Cobertura: ${municipio.cobertura.toFixed(1)}%</div>
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
        <p className="text-sm font-semibold text-white mb-3">Legenda - Cobertura (%)</p>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {legendaCobertura.map((item) => (
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
