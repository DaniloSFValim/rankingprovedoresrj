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

# Automático: descobre, baixa e importa os anos mais recentes
npm run etl -- sincronizar --anos 5

# Ou passo a passo, para inspecionar antes
npm run etl -- descobrir
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

Isso grava `apps/web/public/data/malhas/rj-municipios.json`. A malha também é a
**fonte dos nomes dos municípios**: a Base dos Dados entrega apenas o código
IBGE, e o IBGE é a autoridade sobre a nomenclatura oficial. A junção é sempre
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

#### Cloudflare Workers (configuração deste repositório)

O `wrangler.toml` na raiz publica o site como **static assets only**: não há
código de Worker, apenas os arquivos da exportação estática.

| Campo | Valor |
|---|---|
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |

O `name` no `wrangler.toml` **precisa ser igual ao nome do Worker** criado no
painel. Um nome diferente faz o deploy criar outro Worker em vez de atualizar
o existente.

Duas armadilhas já resolvidas no arquivo, que valem conhecer:

- **Sem `wrangler.toml`, o deploy falha** num monorepo com `Cloudflare
  application detection logic has been run in the root of a workspace`. O
  wrangler se recusa a adivinhar qual workspace publicar.
- **`not_found_handling = "404-page"` é obrigatório.** Ao contrário do Pages,
  o Workers não deduz o comportamento de 404 a partir da presença de
  `404.html` — sem a configuração explícita, responde 404 sem corpo.

Validar a configuração sem publicar:

```bash
npx wrangler deploy --dry-run
```

Os arquivos `_headers` e `_redirects` são suportados nativamente, desde que
estejam dentro do diretório de assets — o `_headers` deste projeto fica em
`apps/web/public/`, que o Next copia para a saída.

#### Cloudflare Pages (alternativa)

Conecte o repositório em **Workers & Pages → Create → Pages → Connect to Git**.
Duas configurações funcionam — escolha uma:

**A) Cloudflare constrói (recomendado)**

| Campo | Valor |
|---|---|
| Framework preset | `Next.js (Static HTML Export)` ou `None` |
| Build command | `npm run build` |
| Build output directory | `apps/web/out` |

Os artefatos em `apps/web/public/data/` são versionados, então o build funciona
num clone limpo. Mudanças no front-end entram no ar sem ninguém precisar
lembrar de recompilar.

**B) Publicar o HTML já compilado**

| Campo | Valor |
|---|---|
| Framework preset | `None` |
| Build command | *(vazio)* |
| Build output directory | `apps/web/out` |

Deploy em segundos, sem instalar dependências. A contrapartida é que o
`apps/web/out/` versionado envelhece: depois de qualquer mudança é preciso
rodar `npm run build` e commitar a saída.

> **Nos dois casos**, rodar o ETL na Cloudflare não funciona: o ambiente de
> build usa npm restrito e não executa os scripts de instalação dos módulos
> nativos (`better-sqlite3`). O ETL roda na sua máquina ou em CI comum.

#### Outras plataformas

| Plataforma | Configuração | O que fazer |
|---|---|---|
| Netlify | `netlify.toml` | Conectar o repositório; já está configurado |
| Vercel | `vercel.json` | Conectar o repositório; já está configurado |
| Qualquer CDN / S3 | — | Subir o conteúdo de `apps/web/out/` |

Defina `NETRANK_AMBIENTE=producao` no ambiente de build. Com essa variável, o
build **aborta** se o warehouse contiver dados demonstrativos — a salvaguarda
que impede fixture sintética de ir ao ar como se fosse dado da Anatel.

### Anatel — endereço confirmado (caminho padrão)

O arquivo de acessos de banda larga fixa fica em:

```
https://www.anatel.gov.br/dadosabertos/paineis_de_dados/acessos/acessos_banda_larga_fixa.zip
```

São ~995 MB contendo **toda a série histórica** — não é particionado por ano.

Esse endereço não foi deduzido: a descoberta por catálogo falhou
repetidamente, e ele foi obtido por **sondagem** e confirmado contra o próprio
servidor da Anatel. Se um dia parar de responder:

```bash
npm run etl -- sondar            # testa as variações conhecidas
npm run etl -- sondar <url>      # confere um link antes de baixar 1 GB
```

O arquivo nunca precisa passar pela sua máquina: o runner do GitHub baixa,
o filtro `UF = RJ` roda linha a linha durante a leitura, e apenas o recorte do
Rio de Janeiro — menos de 1 MB — é commitado.

### Base dos Dados (BigQuery) — alternativa

A descoberta automática no portal da Anatel se mostrou inviável: a API do
dados.gov.br responde **HTTP 401** e exige chave vinculada a perfil de
Administrador de Organização, e o inventário público raramente traz link
direto de arquivo.

A [Base dos Dados](https://basedosdados.org) mantém os microdados de acessos
de banda larga fixa da Anatel tratados e consultáveis via BigQuery.

```bash
npm run etl -- bdd-inspecionar          # descreve o schema remoto
npm run etl -- bdd-importar --anos 2    # importa o RJ
```

**O schema não é codificado.** Ao contrário de um CSV, o BigQuery é
introspectável: o pipeline consulta `INFORMATION_SCHEMA`, escolhe a tabela de
microdados e mapeia as colunas por sinônimos. Se a Base dos Dados renomear um
campo, o comando falha dizendo qual sinônimo estender — não produz ranking
errado.

O filtro `UF = RJ` e a agregação acontecem **no servidor**, não no cliente:
milhões de linhas nacionais viram alguns milhares de linhas do Rio de Janeiro
antes de trafegar. É o princípio do §37 aplicado a uma fonte remota.

**Credenciais.** A consulta é cobrada no *seu* projeto do Google Cloud (camada
gratuita: 1 TB/mês, muito acima do necessário); a Base dos Dados hospeda os
dados, mas não paga a consulta.

| Onde | Nome | Conteúdo |
|---|---|---|
| Secret | `GCP_SERVICE_ACCOUNT_JSON` | JSON da conta de serviço |
| Variable | `GCP_PROJECT_ID` | ID do projeto no Google Cloud |

**Procedência.** Os números continuam sendo da Anatel, mas passam por
tratamento de terceiro. A página de Metodologia declara isso explicitamente
como *"Anatel, via Base dos Dados"* — atribuir tudo diretamente à Agência
esconderia uma camada de processamento que não é dela nem nossa.

### Ingestão automática (GitHub Actions)

A ingestão não roda no build da Cloudflare: o ambiente usa npm restrito e não
compila módulos nativos. O workflow `.github/workflows/dados-reais.yml` faz o
trabalho num runner do GitHub, que tem rede liberada e compila normalmente.

**Actions → Ingerir dados reais da Anatel → Run workflow**

| Parâmetro | Padrão | O que faz |
|---|---|---|
| `fonte` | `anatel` | `anatel` (endereço confirmado) ou `basedosdados` (BigQuery) |
| `anos` | `5` | Quantos anos mais recentes importar |
| `url` | vazio | URL de um recurso específico; ignora a descoberta automática |
| `malhas` | marcado | Baixa também a malha municipal do IBGE |

O workflow roda os testes antes de tocar nos dados, importa, baixa a malha,
reconstrói artefatos e site, **verifica que os artefatos não estão marcados
como demonstrativos** e só então commita. O push dispara o deploy.

Também roda sozinho no dia 12 de cada mês. Se os dados não mudaram, não
commita nada.

A malha é opcional dentro do workflow (`continue-on-error`): se o IBGE estiver
fora do ar, o mapa continua como treemap e o resto da atualização não se perde.

### Ciclo de atualização mensal

```bash
npm run etl -- sincronizar --anos 5   # descobre, baixa e importa sozinho
npm run etl -- malhas                 # malha municipal do IBGE
# ou, com o GeoJSON já baixado:
npm run etl -- malhas --arquivo caminho/rj-municipios.json
npm run etl -- status                 # conferir os alertas de qualidade
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
| Ingestão via Base dos Dados (BigQuery) | Implementada, aguardando credenciais |
| Ingestão automatizada em CI | Workflow pronto |
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
