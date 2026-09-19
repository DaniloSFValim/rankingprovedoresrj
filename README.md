<div align="center">

# NETRANK RJ

**Inteligência de Mercado — Banda Larga Fixa no Rio de Janeiro**

[![License: CC-BY-4.0](https://img.shields.io/badge/License-CC%20BY%204.0-blue.svg)](LICENSE)
[![ORCID](https://img.shields.io/badge/ORCID-0009--0009--7250--6151-a6ce39.svg)](https://orcid.org/0009-0009-7250-6151)
[![Citation](https://img.shields.io/badge/Citation-CFF%20%2F%20BibTeX-informational.svg)](CITATION.cff)
[![CI Status](https://github.com/DaniloSFValim/rankingprovedoresrj/actions/workflows/dados-reais.yml/badge.svg?branch=main)](https://github.com/DaniloSFValim/rankingprovedoresrj/actions)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178c6.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16+-000000.svg)](https://nextjs.org/)

[📊 Acessar plataforma](https://netrank-rj.pages.dev/) • [📖 Documentação técnica](./DEVELOPMENT_GUIDE.md) • [🔄 CI/CD](./CI_CD_RUNBOOK.md)

</div>

---

## 📌 Sobre

Análise do mercado de provedores de banda larga fixa no Estado do Rio de Janeiro, com dados oficiais da **Anatel**. A plataforma oferece:

- **Ranking estadual e municipal** de provedores por número de acessos
- **Indicadores de concentração** — CR1, CR3, CR5, CR10 e HHI
- **Série histórica** — 31+ meses contínuos de evolução do mercado
- **Análise territorial** — participação por município e densidade de acessos
- **Site estático otimizado** — zero servidores, hospedagem em CDN (Cloudflare)

---

## 🚀 Quick Start

### Visualizar localmente

```bash
npm install
npm run etl -- demo      # dados de demonstração
npm run dev              # http://localhost:3000
```

### Usar dados reais

```bash
npm install
npm run etl -- sincronizar --anos 5   # importar série histórica da Anatel
npm run etl -- malhas                 # geometria dos municípios (IBGE)
npm run build                         # gerar site estático
npm run preview                       # visualizar saída de produção
```

---

## 🏗️ Arquitetura

```
packages/core/   → Motor de cálculo (Typescript puro, testado)
packages/etl/    → Pipeline de ingestão e warehouse (SQLite)
apps/web/        → Next.js com exportação estática
data/            → Artifacts JSON, warehouse, dados brutos
```

**Por que estático?** O mercado agregado cabe em poucos megabytes. Sem servidor de aplicação ou banco em produção, é mais rápido, mais confiável e mais barato.

---

## 📊 Fontes de dados

### Anatel (padrão)

Dados abertos publicados mensalmente no portal da Agência. Pipeline automatizado via GitHub Actions a cada 12º dia do mês.

```bash
npm run etl -- sincronizar              # descobre e importa automaticamente
npm run etl -- sondar <url>             # valida um link antes de baixar
```

### Base dos Dados / BigQuery (alternativa)

Microdados tratados da Anatel, consultáveis via SQL. Requer credenciais do Google Cloud.

```bash
npm run etl -- bdd-importar --anos 2    # importa do BigQuery
```

---

## ✅ Princípios

1. **Nada é inventado** — ausência é `null` (exibido como `n/d`), nunca zero
2. **Falha rápido** — cabeçalho desconhecido aborta a importação imediatamente
3. **Qualidade é observação** — o QC alerta, não "conserta" dados
4. **Histórico é preservado** — reimportar um mês substitui só aquele mês
5. **Separação dados reais/demo** — fixture sintética nunca vai à produção

---

## 🔧 Stack técnico

| Camada | Tecnologia |
|--------|-----------|
| **Frontend** | Next.js 16, React 19, TypeScript, Tailwind CSS |
| **Dados** | SQLite (warehouse), JSON (artefatos estáticos) |
| **Visualizações** | ECharts, mapas coropléticos (IBGE) |
| **ETL** | Node.js + native modules (`better-sqlite3`, `csv-parse`) |
| **CI/CD** | GitHub Actions (coleta automática, testes, build) |
| **Hospedagem** | Cloudflare Pages / Workers |

---

## 📁 Documentação

- **[DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md)** — Setup, desenvolvimento local, estrutura
- **[CI_CD_RUNBOOK.md](./CI_CD_RUNBOOK.md)** — Workflows, deploy, troubleshooting
- **[CITATION.cff](./CITATION.cff)** — Como citar este trabalho

---

## 🧪 Testes

```bash
npm test
```

Testes cobrem: indicadores (market share, CR-n, HHI), ranking com empates, crescimento e extração com filtro de UF.

---

## 👤 Autor & Acadêmica

**Danilo S. F. Valim**
- 🎓 Pós-graduação em Análise de Dados Aplicadas a Políticas Públicas — UFRRJ
- 🔗 [ORCID: 0009-0009-7250-6151](https://orcid.org/0009-0009-7250-6151)
- 📧 [danilosfvalim@gmail.com](mailto:danilosfvalim@gmail.com)

### Como citar este trabalho

**BibTeX:**
```bibtex
@dataset{valim2026netrank,
  author = {Valim, Danilo S. F.},
  title = {NETRANK RJ: Inteligência de Mercado de Banda Larga Fixa no Rio de Janeiro},
  year = {2026},
  url = {https://github.com/DaniloSFValim/rankingprovedoresrj},
  note = {Anatel Official Data, IBGE Geospatial Data}
}
```

**APA:**
> Valim, D. S. F. (2026). NETRANK RJ: Inteligência de Mercado de Banda Larga Fixa no Rio de Janeiro. Retrieved from https://github.com/DaniloSFValim/rankingprovedoresrj

Ver [CITATION.cff](CITATION.cff) para formatos adicionais (Chicago, Harvard, ISO690).

---

## 📄 Licença

**Creative Commons Attribution 4.0 International** (CC-BY-4.0)

- ✅ Uso comercial permitido
- ✅ Modificações permitidas  
- ✅ Distribuição permitida
- ⚠️ Requer atribuição ao autor

**Dados:** Anatel — Agência Nacional de Telecomunicações (dados abertos)

O NETRANK RJ é uma camada independente de análise. Indicadores de concentração são estatísticos e não constituem conclusão jurídica ou regulatória.

---

<sub>Built with TypeScript, Next.js, SQLite e dados abertos. Atualizado automaticamente a cada 12º dia do mês. | Made with 📊 by Danilo Valim</sub>
