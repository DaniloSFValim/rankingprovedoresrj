/**
 * Alertas de qualidade dos dados por município. São sinais para verificação,
 * não correções: nenhum número é alterado por causa deles.
 *
 * - saida-abrupta: prestadora relevante some do município de um mês para o
 *   outro. Em Itaboraí (jul/2026) a Fiber Vox levou 46% da base sem aparecer
 *   em nenhum outro município: falha de envio à Anatel, não perda de clientes.
 * - densidade-implausivel: mais acessos residenciais que domicílios, ou
 *   densidade muito baixa ao lado de um vizinho acima de 100. Padrão típico de
 *   prestadora que declara na cidade-sede clientes dos municípios vizinhos
 *   (ex.: Paracambi 107 cercada por Engenheiro Paulo de Frontin 3,7 e Mendes 9,2).
 */

export type Alerta =
  | {
      tipo: 'saida-abrupta';
      empresaId: string;
      nome: string;
      acessosAnteriores: number;
      /** Parcela da base do mês anterior que a prestadora representava (0–100). */
      percentualDaBase: number;
      /** Municípios em que a prestadora ainda aparece na competência atual. */
      municipiosAtuais: number;
    }
  | {
      tipo: 'densidade-acima-100';
      densidade: number;
      vizinhosBaixos: Array<{ codigoIbge: string; nome: string; densidade: number }>;
    }
  | {
      tipo: 'densidade-muito-baixa';
      densidade: number;
      vizinhosAltos: Array<{ codigoIbge: string; nome: string; densidade: number }>;
    };

export const LIMITES = {
  /** Fração mínima da base anterior para uma saída contar como abrupta. */
  fracaoSaida: 0.2,
  /** Piso absoluto, para não alertar em municípios minúsculos. */
  acessosMinimosSaida: 100,
  densidadeAlta: 100,
  densidadeBaixa: 15,
} as const;

export function alertasDeSaida(
  saidas: Array<{ empresaId: string; nome: string; acessosAnteriores: number }>,
  totalAnterior: number,
  municipiosPorEmpresa: Map<string, number>,
): Alerta[] {
  if (totalAnterior <= 0) return [];
  return saidas
    .filter(
      (s) =>
        s.acessosAnteriores >= LIMITES.acessosMinimosSaida &&
        s.acessosAnteriores / totalAnterior >= LIMITES.fracaoSaida,
    )
    .map((s) => ({
      tipo: 'saida-abrupta' as const,
      empresaId: s.empresaId,
      nome: s.nome,
      acessosAnteriores: s.acessosAnteriores,
      percentualDaBase: (s.acessosAnteriores / totalAnterior) * 100,
      municipiosAtuais: municipiosPorEmpresa.get(s.empresaId) ?? 0,
    }));
}

type Malha = {
  features: Array<{ properties: { name: string }; geometry: { coordinates: unknown } }>;
};

/**
 * Vizinhança pela malha do IBGE: dois municípios são vizinhos quando as
 * fronteiras compartilham ao menos dois vértices (um só é contato em ponto).
 */
export function vizinhancaDaMalha(malha: Malha): Map<string, Set<string>> {
  const donos = new Map<string, Set<string>>();
  for (const f of malha.features) {
    const codigo = String(f.properties.name);
    const visitar = (v: unknown): void => {
      if (!Array.isArray(v)) return;
      if (typeof v[0] === 'number') {
        const chave = `${(v[0] as number).toFixed(4)},${(v[1] as number).toFixed(4)}`;
        let s = donos.get(chave);
        if (!s) donos.set(chave, (s = new Set()));
        s.add(codigo);
      } else v.forEach(visitar);
    };
    visitar(f.geometry.coordinates);
  }
  const contagem = new Map<string, Map<string, number>>();
  for (const codigos of donos.values()) {
    if (codigos.size < 2) continue;
    for (const a of codigos)
      for (const b of codigos) {
        if (a === b) continue;
        let m = contagem.get(a);
        if (!m) contagem.set(a, (m = new Map()));
        m.set(b, (m.get(b) ?? 0) + 1);
      }
  }
  const vizinhos = new Map<string, Set<string>>();
  for (const [a, m] of contagem)
    vizinhos.set(a, new Set([...m].filter(([, n]) => n >= 2).map(([b]) => b)));
  return vizinhos;
}

export function alertasDeDensidade(
  codigoIbge: string,
  densidades: Map<string, { nome: string; densidade: number | null }>,
  vizinhos: Map<string, Set<string>>,
): Alerta[] {
  const propria = densidades.get(codigoIbge)?.densidade;
  if (propria === null || propria === undefined) return [];
  const doEntorno = [...(vizinhos.get(codigoIbge) ?? [])]
    .map((c) => ({ codigoIbge: c, nome: densidades.get(c)?.nome ?? c, densidade: densidades.get(c)?.densidade ?? null }))
    .filter((v): v is { codigoIbge: string; nome: string; densidade: number } => v.densidade !== null);

  if (propria > LIMITES.densidadeAlta) {
    return [
      {
        tipo: 'densidade-acima-100',
        densidade: propria,
        vizinhosBaixos: doEntorno.filter((v) => v.densidade < LIMITES.densidadeBaixa),
      },
    ];
  }
  const vizinhosAltos = doEntorno.filter((v) => v.densidade > LIMITES.densidadeAlta);
  if (propria < LIMITES.densidadeBaixa && vizinhosAltos.length > 0) {
    return [{ tipo: 'densidade-muito-baixa', densidade: propria, vizinhosAltos }];
  }
  return [];
}
