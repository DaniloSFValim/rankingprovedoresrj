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

### Malha geográfica do mapa

A Anatel publica os acessos, mas não a geometria dos municípios. A malha vem da
**API de malhas territoriais do IBGE** e as duas bases se juntam pelo código
IBGE de 7 dígitos:

```bash
npm run etl -- malhas
```

Isso grava `apps/web/public/data/malhas/rj-municipios.json`. A junção é sempre
por **código**, nunca por nome — grafias divergem entre IBGE e Anatel
(`Parati`/`Paraty`, acentuação inconsistente) e casar por nome perderia
municípios em silêncio.

Sem a malha, o mapa **não desenha formas aproximadas**: cai automaticamente
para um treemap com área proporcional ao mercado e cor pela métrica escolhida.
A informação é a mesma; o que não acontece é inventar geografia.

---

## Como visualizar e publicar

### Localmente

```bash
npm install
npm run etl -- demo     # ou a ingestão real, acima
npm run dev             # http://localhost:3000
```

Para conferir exatamente o que vai ao ar:

```bash
npm run build           # gera apps/web/out/
npm run preview         # serve a exportação estática
```

### Publicar

O resultado é um **site estático**: sem servidor de aplicação e sem banco em
produção. Os dados são arquivos JSON gerados antes do build.

#### Cloudflare Pages (configuração usada neste repositório)

O diretório `apps/web/out/` está **versionado no git**. O Cloudflare Pages
serve esses arquivos diretamente, sem etapa de build:

| Campo | Valor |
|---|---|
| Framework preset | `None` |
| Build command | *(deixar vazio)* |
| Build output directory | `apps/web/out` |
| Root directory | *(deixar vazio — a raiz do repositório)* |

Conecte o repositório em **Workers & Pages → Create → Pages → Connect to Git**,
selecione a branch de produção e publique. Cada `git push` republica.

> **Contrapartida:** HTML versionado envelhece. Depois de qualquer execução do
> ETL ou mudança no front-end, é preciso rodar `npm run build` e commitar o
> `apps/web/out/` atualizado, senão o site publicado diverge dos dados.
>
> Para eliminar esse risco, basta deixar o Cloudflare construir: preencha
> *Build command* com `npm run build` e mantenha a mesma saída. Aí o
> `apps/web/out/` pode voltar a ser ignorado pelo git.

#### Outras plataformas

| Plataforma | Configuração | O que fazer |
|---|---|---|
| Netlify | `netlify.toml` | Conectar o repositório; já está configurado |
| Vercel | `vercel.json` | Conectar o repositório; já está configurado |
| Qualquer CDN / S3 | — | Subir o conteúdo de `apps/web/out/` |

Defina `NETRANK_AMBIENTE=producao` no ambiente de build. Com essa variável, o
build **aborta** se o warehouse contiver dados demonstrativos — a salvaguarda
que impede fixture sintética de ir ao ar como se fosse dado da Anatel.

### Ciclo de atualização mensal

```bash
npm run etl -- descobrir
npm run etl -- atualizar <url-da-nova-competência>
npm run etl -- status      # conferir os alertas de qualidade
npm run build

git add apps/web/out && git commit -m "Atualiza dados para <competência>" && git push
```

O último passo é o que publica: o Cloudflare Pages republica a cada push.

O histórico anterior é preservado: a importação substitui apenas as
competências presentes no arquivo.

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
| Mapa do Estado | Coroplético via IBGE (`etl -- malhas`), com treemap como alternativa |
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
- Os endpoints da API de malhas do IBGE seguem a documentação pública, mas
  também não puderam ser testados. O caminho de renderização do mapa
  coroplético **ainda não foi exercitado contra geometria real**; a alternativa
  em treemap está testada e é o que aparece enquanto a malha não existir.

---

Fonte: **Anatel — Agência Nacional de Telecomunicações**.
O NETRANK RJ é uma camada independente de análise e não possui vínculo com a
Agência. Indicadores de concentração são estatísticos e não constituem
conclusão jurídica ou regulatória.
