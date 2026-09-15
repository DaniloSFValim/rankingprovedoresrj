# NETRANK RJ

**Inteligência de Mercado de Banda Larga Fixa no Rio de Janeiro**

Plataforma de análise do mercado de banda larga fixa do Estado do Rio de
Janeiro, construída sobre os dados abertos da Anatel.

---

## Como os dados são obtidos

### Por que não usamos o painel da Anatel

O endereço `informacoes.anatel.gov.br/paineis/acessos/banda-larga-fixa` é um
**dashboard Qlik Sense**: uma camada de visualização sobre um backend
proprietário. Extrair dados dali exigiria engenharia reversa de uma API interna
não documentada, que a Anatel pode alterar sem aviso — quebrando o produto em
silêncio, que é o pior modo de falha possível para uma plataforma de dados.

A fonte usada são os **dados abertos que alimentam esse mesmo painel**:

> https://dados.gov.br/dados/conjuntos-dados/acessos---banda-larga-fixa

Arquivos CSV (frequentemente compactados em ZIP), publicados mensalmente,
com estrutura estável e uso para reprocessamento previsto.

### Fluxo de ingestão

```
Catálogo de dados abertos (CKAN)
        ↓  descobrir
    Download + SHA-256
        ↓  data/raw/
    Descompactação
        ↓  data/work/
    Leitura em streaming
        ↓  filtro UF = RJ (linha a linha)
    Validação e normalização
        ↓
    Warehouse SQLite  ──→  Controle de qualidade (alertas)
        ↓  build
    Artefatos JSON
        ↓
    Site estático
```

O filtro `UF = RJ` é aplicado **durante a leitura**, antes de qualquer
alocação: um arquivo nacional de centenas de MB é reduzido ao Rio de Janeiro
sem nunca ser materializado em memória.

### Comandos

```bash
npm install

# 1. Descobrir os arquivos disponíveis no catálogo
npm run etl -- descobrir

# 2. Baixar, importar e reconstruir os artefatos
npm run etl -- atualizar <url-do-recurso>

# Alternativa: arquivo já baixado manualmente pelo portal
npm run etl -- importar caminho/para/arquivo.csv

# Reconstruir artefatos sem reimportar
npm run etl -- build

# Estado do warehouse e alertas de qualidade
npm run etl -- status
```

Para desenvolver sem acesso à rede, há uma fixture sintética:

```bash
npm run etl -- demo
```

> Os dados gerados por `demo` são **DEMONSTRATIVOS**. Ficam marcados no
> warehouse, produzem uma faixa de aviso permanente na interface, e o build
> aborta se `NETRANK_AMBIENTE=producao`.

### Rodar a aplicação

```bash
npm run dev                  # desenvolvimento
npm run build -w @netrank/web  # exportação estática em apps/web/out/
```

O resultado é um site estático: pode ser servido por Cloudflare Pages, Vercel,
Netlify ou qualquer CDN, sem servidor de aplicação nem banco em produção.

---

## Estrutura

```
packages/core/   Domínio e motor de cálculo (puro, testado)
packages/etl/    Coleta, ingestão, warehouse e construção de artefatos
apps/web/        Aplicação Next.js (exportação estática)
data/            Arquivos brutos, warehouse e overrides (fora do git)
```

### Por que SQLite + JSON estático em vez de Postgres + API

O mercado do RJ, agregado, cabe em poucos megabytes. Uma API consultada a cada
gráfico adicionaria latência, custo operacional e um ponto de falha para
resolver um problema de escala que este produto não tem. Os artefatos JSON
funcionam como *materialized views* servidas por CDN.

O SQL do warehouse é mantido próximo de ANSI e isolado numa camada própria:
migrar para PostgreSQL/Supabase é troca de driver, não reescrita.

---

## Princípios inegociáveis

1. **Nada é inventado.** Ausência de dado é `null` e aparece como `n/d` —
   nunca como zero, que mentiria. Um provedor que saiu de 0 para 500 acessos
   não cresceu infinito por cento: ele entrou no mercado.

2. **Cabeçalho desconhecido aborta a importação.** Se a Anatel renomear uma
   coluna, o pipeline falha com mensagem explícita dizendo qual campo estender,
   em vez de produzir um ranking silenciosamente errado.

3. **O controle de qualidade nunca corrige sozinho.** Ele observa e alerta.
   Um pipeline que "conserta" uma variação anormal destrói justamente o sinal
   que a plataforma existe para mostrar.

4. **O histórico nunca é truncado.** Reimportar um mês substitui apenas aquele
   mês.

5. **Dados demonstrativos jamais se misturam a dados reais**, e não chegam à
   produção.

---

## Testes

```bash
npm test
```

Cobrem os indicadores (market share, ranking com empates, CR-n, HHI,
crescimento), a normalização de empresas, a aritmética de competências e a
extração com filtro de UF.

---

## Estado atual

| Módulo | Situação |
|---|---|
| Ingestão Anatel, warehouse, qualidade | Funcionando |
| Ranking estadual e municipal, market share | Funcionando |
| Crescimento, retração, corrida do ranking | Funcionando |
| Perfis de município e de provedor | Funcionando |
| CR1/CR3/CR5/CR10, HHI | Funcionando |
| Expansão territorial, movimentações | Funcionando |
| Mapa de calor municipal | Treemap — falta a malha geográfica do IBGE |
| Filtros globais, exportação, compartilhamento | Não implementados |
| Painel administrativo | Não implementado |

### Limitações conhecidas

- **Os sinônimos de coluna do CSV da Anatel não foram validados contra o
  arquivo real** — o ambiente de desenvolvimento não tinha acesso de rede a
  `*.gov.br`. Se a grafia divergir, a importação falha com mensagem indicando
  exatamente qual campo estender em
  `packages/etl/src/sources/anatel.ts`.
- Os endpoints CKAN de descoberta seguem o padrão do dados.gov.br mas também
  não puderam ser testados em produção. O comando `descobrir` existe para que
  o operador confira antes de confiar.
- O mapa municipal é um treemap, não um coroplético. Incorporar a malha do
  IBGE é o próximo passo para essa funcionalidade.

---

Fonte: **Anatel — Agência Nacional de Telecomunicações**.
O NETRANK RJ é uma camada independente de análise e não possui vínculo com a
Agência. Indicadores de concentração são estatísticos e não constituem
conclusão jurídica ou regulatória.
