# Changelog

Mudanças relevantes do NETRANK RJ. O formato segue o
[Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e as versões seguem o
[Versionamento Semântico](https://semver.org/lang/pt-BR/). Cada versão publicada é
arquivada no Zenodo sob o DOI de conceito
[10.5281/zenodo.22839933](https://doi.org/10.5281/zenodo.22839933).

## [Não publicado]

### Alterado

- Rodapé no padrão compartilhado (`docs/PADROES.md`, §3): autoria, afiliação,
  licenças, DOI de conceito e ano. Sem link para o GitHub no site.
- Separadores "·" substituídos por pontuação comum nos textos; sombras removidas
  dos menus suspensos (§1 e §2 do padrão).
- DOI da versão 1.2.0 no `CITATION.cff`, no README e no CHANGELOG.

## [1.2.0] - 2026-11-17

DOI da versão: [10.5281/zenodo.24312771](https://doi.org/10.5281/zenodo.24312771).

Versão da auditoria técnica. Primeira arquivada no Zenodo com o código sob AGPL-3.0, a
descrição de plataforma independente e o título novo.

### Escopo científico e funcional

- Seis testes de coerência entre artefatos: malha do IBGE x índice, prestadoras sem
  duplicidade, provedor x ranking, município x provedores, série do Estado x séries das
  prestadoras, densidade recalculada.
- Testes da busca (acentos, caixa, prioridade do prefixo).
- `scripts/bench-indicadores.ts` para medir o cálculo dos indicadores.
- Capturas de tela, análises disponíveis e critérios de avaliação no README.
- Apresentação como plataforma independente de inteligência de dados; textos falam em
  acessos registrados, nunca em cobertura.
- Corrigido: meses sem declaração na série por prestadora passam a ser `null`.
- Removido: `lib/mapas.ts`, sem uso, com rótulos de concentração e escala de cobertura.

### Adicionado

- Declaração de uso de inteligência artificial (`docs/USO-DE-IA.md`), resumida no README
  e na página Sobre.
- Aviso de salto isolado na série do Estado (mês que se afasta 5% ou mais dos dois vizinhos
  enquanto eles ficam a até 3% entre si), como out/2024. O número não muda.
- Base a partir de janeiro de 2024 (33 competências).
- Testes de integridade dos artefatos publicados: somas, participações, concentração,
  ranking com empates, municípios e arquivos por município e provedor.
- Testes de navegador reescritos sobre o site estático, em desktop e celular, com
  acessibilidade WCAG 2.1 AA (axe-core) e verificação de rolagem horizontal.
- ESLint 9 com regras do Next.js e do TypeScript; `npm run lint`, `npm run validar`.
- Validação do `CITATION.cff` contra o schema CFF 1.2.0 e do dígito verificador do ORCID
  em `npm run check-metadata`.
- Cabeçalhos de segurança HTTP (CSP, `X-Frame-Options`, `nosniff`, `Referrer-Policy`,
  `Permissions-Policy`) em `apps/web/public/_headers`.
- Documentação: `docs/ARQUITETURA.md`, `docs/DADOS.md`, `docs/DESENVOLVIMENTO.md`,
  `docs/AUDITORIA.md`, `SECURITY.md`, `CONTRIBUTING.md`, `.env.example`.
- Movimentações calculadas sobre o mês consolidado, no Estado e em cada município; aviso
  de mês preliminar.
- Exclusão das listas de movimentação dos retornos após falha de declaração e piso de base
  para variação percentual e avanço no ranking.

### Alterado

- O projeto passa a se apresentar apenas como software independente, de autoria própria e
  finalidade acadêmica, sem referência a órgão público, no site, no README, no
  `CITATION.cff` e no `.zenodo.json`.
- CI: lint, typecheck, testes do site, metadados e testes de navegador; `npm audit` passa a
  falhar em vulnerabilidade alta ou crítica.
- Dependências: Next.js 16.4.6, Vitest 5.1, csv-parse 7, BigQuery 9 e overrides para
  dependências transitivas. `npm audit` sem vulnerabilidades.
- Código-fonte sob AGPL-3.0; documentação e dados seguem sob CC BY 4.0.
- Rodapé com autoria, ORCID, DOI de conceito e licenças.
- Desempenho: o índice da busca sai do layout e vira o arquivo `/busca.json`, carregado
  quando a busca é usada. O site compilado caiu de 933 MB para 243 MB; a página Sobre, de
  261 KB para 52 KB de HTML.

### Corrigido

- Vulnerabilidade crítica do Next.js e vulnerabilidades altas em dependências.
- Tooltips dos gráficos passam a escapar nomes vindos de dados de terceiros (XSS).
- Contraste insuficiente nas variações do ranking, links sem sublinhado em texto,
  atributo ARIA inválido na busca e `main` duplicado em todas as páginas.
- Rolagem horizontal no celular nas páginas de provedores e de crescimento.
- `npm run typecheck`, que falhava, e `npm test`, que não rodava os testes do site.
- Bibliografia do `/sobre` usava `@dataset` e um DOI de exemplo como alternativa.

### Removido

- Módulos do ETL sem uso (`metadados`, `relatorio-qualidade`, `validacoes-matematicas`).
- Testes de navegador obsoletos, que apontavam para páginas inexistentes.
- `dataset-schema.json`, sem uso e com e-mail pessoal exposto.
- Guias de desenvolvimento com informações incorretas (domínio inexistente, testes de carga
  inexistentes).

## [1.1.0] - 2026-09-25

DOI da versão: [10.5281/zenodo.22948694](https://doi.org/10.5281/zenodo.22948694).

### Adicionado

- Perfil acadêmico: autoria no site, `CITATION.cff`, `.zenodo.json` e licença.
- Alertas de qualidade dos dados por município e mapa com zoom no município.
- Nomes de prestadoras em caixa de título e seção de dados para download.

## [1.0.1] - 2026-09-19

DOI da versão: [10.5281/zenodo.22839934](https://doi.org/10.5281/zenodo.22839934).
Primeira versão arquivada no Zenodo.
