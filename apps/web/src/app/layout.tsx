import type { Metadata } from 'next';
import './globals.css';
import { Navegacao } from '@/componentes/Navegacao';
import type { ItemBusca } from '@/componentes/BuscaAvancada';
import { FaixaDemonstrativo, RodapeProcedencia } from '@/componentes/Procedencia';
import { CidadeSelecionadaProvider } from '@/contextos/CidadeSelecionada';
import { artefatosDisponiveis, lerIndiceMunicipios, lerMeta, lerIndiceProvedores } from '@/lib/dados';
import { MARCA } from '@/lib/marca';

export const metadata: Metadata = {
  title: {
    default: `${MARCA.nome} — ${MARCA.subtitulo}`,
    template: `%s — ${MARCA.nome}`,
  },
  description: MARCA.descricaoCurta,
  openGraph: {
    title: `${MARCA.nome} — ${MARCA.subtitulo}`,
    description: MARCA.descricaoCurta,
    locale: 'pt_BR',
    type: 'website',
  },
};

/**
 * Tela exibida quando o ETL ainda nao rodou. Instrui em vez de quebrar —
 * um build sem dados e erro de operacao, nao de codigo.
 */
function SemDados() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-24">
      <h1 className="text-2xl font-bold text-white">Sem dados carregados</h1>
      <p className="mt-4 text-grafite-300">
        Os artefatos analíticos ainda não foram gerados. Rode o pipeline:
      </p>
      <pre className="mt-4 overflow-x-auto rounded-lg border border-grafite-800 bg-grafite-900 p-4 text-sm text-marca-300">
{`# dados reais da Anatel
npm run etl -- descobrir
npm run etl -- atualizar <url-do-recurso>

# ou fixture sintética para desenvolvimento
npm run etl -- demo`}
      </pre>
    </main>
  );
}

export default function LayoutRaiz({ children }: { children: React.ReactNode }) {
  if (!artefatosDisponiveis()) {
    return (
      <html lang="pt-BR" className="dark">
        <body><SemDados /></body>
      </html>
    );
  }

  const meta = lerMeta();
  const cidades = lerIndiceMunicipios().map((m) => ({
    slug: m.slug,
    nome: m.nome,
    totalAcessos: m.totalAcessos,
    numeroProvedores: m.numeroProvedores,
  }));

  const itensBusca: ItemBusca[] = [
    ...cidades.map((c) => ({
      id: `municipio-${c.slug}`,
      titulo: c.nome,
      descricao: `${c.numeroProvedores} provedores`,
      categoria: 'municipio' as const,
      href: `/municipios/${c.slug}/`,
      texto: c.nome,
    })),
    ...lerIndiceProvedores().map((p) => ({
      id: `provedor-${p.slug}`,
      titulo: p.nome,
      descricao: `${p.municipiosAtendidos || 0} municípios`,
      categoria: 'provedor' as const,
      href: `/provedores/${p.slug}/`,
      texto: p.nome,
    })),
    { id: 'pagina-ranking', titulo: 'Ranking', categoria: 'pagina' as const, href: '/ranking/', texto: 'Ranking' },
    { id: 'pagina-crescimento', titulo: 'Crescimento', categoria: 'pagina' as const, href: '/crescimento/', texto: 'Crescimento' },
    { id: 'pagina-municipios', titulo: 'Municípios', categoria: 'pagina' as const, href: '/municipios/', texto: 'Municípios' },
    { id: 'pagina-provedores', titulo: 'Provedores', categoria: 'pagina' as const, href: '/provedores/', texto: 'Provedores' },
  ];

  return (
    <html lang="pt-BR" className="dark">
      <body className="min-h-screen bg-grafite-950">
        <CidadeSelecionadaProvider>
          <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-marca-600 focus:px-4 focus:py-2 focus:rounded-md focus:text-white focus:font-semibold">
            Ir para conteúdo principal
          </a>
          <FaixaDemonstrativo meta={meta} />
          <Navegacao meta={meta} cidades={cidades} itensBusca={itensBusca} />
          <main id="main-content" className="mx-auto max-w-7xl px-4 py-6 focus:outline-none">
            {children}
          </main>
          <RodapeProcedencia meta={meta} />
        </CidadeSelecionadaProvider>
      </body>
    </html>
  );
}
