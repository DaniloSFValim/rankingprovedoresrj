import { rotularCompetencia } from '@netrank/core';
import { Secao } from '@/componentes/Secao';
import { CorridaRanking } from '@/componentes/graficos/CorridaRanking';
import { lerCorrida, lerMeta, lerIndiceMunicipios, lerPerfilMunicipio } from '@/lib/dados';
import type { CidadeOpcao } from '@/componentes/SeletorCidade';
import { MARCA } from '@/lib/marca';

export const metadata = {
  title: `A corrida do ranking — provedores do ${MARCA.uf}`,
  description:
    `Como o ranking dos provedores de banda larga fixa do ${MARCA.uf} mudou mês a ` +
    `mês, segundo os dados da Anatel.`,
};

export default function PaginaCorrida() {
  const corrida = lerCorrida();
  const meta = lerMeta();

  // Mapear quais empresas atuam em quais municípios
  const municipios = lerIndiceMunicipios();
  const cidades: CidadeOpcao[] = municipios.map((m) => ({
    slug: m.slug,
    nome: m.nome,
    totalAcessos: m.totalAcessos,
    numeroProvedores: m.numeroProvedores,
  }));

  const empresasPorMunicipio = new Map<string, Set<string>>();

  for (const municipio of municipios) {
    const perfil = lerPerfilMunicipio(municipio.slug);
    if (perfil && perfil.ranking) {
      if (!empresasPorMunicipio.has(municipio.slug)) {
        empresasPorMunicipio.set(municipio.slug, new Set());
      }
      for (const linha of perfil.ranking) {
        empresasPorMunicipio.get(municipio.slug)!.add(linha.empresaId);
      }
    }
  }

  // Converter para formato serializável (Set não é)
  const mapaMunicipioEmpresas: Record<string, string[]> = {};
  for (const [slug, empresas] of empresasPorMunicipio) {
    mapaMunicipioEmpresas[slug] = Array.from(empresas);
  }

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
          A corrida do ranking
        </h1>
        <p className="mt-1 text-sm text-grafite-400">
          Posição dos maiores provedores do {MARCA.ufSigla} em cada competência, de{' '}
          {rotularCompetencia(meta.competencias[0]!)} a{' '}
          {rotularCompetencia(meta.competenciaAtual)}
        </p>
      </div>

      <div className="space-y-4">
        <div className="text-xs font-bold uppercase tracking-wide text-marca-400">Posição no Ranking ao Longo do Tempo</div>
        <div className="cartao p-4">
          <CorridaRanking
            corrida={corrida}
            mapaMunicipioEmpresas={mapaMunicipioEmpresas}
            cidades={cidades}
          />
        </div>
      </div>

      <Secao titulo="Como interpretar o gráfico" descricao="Guia de leitura para entender os movimentos no ranking">
        <ul className="cartao space-y-2 p-5 text-sm text-grafite-300">
          <li>
            O eixo vertical está invertido: a 1ª posição fica no topo, como num pódio.
          </li>
          <li>
            Uma linha que <span className="text-alta">sobe</span> significa ganho de
            posições; uma que <span className="text-baixa">desce</span>, perda.
          </li>
          <li>
            A seleção de Top 5, 10 ou 20 usa as posições da{' '}
            <strong>competência mais recente</strong>. Um provedor que caiu para fora
            do recorte deixa de ser exibido, ainda que aparecesse no passado.
          </li>
          <li>
            Uma linha interrompida indica que o provedor não tinha acessos registrados
            naquele mês — ausência de dado, não posição zero.
          </li>
        </ul>
      </Secao>
    </main>
  );
}
