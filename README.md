<div align="center">

# NETRANK RJ

**Inteligência de Mercado — Banda Larga Fixa no Rio de Janeiro**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
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

## 📄 Licença & Atribuição

MIT License. Dados: **Anatel — Agência Nacional de Telecomunicações**.

O NETRANK RJ é uma camada independente de análise. Indicadores de concentração são estatísticos e não constituem conclusão jurídica ou regulatória.

---

<sub>Built with TypeScript, Next.js, SQLite e dados abertos. Atualizado automaticamente a cada 12º dia do mês.</sub>
