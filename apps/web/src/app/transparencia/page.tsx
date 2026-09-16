import { MARCA } from '@/lib/marca';

export const metadata = {
  title: `Transparência e Metodologia — NETRANK ${MARCA.uf}`,
  description:
    `Documentação completa sobre fontes de dados, metodologia de cálculo, ` +
    `rastreabilidade, e como interpretar os indicadores de banda larga fixa.`,
};

export default function PaginaTransparencia() {
  return (
    <main className="space-y-8">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Transparência e Metodologia
        </h1>
        <p className="mt-2 text-grafite-400">
          Documentação completa sobre fontes, processamento e cálculos dos dados de banda larga
          fixa no {MARCA.uf}
        </p>
      </div>

      {/* Seção 1: Fonte de Dados */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-0.5 flex-1 bg-gradient-to-r from-marca-500 to-transparent" />
          <h2 className="text-xl font-bold text-white">1. Fonte de Dados</h2>
          <div className="h-0.5 flex-1 bg-gradient-to-l from-marca-500 to-transparent" />
        </div>

        <div className="cartao space-y-4 p-5">
          <div>
            <h3 className="font-semibold text-white">Autoridade Reguladora</h3>
            <p className="mt-1 text-sm text-grafite-300">
              Todos os dados originam-se da <strong>Agência Nacional de Telecomunicações (Anatel)</strong>
              , autarquia federal responsável pela regulação do setor de telecomunicações no Brasil.
            </p>
          </div>

          <div className="border-t border-grafite-800 pt-4">
            <h3 className="font-semibold text-white">Recurso: Demonstrativo Banda Larga Fixa</h3>
            <p className="mt-1 text-sm text-grafite-300">
              Base de dados pública mensal com registros de acessos de banda larga fixa por
              prestadora, UF e município. Publicado tipicamente entre os dias 10-15 do mês
              seguinte ao da competência.
            </p>
            <div className="mt-2 text-xs text-grafite-500">
              Acesso: <a href="https://dados.gov.br" className="underline hover:text-grafite-400">dados.gov.br</a> | Frequência: Mensal
            </div>
          </div>

          <div className="border-t border-grafite-800 pt-4">
            <h3 className="font-semibold text-white">Cobertura Geográfica</h3>
            <p className="mt-1 text-sm text-grafite-300">
              Dados aggregados para o estado do {MARCA.uf}, desagregados por município. Incluem
              todas as 92 municipalidades do estado.
            </p>
          </div>

          <div className="border-t border-grafite-800 pt-4">
            <h3 className="font-semibold text-white">Garantia de Atualidade</h3>
            <p className="mt-1 text-sm text-grafite-300">
              NETRANK sincroniza automaticamente com a Anatel todo dia 12 do mês às 09:00 UTC.
              Se novos dados foram publicados, a plataforma é atualizada em menos de 1 hora.
            </p>
          </div>
        </div>
      </section>

      {/* Seção 2: Pipeline de Processamento */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-0.5 flex-1 bg-gradient-to-r from-marca-500 to-transparent" />
          <h2 className="text-xl font-bold text-white">2. Pipeline de Processamento</h2>
          <div className="h-0.5 flex-1 bg-gradient-to-l from-marca-500 to-transparent" />
        </div>

        <div className="cartao p-5">
          <p className="mb-4 text-sm text-grafite-300">
            Os dados Anatel passam por 3 camadas de transformação, cada uma versionada:
          </p>

          <div className="space-y-3">
            <div className="flex gap-3 rounded bg-grafite-900 p-3">
              <div className="flex-shrink-0">
                <span className="inline-flex items-center justify-center rounded-full bg-marca-600 px-3 py-1 text-xs font-bold text-white">
                  RAW
                </span>
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-white">Camada 1: Dados Brutos</h4>
                <p className="mt-1 text-xs text-grafite-400">
                  Arquivo CSV original da Anatel, armazenado no git. Nunca modificado, apenas
                  versionado para rastreabilidade histórica completa.
                </p>
              </div>
            </div>

            <div className="flex gap-3 rounded bg-grafite-900 p-3">
              <div className="flex-shrink-0">
                <span className="inline-flex items-center justify-center rounded-full bg-marca-600 px-3 py-1 text-xs font-bold text-white">
                  PROCESSED
                </span>
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-white">Camada 2: Normalização</h4>
                <p className="mt-1 text-xs text-grafite-400">
                  Extração, validação e carga em SQLite. Inclui normalização de nomes de
                  prestadoras, validação de CNPJs e identificação de entidades económicas.
                  Sem alterações semânticas, apenas limpeza estrutural.
                </p>
              </div>
            </div>

            <div className="flex gap-3 rounded bg-grafite-900 p-3">
              <div className="flex-shrink-0">
                <span className="inline-flex items-center justify-center rounded-full bg-marca-600 px-3 py-1 text-xs font-bold text-white">
                  DERIVED
                </span>
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-white">Camada 3: Indicadores Calculados</h4>
                <p className="mt-1 text-xs text-grafite-400">
                  Artefatos JSON para BI: rankings, séries históricas, indicadores de
                  concentração (HHI, CR5), participação de mercado. Todos com rastreabilidade
                  de origem e versão.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Seção 3: Definições e Indicadores */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-0.5 flex-1 bg-gradient-to-r from-marca-500 to-transparent" />
          <h2 className="text-xl font-bold text-white">3. Definições dos Indicadores</h2>
          <div className="h-0.5 flex-1 bg-gradient-to-l from-marca-500 to-transparent" />
        </div>

        <div className="space-y-3">
          <div className="cartao p-4">
            <h3 className="font-semibold text-white">Market Share (Participação de Mercado)</h3>
            <p className="mt-2 text-sm text-grafite-300">
              Percentual de acessos da prestadora em relação ao total do estado (ou município).
              Calculado como: <code className="text-xs font-mono text-grafite-400">(acessos_prestadora / total_acessos) × 100%</code>
            </p>
          </div>

          <div className="cartao p-4">
            <h3 className="font-semibold text-white">Índice de Concentração (HHI)</h3>
            <p className="mt-2 text-sm text-grafite-300">
              Índice Herfindahl-Hirschman que mede concentração de mercado. Calculado como:
              <code className="text-xs font-mono text-grafite-400">Σ(market_share_i)²</code>
            </p>
            <ul className="mt-2 space-y-1 text-xs text-grafite-400">
              <li>• 0-1,500: Mercado desconcentrado (concorrência alta)</li>
              <li>• 1,500-2,500: Mercado moderadamente concentrado</li>
              <li>• Acima de 2,500: Mercado concentrado (preocupação regulatória)</li>
              <li>• Acima de 5,000: Mercado altamente concentrado</li>
            </ul>
          </div>

          <div className="cartao p-4">
            <h3 className="font-semibold text-white">Razões de Concentração (CR)</h3>
            <p className="mt-2 text-sm text-grafite-300">
              CR<sub>n</sub> = soma dos market shares das n maiores prestadoras.
            </p>
            <ul className="mt-2 space-y-1 text-xs text-grafite-400">
              <li>• CR1: Participação do maior provedor</li>
              <li>• CR3: Participação dos 3 maiores</li>
              <li>• CR5: Participação dos 5 maiores</li>
              <li>• CR10: Participação dos 10 maiores</li>
            </ul>
          </div>

          <div className="cartao p-4">
            <h3 className="font-semibold text-white">Acessos (Conexões Ativas)</h3>
            <p className="mt-2 text-sm text-grafite-300">
              Número de conexões de banda larga fixa ativas registradas no final do mês de
              competência. Inclui qualquer velocidade (1 Mbps até Gigabit).
            </p>
          </div>
        </div>
      </section>

      {/* Seção 4: Rastreabilidade */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-0.5 flex-1 bg-gradient-to-r from-marca-500 to-transparent" />
          <h2 className="text-xl font-bold text-white">4. Rastreabilidade Completa</h2>
          <div className="h-0.5 flex-1 bg-gradient-to-l from-marca-500 to-transparent" />
        </div>

        <div className="cartao p-5">
          <p className="text-sm text-grafite-300">
            Cada artefato de dados publicado contém metadados de rastreabilidade que permitem
            verificar:
          </p>

          <ul className="mt-3 space-y-2 text-sm text-grafite-300">
            <li className="flex gap-2">
              <span className="flex-shrink-0 text-marca-400">✓</span>
              <span>
                <strong>Origem:</strong> Anatel (dados oficiais, 100% públicos)
              </span>
            </li>
            <li className="flex gap-2">
              <span className="flex-shrink-0 text-marca-400">✓</span>
              <span>
                <strong>Data de Download:</strong> Quando foi baixado da Anatel
              </span>
            </li>
            <li className="flex gap-2">
              <span className="flex-shrink-0 text-marca-400">✓</span>
              <span>
                <strong>Versão do Pipeline:</strong> Código do ETL que processou os dados
              </span>
            </li>
            <li className="flex gap-2">
              <span className="flex-shrink-0 text-marca-400">✓</span>
              <span>
                <strong>Commit Git:</strong> Hash do código exato que gerou o resultado
              </span>
            </li>
            <li className="flex gap-2">
              <span className="flex-shrink-0 text-marca-400">✓</span>
              <span>
                <strong>Integridade (SHA-256):</strong> Hash criptográfico de cada arquivo
              </span>
            </li>
          </ul>

          <p className="mt-4 text-xs text-grafite-500">
            Isto permite que qualquer pessoa audite: desde a descarga original da Anatel até o
            indicador final mostrado na tela. Confiabilidade através da transparência.
          </p>
        </div>
      </section>

      {/* Seção 5: Limitações */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-0.5 flex-1 bg-gradient-to-r from-marca-500 to-transparent" />
          <h2 className="text-xl font-bold text-white">5. Limitações Conhecidas</h2>
          <div className="h-0.5 flex-1 bg-gradient-to-l from-marca-500 to-transparent" />
        </div>

        <div className="space-y-3">
          <div className="cartao p-4">
            <h3 className="font-semibold text-white">Lacunas Históricas</h3>
            <p className="mt-1 text-sm text-grafite-300">
              Alguns períodos podem não ter dados publicados pela Anatel. Gráficos mostram uma
              linha tracejada nessas datas para indicar ausência, não interpolação.
            </p>
          </div>

          <div className="cartao p-4">
            <h3 className="font-semibold text-white">Identificação de Prestadoras</h3>
            <p className="mt-1 text-sm text-grafite-300">
              O registro Anatel usa CNPJ. Algumas prestadoras podem estar fragmentadas em
              múltiplos CNPJs (subsidiárias, marcas comerciais diferentes). Exibimos o
              "regulatory view" (individual) com alertas de possíveis consolidações.
            </p>
          </div>

          <div className="cartao p-4">
            <h3 className="font-semibold text-white">Mudanças de Grafia</h3>
            <p className="mt-1 text-sm text-grafite-300">
              Nomes de prestadoras às vezes mudam no registro Anatel (grafia, abreviaturas).
              Pipeline normaliza, mas possíveis variações podem aparecer no histórico bruto.
            </p>
          </div>
        </div>
      </section>

      {/* Seção 6: Contato e Feedback */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-0.5 flex-1 bg-gradient-to-r from-marca-500 to-transparent" />
          <h2 className="text-xl font-bold text-white">6. Contato e Feedback</h2>
          <div className="h-0.5 flex-1 bg-gradient-to-l from-marca-500 to-transparent" />
        </div>

        <div className="cartao p-5">
          <p className="text-sm text-grafite-300">
            NETRANK é um projeto de software aberto. Encontrou um erro, ambiguidade ou sugestão
            de melhoria?
          </p>
          <div className="mt-3 flex flex-col gap-2 text-sm">
            <a href="https://github.com/DaniloSFValim/rankingprovedoresrj/issues" className="text-marca-400 underline hover:text-marca-300">
              Abrir issue no GitHub
            </a>
            <a href="https://github.com/DaniloSFValim/rankingprovedoresrj" className="text-marca-400 underline hover:text-marca-300">
              Repositório do projeto
            </a>
          </div>
        </div>
      </section>

      {/* Rodapé */}
      <div className="pt-4 text-xs text-grafite-600">
        <p>
          NETRANK — Plataforma de Inteligência Territorial de Banda Larga Fixa. Última
          atualização: {new Date().toLocaleDateString('pt-BR')}.
        </p>
      </div>
    </main>
  );
}
