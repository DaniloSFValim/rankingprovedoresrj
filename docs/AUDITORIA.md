# Relatório de auditoria técnica

Auditoria integral do repositório em 17/11/2026, sobre o commit `bdd81fc` (dados da
competência de setembro de 2026). Todas as verificações abaixo foram executadas; nenhum
resultado foi estimado.

## 1. Diagnóstico inicial

O projeto já tinha uma base técnica sólida: separação clara entre cálculo (`packages/core`),
ingestão (`packages/etl`) e apresentação (`apps/web`); 180 testes unitários nos pacotes;
ingestão mensal automatizada; site estático sem servidor; registro no Zenodo com DOI.

Os problemas estavam na periferia do código: identidade institucional indevida,
dependências vulneráveis, ausência de lint, testes do site fora do CI, testes de navegador
obsoletos, peso excessivo das páginas, documentação com informações falsas e metadados
acadêmicos inconsistentes.

## 2. Problemas encontrados

| # | Criticidade | Problema | Situação |
|---|---|---|---|
| 1 | Crítica | Next.js 16.3.5 com vulnerabilidade crítica (execução remota em `next/og`) e outras 14 vulnerabilidades em dependências | Corrigido |
| 2 | Alta | Referências à Prefeitura de Niterói e à Seconser no README, `CITATION.cff`, `.zenodo.json`, página Sobre, rodapé e `CONTEXT.md`, descrevendo o projeto como apoio à fiscalização municipal | Corrigido no repositório; pendente no registro já publicado do Zenodo |
| 3 | Alta | E-mail pessoal do autor publicado no site em `dataset-schema.json`, arquivo sem uso | Corrigido (arquivo removido; permanece no histórico do Git) |
| 4 | Alta | Tooltips dos gráficos renderizam como HTML nomes vindos de dados de terceiros (Anatel, Receita), sem escape: vetor de XSS | Corrigido |
| 5 | Alta | Índice de busca (1.351 itens) embutido em todas as páginas: cerca de 200 KB por página e 933 MB de site compilado | Corrigido |
| 6 | Alta | Testes do site (26) não rodavam em `npm test` nem no CI; os 4 arquivos de testes de navegador apontavam para páginas inexistentes e servidor de desenvolvimento (27 de 74 falhavam) | Corrigido |
| 7 | Média | Sem lint: o script `next lint` não existe no Next.js 16; 45 achados ao configurar o ESLint | Corrigido |
| 8 | Média | `npm run typecheck` quebrado (referências de projeto TypeScript sem `composite`) | Corrigido |
| 9 | Média | Violações WCAG 2.1 AA: atributo ARIA inválido na busca (crítico no axe), contraste insuficiente nas variações do ranking (até 1.672 nós por página), links sem sublinhado em texto; `main` duplicado em todas as páginas | Corrigido |
| 10 | Média | Rolagem horizontal no celular em `/provedores/` (256 px) e `/crescimento/` (179 px) | Corrigido |
| 11 | Média | Sem cabeçalhos de segurança HTTP (CSP, anti-clickjacking, `nosniff`) | Corrigido |
| 12 | Média | `security.yml` nunca falhava (`npm audit ... \|\| true`, `continue-on-error`) e afirmava tolerar vulnerabilidades "do BigQuery" | Corrigido |
| 13 | Média | Guias em `docs/` com informações falsas: domínio `rankingprovedoresrj.com`, testes de carga com k6 e contatos de emergência inexistentes | Corrigido (substituídos) |
| 14 | Média | README com cobertura desatualizada ("jan/2024 a jul/2026"; real: jan/2025 a set/2026) | Corrigido |
| 15 | Baixa | 822 linhas de código do ETL sem nenhum uso (`metadados`, `relatorio-qualidade`, `validacoes-matematicas`) | Corrigido (removido; as verificações viraram testes de integridade) |
| 16 | Baixa | `CITATION.cff` com data de publicação divergente do Zenodo (24/09 x 25/09) e nome diferente do ORCID e do Zenodo | Corrigido |
| 17 | Baixa | BibTeX da página Sobre com tipo `@dataset` e DOI de exemplo como alternativa | Corrigido |
| 18 | Baixa | Sem `.env.example`, `CHANGELOG.md`, `CONTRIBUTING.md`, `SECURITY.md` | Corrigido |

## 3. Problemas corrigidos e melhorias

### Arquitetura e manutenção

- Índice de busca gerado como arquivo estático (`src/app/busca.json/route.ts`) e carregado
  sob demanda, com estados de carregamento e erro.
- Função única `carregarEcharts` para o carregamento dinâmico do ECharts, com tipos, no lugar
  de quatro conversões para `any`.
- Remoção de código morto; tipagem dos parâmetros de tooltip e da instância do gráfico.
- Leitura de `localStorage` após a montagem documentada como exceção justificada à regra
  `set-state-in-effect`; os demais `setState` em efeito foram movidos para os eventos.

### Segurança

- Dependências: Next.js 16.4.6, Vitest 5.1, `@vitejs/plugin-react` 6, csv-parse 7,
  BigQuery 9 e overrides para `vite`, `source-map-js` e `postcss-selector-parser`.
  `npm audit`: **0 vulnerabilidades** (antes: 1 crítica, 3 altas, 11 moderadas).
- `escaparHtml` nos tooltips de todos os gráficos com nomes de terceiros.
- `apps/web/public/_headers` com CSP restrita ao próprio domínio, `X-Frame-Options: DENY`,
  `nosniff`, `Referrer-Policy`, `Permissions-Policy` e COOP. A CSP foi testada no navegador
  nas páginas com gráficos e mapa: nenhuma violação e todos os gráficos renderizados.
- Varredura de segredos no repositório: nenhuma chave, token ou arquivo `.env` versionado.
- SQL do warehouse: consultas parametrizadas; os trechos dinâmicos montam só marcadores `?`.

### Desempenho

| Medida | Antes | Depois |
|---|---|---|
| Site compilado | 933 MB | 243 MB |
| HTML da página Sobre | 261 KB | 52 KB |
| HTML da página de um provedor | 373 KB | 163 KB |

### Interface e acessibilidade

- Zero violações WCAG 2.1 A/AA (axe-core) nas 8 páginas principais, em desktop (1280 px) e
  celular (Pixel 5).
- Sem rolagem horizontal no celular.
- Um único landmark `main` por página; combobox de busca com `aria-controls`.
- Rodapé e Sobre apresentam o projeto como software independente, com autoria, ORCID, DOI e
  licenças.

### Qualidade e testes

- ESLint 9 (`eslint.config.mjs`) com regras do Next.js, React Hooks, jsx-a11y e TypeScript.
- `npm test` roda os testes dos pacotes e do site.
- Testes de integridade dos artefatos publicados (11 invariantes).
- Testes de navegador reescritos sobre o site estático (29 cenários × 2 dispositivos).
- `check-metadata` valida o `CITATION.cff` contra o schema CFF 1.2.0 e o dígito verificador
  do ORCID (ISO 7064 MOD 11-2).
- CI: lint, typecheck, testes, metadados, build e testes de navegador; segurança com
  `npm audit --audit-level=high` bloqueante e CodeQL.

## 4. Testes executados

Executados neste ambiente (Node.js 22, Chromium do Playwright), na versão final:

| Verificação | Comando | Resultado |
|---|---|---|
| Lint | `npm run lint` | 0 erros, 0 avisos |
| Tipos | `npm run typecheck` | 0 erros nos 3 pacotes |
| Unitários e integridade (core, etl) | `npm test` | 191 aprovados em 15 arquivos |
| Componentes (site) | `npm test` | 26 aprovados em 5 arquivos |
| Metadados | `npm run check-metadata` | Consistentes; CFF válido; ORCID válido |
| Build | `npm run build` | Concluído |
| Navegador | `npm run test:e2e` | 58 aprovados (desktop e celular) |
| Dependências | `npm audit` | 0 vulnerabilidades |

Não executados aqui: Firefox e WebKit (só Chromium está disponível neste ambiente), CodeQL
(roda no GitHub) e a ingestão completa a partir das fontes (exige baixar arquivos de mais
de 1 GB; o fluxo é exercitado mensalmente pelo workflow de ingestão).

## 5. Documentação criada ou atualizada

| Arquivo | Conteúdo |
|---|---|
| `README.md` | Reescrito: propósito, funcionalidades, arquitetura com diagrama, tecnologias, estrutura, execução num clone limpo, testes, dados, limitações, licença, autoria e identificação acadêmica |
| `docs/ARQUITETURA.md` | Componentes, fluxo de dados (diagramas Mermaid), artefatos, automação e decisões |
| `docs/DADOS.md` | Fontes, níveis de dado (original, tratado, indicador, sinal), transformações, fórmulas, critérios, alertas, reprodução e limitações |
| `docs/DESENVOLVIMENTO.md` | Ambiente, comandos, testes, CI, publicação, ingestão, versão citável e problemas comuns |
| `SECURITY.md` | Superfície, controles, limitações e como relatar vulnerabilidades |
| `CHANGELOG.md`, `CONTRIBUTING.md`, `.env.example` | Criados |
| `CITATION.cff`, `.zenodo.json`, `CONTEXT.md`, `docs/PADROES.md` | Sem referência institucional; metadados coerentes com o Zenodo e o ORCID |

## 6. Identificação científica: DOI, Zenodo e ORCID

Verificado por consulta às APIs públicas do Zenodo, do DataCite (resolução do DOI) e do ORCID.

| Elemento | Resultado | Situação |
|---|---|---|
| DOI de conceito | `10.5281/zenodo.22839933` resolve (HTTP 302) para o registro no Zenodo | Aprovado |
| DOI da versão 1.2.0 | `10.5281/zenodo.24312771`, publicado em 17/11/2026 pela integração GitHub–Zenodo; resolve (HTTP 302) | Aprovado |
| Versões anteriores | 1.1.0 (`10.5281/zenodo.22948694`, 25/09/2026) e 1.0.1 (`10.5281/zenodo.22839934`, 19/09/2026) | Documentado no CHANGELOG |
| Registro no Zenodo | Público, acesso aberto, título novo, descrição sem referência institucional e com a declaração de uso de IA | Aprovado |
| ORCID | `0009-0009-7250-6151`: dígito verificador válido; presente no criador do registro, com afiliação UFRRJ | Aprovado |
| Obra no perfil ORCID | O perfil público lista o NETRANK com o DOI de conceito | Aprovado |
| `CITATION.cff` | Válido no schema CFF 1.2.0; DOI de conceito e da versão 1.2.0; ORCID; data igual à do Zenodo | Corrigido |
| README | Seção "Identificação acadêmica e citação" com DOI, registro, ORCID, versão e citação | Corrigido |
| Integração GitHub–Zenodo | Ativa: a versão 1.2.0 foi arquivada a partir do release do GitHub | Aprovado |
| Licença | Repositório e Zenodo 1.2.0: AGPL-3.0 (código); dados e documentação sob CC BY 4.0. Versões 1.0.1 e 1.1.0 ficam com CC BY 4.0, como foram publicadas | Aprovado |
| Metadados entre plataformas | Título, versão, autor, ORCID e licença coerentes entre repositório, Zenodo e ORCID | Aprovado |

As versões 1.0.1 e 1.1.0 continuam no Zenodo com os títulos e descrições da época, como
manda o arquivamento: registros publicados não são reescritos. O DOI de conceito resolve
para a 1.2.0.

## 7. Pendências e limitações

| Item | Motivo |
|---|---|
| Histórico do Git contém o e-mail removido e os textos institucionais antigos | Reescrever o histórico de `main` é destrutivo e não foi feito; o conteúdo atual está limpo |
| CSP com `'unsafe-inline'` | Exigência da exportação estática do Next.js e do ECharts (ver `SECURITY.md`) |
| Cabeçalhos de `_headers` | Só aplicados no Cloudflare Workers; confirmar com uma requisição ao site publicado após o deploy |
| Testes de navegador só no Chromium | Firefox e WebKit não estão disponíveis neste ambiente |
| `docs/PADROES.md` diverge das cópias do OpenLux e do CADEX | As referências a outros projetos e à Prefeitura foram retiradas desta cópia |
| Limitações dos dados (declaratórios, velocidade contratada, densidade em municípios de veraneio) | Inerentes às fontes; documentadas em `docs/DADOS.md` e sinalizadas por alertas |

## 8. Auditoria do escopo científico e funcional

Feita sobre os artefatos publicados (competência de setembro de 2026). As verificações
cruzadas viraram testes permanentes em
`packages/etl/src/__tests__/integridade-artefatos.test.ts` (17 testes).

| # | Item | Verificação | Resultado |
|---|---|---|---|
| 1 | Integridade da base de acessos | Total do Estado igual nos KPIs, no ranking e na série (4.350.330); série do Estado igual à soma das prestadoras em cada mês (1.259 prestadoras em 21 meses na base de 12/11; 1.379 em 33 meses depois da ingestão de 17/11, que passou a incluir 2024) | Aprovado |
| 2 | Municípios do RJ | 92 municípios, códigos `33xxxxx`, os mesmos da malha do IBGE | Aprovado |
| 3 | Nomes e códigos IBGE | Nome de cada município igual ao da malha do IBGE; junção sempre pelo código | Aprovado |
| 4 | Prestadoras | Identidade pela raiz do CNPJ, sem raiz repetida; nomes iguais com CNPJ diferente (Claro, Oi, Vivo) aparecem com o CNPJ ao lado | Aprovado |
| 5 | Duplicidades | Nenhum id, slug ou raiz de CNPJ repetido; nenhuma prestadora repetida no ranking de um município | Aprovado |
| 6 | Agrupamentos | Soma da presença de cada provedor igual aos seus acessos; soma por município a partir dos provedores igual ao total do município | Aprovado |
| 7 | Rankings | Ordem decrescente, empates com a mesma posição; posição e acessos da página do provedor iguais aos do ranking | Aprovado |
| 8 | Cálculos | Participações somam 100; CR crescente; HHI recalculado igual ao publicado; densidade recalculada igual à publicada | Aprovado |
| 9 | Coerência entre tabelas, gráficos e mapas | Índice de municípios (fonte do mapa) igual aos arquivos de cada município em total, HHI e líder | Aprovado |
| 10 | Fontes | `meta.json` registra fonte, URL, arquivo, período, data de coleta e de processamento | Aprovado |
| 11 | Busca e seletores | Busca ignora acentos e caixa e prioriza o que começa com o termo (testes de componente e de navegador) | Aprovado |
| 12 | Desempenho | Ver abaixo | Aprovado, com ressalva |

**Corrigido nesta etapa.** A série por prestadora (`estado/series-empresas.json`) gravava
zero nos meses sem declaração, contra a regra de lacuna como `null` (8.236 zeros). O ETL
foi corrigido; o arquivo publicado muda na próxima ingestão. O arquivo não alimenta
nenhuma página.

**Removido.** `apps/web/src/lib/mapas.ts`, sem uso, rotulava mercados como "Concentrado -
Baixa Competição" e tinha uma escala de "cobertura": as duas coisas contrariam a
metodologia.

**Terminologia.** O painel mede acessos registrados, não pessoas, domicílios nem cobertura
de rede. Os textos que falavam em "cobertura" foram trocados, e `docs/DADOS.md` ganhou a
tabela "O que os números medem e o que não medem".

**Ingestão de 17/11/2026.** A base passou a começar em janeiro de 2024 (33 competências,
1.379 prestadoras). Os testes de integridade passam sobre a base nova. Outubro de 2024 tem
4.413.205 acessos, contra 4.083.589 em setembro e 4.144.803 em novembro: um salto isolado
de 8% que volta no mês seguinte, padrão de declaração e não de clientes. O número é
publicado como declarado.

**Desempenho.** Na última ingestão real (12/11/2026, GitHub Actions): leitura da base da
Anatel em 3 min 19 s, artefatos e site em 59 s, consulta à Receita Federal em 26 min 50 s.
O tempo da Receita vem das pausas entre consultas, que respeitam o limite da API pública;
há cache e só CNPJ novo ou vencido é reconsultado. O cálculo dos indicadores, medido com
`npx tsx scripts/bench-indicadores.ts` sobre volume sintético do tamanho da base real
(340.284 combinações prestadora × local × mês), levou 184 ms.

## 9. Avaliação de maturidade

| Dimensão | Avaliação |
|---|---|
| Arquitetura | Madura: camadas separadas, cálculo puro testado, site estático sem superfície de servidor |
| Qualidade de código | Boa: lint e tipos estritos sem erros; código morto removido |
| Testes | Boa: unitários, componentes, integridade dos dados e navegador com acessibilidade, todos no CI |
| Segurança | Boa para um site estático: sem vulnerabilidades conhecidas, cabeçalhos restritivos, XSS tratado, sem segredos |
| Dados e reprodutibilidade | Boa: procedência registrada, níveis de dado separados, nada estimado, pipeline reprodutível e automatizado |
| Documentação | Boa: README executável num clone limpo, arquitetura, dados, desenvolvimento e segurança |
| Identificação acadêmica | Madura: DOI de conceito e de versão, Zenodo, ORCID e CFF coerentes e verificados nas APIs públicas |

O software está em condições de avaliação técnica independente. 
