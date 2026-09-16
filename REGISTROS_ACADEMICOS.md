# Guia de Registros Acadêmicos e em Plataformas de Dados

Após a publicação em Zenodo (ver `ZENODO.md`), registre o dataset em plataformas adicionais para maximizar visibilidade e impacto.

## 1. Google Dataset Search

**Obtenção automática**: Após 7-14 dias da publicação em Zenodo, seu dataset será indexado automaticamente via:
- Schema.json publicado em `apps/web/public/dataset-schema.json`
- JSON-LD incluído no `<head>` via `layout.tsx`

**Verificação manual:**
```bash
# Validar schema em: https://validator.schema.org/
curl -s https://rankingprovedoresrj.pages.dev | grep -o '"@type".*"Dataset"'

# Ou acesse:
# https://datasetsearch.research.google.com/
# Buscar: "NETRANK RJ"
```

**Status**: ✅ Automático (não requer ação manual)

---

## 2. Data.gov.br (Portal Brasileiro de Dados Abertos)

**Propósito**: Registrar em repositório oficial de dados abertos do governo brasileiro

**Acesso:** https://dados.gov.br

**Passo-a-passo:**

1. Acesse: https://dados.gov.br/admin/

2. Clique em "Meu Perfil" → "Meus Conjuntos de Dados"

3. Clique em "+ Novo Conjunto de Dados"

4. Preencha:

   **Título:**
   ```
   NETRANK RJ: Análise de Mercado de Banda Larga Fixa
   ```

   **Descrição:**
   ```
   Plataforma de análise do mercado de banda larga fixa do Estado do Rio de Janeiro.
   Fornece indicadores de concentração (CR1-CR10, HHI), ranking de provedores,
   análise histórica mensal de 1.539 provedores em 92 municípios (jan/2022 - jul/2026).
   Dados originários da Anatel.
   
   DOI: 10.5281/zenodo/XXXXXXX
   Repositório: https://github.com/DaniloSFValim/rankingprovedoresrj
   ```

   **Palavras-chave:**
   ```
   banda larga, telecomunicações, Rio de Janeiro, Anatel, dados abertos
   ```

   **Organização:** `Universidade Federal Rural do Rio de Janeiro (UFRRJ)`

   **Autor:** `Danilo S. F. Valim` (email: danilosfvalim@gmail.com)

   **Frequência de atualização:** Mensal

5. Clique em "+ Adicionar Recurso"

   **Nome:** `Dados em JSON`
   **URL:** `https://rankingprovedoresrj.pages.dev/data/estado/ranking.json`
   **Formato:** JSON

6. Clique em "+ Adicionar Recurso"

   **Nome:** `Código-fonte no GitHub`
   **URL:** `https://github.com/DaniloSFValim/rankingprovedoresrj`
   **Formato:** Código Fonte

7. Clique em "Próximo" → "Publicar"

**Tempo de indexação**: Até 48 horas

**Verificação**: https://dados.gov.br/dataset/netrank-rj

---

## 3. Google Scholar (Indexação de Publicações)

**Propósito**: Aparecer nos resultados de busca acadêmica (sem ter artigo publicado)

**Opção A: Via Zenodo (Recomendado)**
- Automático quando publicado em Zenodo com ORCID
- Leva 7-30 dias

**Opção B: Manual**

1. Acesse: https://scholar.google.com/scholar_profile

2. Clique em "Criar perfil"

3. Preencha informações pessoais

4. Adicione publicações/datasets

5. Vincule ORCID: https://orcid.org/0009-0009-7250-6151

**Tempo de indexação**: 7-30 dias

**Verificação:**
```
Busque por: "Danilo S. F. Valim" "NETRANK RJ"
https://scholar.google.com/scholar?q=NETRANK+RJ
```

---

## 4. Kaggle Datasets

**Propósito**: Plataforma de dados + comunidade de data science

**Acesso:** https://www.kaggle.com/settings/datasets

**Passo-a-passo:**

1. Faça login ou crie conta em Kaggle

2. Acesse: https://www.kaggle.com/datasets/new

3. Clique em "+ New Dataset"

4. **Opção A**: Upload de ZIP
   ```bash
   cd apps/web/public/data
   zip -r netrank-rj-2026.09.16.zip .
   ```
   Selecione o arquivo

5. **Opção B**: Usar URL
   ```
   https://zenodo.org/record/XXXXXXX/files/netrank-rj-dataset.zip
   ```

6. Preencha metadados:

   **Title:** `NETRANK RJ - Broadband Market Intelligence Rio de Janeiro`

   **Subtitle:** `1,539 providers, 92 municipalities, 43 months analysis`

   **Description:**
   ```markdown
   ## Market Analysis for Fixed Broadband Access in Rio de Janeiro State

   Comprehensive dataset analyzing the fixed broadband market from January 2022 to July 2026,
   covering 1,539 providers across 92 municipalities.

   ### Key Metrics
   - Concentration Indexes (CR1, CR3, CR5, CR10)
   - Herfindahl-Hirschman Index (HHI)
   - Market Share by Provider
   - Monthly Historical Evolution
   - Geographic Coverage

   ### Data Source
   Anatel (Brazilian National Telecommunications Agency) official open data

   ### Citation
   Valim, D. S. F. (2026). NETRANK RJ. Version 2026.09.16. DOI: 10.5281/zenodo/XXXXXXX

   ### License
   CC-BY-4.0 (Creative Commons Attribution)
   ```

   **Keywords:** `broadband`, `telecommunications`, `Brazil`, `market analysis`, `open data`

   **License:** `CC-BY-4.0`

   **Collaborators:** (opcional)

7. Clique em "Create"

**Tempo**: Imediato após upload

**Verificação**: https://www.kaggle.com/danilosvalim/datasets

---

## 5. OpenDOAR (Repositórios de Acesso Aberto)

**Propósito**: Registrar repositório em base de repositórios acadêmicos

**Acesso:** https://v2.sherpa.ac.uk/opendoar/

1. Acesse: https://v2.sherpa.ac.uk/opendoar/new

2. Tipo: Registrar **Software/Dataset** não institucional

3. Preencha:
   - **Repository name:** `NETRANK RJ Repository`
   - **URL:** `https://github.com/DaniloSFValim/rankingprovedoresrj`
   - **Description:** Análise de mercado de banda larga
   - **Content:** Datasets, código-fonte
   - **License:** CC-BY-4.0

4. Envie para aprovação

---

## 6. Re3data (Registro de Repositórios de Dados)

**Propósito**: Base global de repositórios de dados científicos

**Acesso:** https://www.re3data.org/

1. Acesse: https://www.re3data.org/

2. Clique em "Add a Repository"

3. Preencha formulário:
   - **Repository Name:** `NETRANK RJ`
   - **Type:** Research Data Repository
   - **Discipline:** Computer Science, Social Sciences
   - **Content:** Datasets
   - **API:** GitHub API disponível
   - **License:** CC-BY-4.0

---

## 7. FAIRSharing (Padrões e Políticas de Dados)

**Propósito**: Registrar conformidade com padrões FAIR (Findable, Accessible, Interoperable, Reusable)

**Acesso:** https://fairsharing.org/

1. Acesse: https://fairsharing.org/login/

2. Crie conta

3. Submeta dataset como "FAIR Dataset"

4. Evidencie:
   - ✅ **Findable**: DOI, Schema.org, Google Dataset Search
   - ✅ **Accessible**: URL pública, HTTP, sem autenticação
   - ✅ **Interoperable**: JSON-LD, Schema.org, CFF
   - ✅ **Reusable**: CC-BY-4.0, documentação completa

---

## Checklist de Registros

```
Prioridade Alta:
  [ ] Zenodo (DOI permanente)
  [ ] Data.gov.br (portal oficial brasileiro)
  [ ] Google Dataset Search (automático em 7-14 dias)

Prioridade Média:
  [ ] Google Scholar (automático ou manual)
  [ ] Kaggle (comunidade data science)
  [ ] GitHub (já feito)

Prioridade Baixa (Complementar):
  [ ] Re3data
  [ ] OpenDOAR
  [ ] FAIRsharing

Marketing Acadêmico:
  [ ] Incluir DOI e link em publicações pessoais
  [ ] Compartilhar em Twitter/LinkedIn com #OpenData #Telecomunicações
  [ ] Contatar blogs de dados abertos brasileiros
  [ ] Mencionar em palestras e workshops
```

---

## Automação de Registros

Para futuras atualizações, os seguintes arquivos facilitam registros:

- `CITATION.cff` — Formato padrão para citação (GitHub auto-detecta)
- `dataset-schema.json` — Schema.org para SEO
- `ZENODO.md` — Instruções de publicação Zenodo
- `README.md` — Documentação principal

---

## Impacto Esperado

Após completes os registros acima:

| Métrica | Tempo | Resultado |
|---------|-------|-----------|
| Visibilidade global | 7-30 dias | Aparecer em 5+ bases científicas |
| Citações acadêmicas | 3-12 meses | Uso em papers, dissertações, teses |
| Impacto em políticas | 6-24 meses | Referência em debates públicos |
| Reconhecimento UFRRJ | Imediato | Contribuir ao ranking de produção |

---

## Suporte

- Dúvidas sobre Zenodo: https://zenodo.org/support/
- Sobre Data.gov.br: contato@dados.gov.br
- Sobre Kaggle: https://www.kaggle.com/support
- Sobre schema.org: https://schema.org/
