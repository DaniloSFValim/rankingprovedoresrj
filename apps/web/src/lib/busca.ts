import type { ItemBusca } from '@/componentes/BuscaAvancada';
import { lerIndiceMunicipios, lerRankingEstadual } from '@/lib/dados';
import { cnpjFormatado } from '@/lib/formato';
import { ehRepetido, nomesRepetidos } from '@/lib/homonimos';

/**
 * Índice da busca do cabeçalho: municípios, provedores e páginas.
 *
 * Fica num arquivo próprio (/busca.json) carregado quando a busca é usada.
 * Embutido no layout, ele somava cerca de 200 KB a cada uma das mais de mil
 * páginas do site.
 */
export function montarIndiceBusca(): ItemBusca[] {
  const cidades = lerIndiceMunicipios();
  const provedores = lerRankingEstadual();
  const repetidos = nomesRepetidos(provedores);

  return [
    ...cidades.map((c) => ({
      id: `municipio-${c.slug}`,
      titulo: c.nome,
      descricao: `${c.numeroProvedores} provedores`,
      categoria: 'municipio' as const,
      href: `/municipios/${c.slug}/`,
      texto: c.nome,
    })),
    ...provedores.map((p) => {
      const municipios = `${p.municipiosAtendidos || 0} ${p.municipiosAtendidos === 1 ? 'município' : 'municípios'}`;
      return {
        id: `provedor-${p.slug}`,
        titulo: p.nome,
        descricao: ehRepetido(repetidos, p.nome) && p.cnpj ? `CNPJ ${cnpjFormatado(p.cnpj)}` : municipios,
        categoria: 'provedor' as const,
        href: `/provedores/${p.slug}/`,
        texto: p.cnpj ? `${p.nome} ${p.cnpj}` : p.nome,
      };
    }),
    { id: 'pagina-ranking', titulo: 'Ranking', categoria: 'pagina' as const, href: '/ranking/', texto: 'Ranking' },
    { id: 'pagina-crescimento', titulo: 'Crescimento', categoria: 'pagina' as const, href: '/crescimento/', texto: 'Crescimento' },
    { id: 'pagina-municipios', titulo: 'Municípios', categoria: 'pagina' as const, href: '/municipios/', texto: 'Municípios' },
    { id: 'pagina-provedores', titulo: 'Provedores', categoria: 'pagina' as const, href: '/provedores/', texto: 'Provedores' },
  ];
}
