# NETRANK RJ

**Painel do mercado de banda larga fixa no Estado do Rio de Janeiro**

[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.22839933.svg)](https://doi.org/10.5281/zenodo.22839933)
[![ORCID](https://img.shields.io/badge/ORCID-0009--0009--7250--6151-a6ce39.svg)](https://orcid.org/0009-0009-7250-6151)
[![Licença: CC BY 4.0](https://img.shields.io/badge/Licen%C3%A7a-CC%20BY%204.0-lightgrey.svg)](LICENSE)
[![CI](https://github.com/DaniloSFValim/rankingprovedoresrj/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/DaniloSFValim/rankingprovedoresrj/actions/workflows/ci.yml)

**Painel:** [netranking-rj.labdados.org](https://netranking-rj.labdados.org)

## Propósito

O NETRANK RJ organiza os dados públicos de acessos de banda larga fixa dos 92 municípios
fluminenses em indicadores comparáveis de cobertura, qualidade contratada e concentração
de mercado. Foi desenvolvido como instrumento de apoio ao monitoramento de serviços
concedidos pela Secretaria Municipal de Conservação e Serviços Públicos de Niterói
(Seconser), Setor de Fiscalização de Serviços Concedidos.

É um trabalho independente, sem vínculo com a Anatel. Os indicadores são estatísticos e
não constituem conclusão jurídica, concorrencial ou regulatória.

## Autoria

**Danilo S. F. Valim**
Pós-Graduação em Análise de Dados Aplicadas a Políticas Públicas,
Universidade Federal Rural do Rio de Janeiro (UFRRJ)
ORCID [0009-0009-7250-6151](https://orcid.org/0009-0009-7250-6151)

## Como citar

> Valim, D. S. F. (2026). *NETRANK RJ: Painel do Mercado de Banda Larga Fixa no Estado do
> Rio de Janeiro* (versão 1.1.0) [Software]. Zenodo. https://doi.org/10.5281/zenodo.22839933

```bibtex
@software{valim_netrank_rj_2026,
  author    = {Valim, Danilo S. F.},
  title     = {{NETRANK RJ}: Painel do Mercado de Banda Larga Fixa no Estado do Rio de Janeiro},
  year      = {2026},
  version   = {1.1.0},
  publisher = {Zenodo},
  doi       = {10.5281/zenodo.22839933},
  url       = {https://doi.org/10.5281/zenodo.22839933}
}
```

Os metadados de citação também estão em [`CITATION.cff`](CITATION.cff); o GitHub gera
APA e BibTeX a partir dele no botão *Cite this repository*.

## Dados

| Fonte | Uso | Periodicidade |
|---|---|---|
| [Anatel — Acessos de Banda Larga Fixa](https://www.anatel.gov.br/dadosabertos/) | Acessos por prestadora, município, velocidade e tipo de pessoa | Mensal, coleta automática no dia 12 |
| [IBGE — Censo 2022, tabela 4712](https://sidra.ibge.gov.br/tabela/4712) | Domicílios particulares ocupados (denominador da densidade) | Fixa |
| Receita Federal — CNPJ (dados abertos) | Razão social, situação cadastral e porte das prestadoras | Renovada a cada 30 dias |
| IBGE — Malha municipal | Geometria dos municípios no mapa | Fixa |

Cobertura atual: janeiro de 2024 a julho de 2026.

## Indicadores

- **Participação de mercado**: acessos da prestadora sobre o total do recorte.
- **Concentração**: CR-n e Índice Herfindahl-Hirschman (0 a 10.000), calculados com
  participações em precisão plena.
- **Densidade**: acessos de pessoa física por 100 domicílios ocupados.
- **Velocidade**: distribuição por velocidade *contratada* declarada à Anatel, não medida.

Limites conhecidos: os números refletem o que as prestadoras declaram à Anatel. A
densidade é distorcida por domicílios de uso ocasional e por acessos registrados em outro
município.

## Reprodução

Requer Node.js 20 ou superior.

```bash
npm install
npm run etl -- sincronizar   # baixa e importa os dados da Anatel
npm run etl -- domicilios    # domicílios do Censo 2022 (IBGE/SIDRA)
npm run etl -- receita       # cadastro das prestadoras na Receita Federal
npm run etl -- malhas        # malha municipal do IBGE
npm run etl -- build         # gera os artefatos JSON do painel
npm run build                # gera o site estático em apps/web/out
npm test
```

Estrutura:

```
packages/core   cálculo dos indicadores (TypeScript, testado)
packages/etl    ingestão, validação e warehouse SQLite
apps/web        painel Next.js com exportação estática
data/           cadastros e dados auxiliares versionados
```

Detalhes técnicos: [`docs/desenvolvimento.md`](docs/desenvolvimento.md) e
[`docs/operacao-ci-cd.md`](docs/operacao-ci-cd.md).

## Licença

[Creative Commons Atribuição 4.0 Internacional (CC BY 4.0)](LICENSE). Os dados de origem
seguem as licenças de seus publicadores (Anatel, IBGE e Receita Federal).
