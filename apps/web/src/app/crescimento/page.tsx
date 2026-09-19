import { lerIndiceMunicipios, lerMovimentacoes, lerRankingEstadual, lerMeta, lerPerfilMunicipio } from '@/lib/dados';
import { PaginaCrescimentoCliente } from './cliente';

export default function PaginaCrescimento() {
  const cidades = lerIndiceMunicipios().map((m) => ({
    slug: m.slug,
    nome: m.nome,
    totalAcessos: m.totalAcessos,
    numeroProvedores: m.numeroProvedores,
  }));

  // Load state-level data once on the server
  const movimentacoes = lerMovimentacoes();
  const ranking = lerRankingEstadual();
  const meta = lerMeta();

  // Pre-load all municipal profiles so they can be accessed client-side
  const municipiosPerfis = Object.fromEntries(
    cidades.map((c) => [c.slug, lerPerfilMunicipio(c.slug)]),
  );

  return (
    <PaginaCrescimentoCliente
      cidades={cidades}
      movimentacoes={movimentacoes}
      ranking={ranking}
      meta={meta}
      municipiosPerfis={municipiosPerfis}
    />
  );
}
