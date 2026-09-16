import Link from 'next/link';
import { Secao } from '@/componentes/Secao';
import { MARCA } from '@/lib/marca';

export const metadata = {
  title: `Mapas — Banda Larga Fixa no ${MARCA.uf}`,
  description:
    `Visualizações geográficas de concentração de mercado (HHI) e cobertura de provedores por município.`,
};

/**
 * Hub de mapas interativos (Phase 4) - Página de navegação
 */
export default function Mapas() {
  return (
    <main className="space-y-8">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Mapas Interativos</h1>
        <p className="mt-2 text-sm text-grafite-400">
          Visualizações geográficas de concentração e cobertura de banda larga no {MARCA.uf}
        </p>
      </div>

      {/* Mapas Disponíveis */}
      <Secao titulo="Explorar Mapas" descricao="Clique para visualizar dados por município">
        <div className="grid gap-4 md:grid-cols-2">
          {/* Coropleth HHI */}
          <Link href="/mapas/hhi">
            <div className="cartao p-6 hover:bg-grafite-800/60 transition cursor-pointer group">
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-semibold text-white group-hover:text-marca-300 transition">
                  📊 Concentração de Mercado (HHI)
                </h3>
                <span className="px-2 py-1 rounded bg-marca-500/20 text-marca-300 text-xs font-medium">
                  Coropleth
                </span>
              </div>
              <p className="text-sm text-grafite-400 mb-4">
                Visualize o nível de concentração (HHI) de cada município. Verde = Competição, Vermelho
                = Monopólio
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="inline-block px-2 py-1 rounded bg-grafite-700 text-grafite-300 text-xs">
                  Escala: &lt; 1.500 a &gt; 2.500
                </span>
                <span className="inline-block px-2 py-1 rounded bg-grafite-700 text-grafite-300 text-xs">
                  92 municípios
                </span>
              </div>
              <p className="mt-3 text-xs text-marca-400">→ Explorar mapa →</p>
            </div>
          </Link>

          {/* Cobertura de Provedores */}
          <Link href="/mapas/cobertura">
            <div className="cartao p-6 hover:bg-grafite-800/60 transition cursor-pointer group">
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-semibold text-white group-hover:text-marca-300 transition">
                  🌐 Cobertura de Provedores
                </h3>
                <span className="px-2 py-1 rounded bg-marca-500/20 text-marca-300 text-xs font-medium">
                  Comparativa
                </span>
              </div>
              <p className="text-sm text-grafite-400 mb-4">
                Selecione um provedor e veja sua cobertura geográfica. Azul = Baixa, Roxo = Total
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="inline-block px-2 py-1 rounded bg-grafite-700 text-grafite-300 text-xs">
                  Escala: 0% a 100%
                </span>
                <span className="inline-block px-2 py-1 rounded bg-grafite-700 text-grafite-300 text-xs">
                  ~800 provedores
                </span>
              </div>
              <p className="mt-3 text-xs text-marca-400">→ Explorar mapa →</p>
            </div>
          </Link>
        </div>
      </Secao>

      {/* Documentação */}
      <Secao titulo="Sobre os Mapas" descricao="Como interpretar as visualizações">
        <div className="space-y-4">
          <div className="cartao p-4">
            <h3 className="font-semibold text-white text-sm mb-2">📊 Mapa de HHI</h3>
            <p className="text-xs text-grafite-400 mb-2">
              O Índice Herfindahl-Hirschman (HHI) mede o nível de concentração de mercado:
            </p>
            <ul className="text-xs text-grafite-500 space-y-1 list-disc list-inside">
              <li>
                <strong>Desconcentrado</strong> (HHI &lt; 1.500): Mercado com muitos concorrentes
              </li>
              <li>
                <strong>Moderado</strong> (1.500-2.500): Mercado com algumas empresas dominantes
              </li>
              <li>
                <strong>Concentrado</strong> (HHI &gt; 2.500): Mercado com poucos concorrentes
              </li>
            </ul>
          </div>

          <div className="cartao p-4">
            <h3 className="font-semibold text-white text-sm mb-2">🌐 Mapa de Cobertura</h3>
            <p className="text-xs text-grafite-400 mb-2">
              Mostra em quantos municípios cada provedor está presente (percentual de cobertura):
            </p>
            <ul className="text-xs text-grafite-500 space-y-1 list-disc list-inside">
              <li>
                <strong>Baixa</strong> (1-30%): Provedor presente em poucos municípios
              </li>
              <li>
                <strong>Média</strong> (31-60%): Provedor com presença regional
              </li>
              <li>
                <strong>Alta</strong> (61-100%): Provedor com cobertura estadual
              </li>
            </ul>
          </div>
        </div>
      </Secao>

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
