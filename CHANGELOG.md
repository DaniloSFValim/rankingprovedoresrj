# Changelog

Mudanças relevantes do NETRANK RJ. O formato segue o
[Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e as versões seguem o
[Versionamento Semântico](https://semver.org/lang/pt-BR/). Cada versão publicada é
arquivada no Zenodo sob o DOI de conceito
[10.5281/zenodo.22839933](https://doi.org/10.5281/zenodo.22839933).

## [Não publicado]

### Adicionado

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
