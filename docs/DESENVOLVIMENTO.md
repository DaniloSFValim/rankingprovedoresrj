# Desenvolvimento e operação

## Ambiente

- Node.js 20 ou superior (o CI usa 22) e npm.
- Nenhuma credencial é necessária para instalar, testar ou compilar o site.
- A ingestão (`npm run etl`) precisa de rede para os portais públicos e compila o
  `better-sqlite3` (módulo nativo). Variáveis opcionais em [`.env.example`](../.env.example).

```bash
npm ci
npm run dev        # http://localhost:3000, servidor de desenvolvimento
npm run build      # exportação estática em apps/web/out
npm run preview    # serve apps/web/out
```

## Comandos

| Comando | O que faz |
|---|---|
| `npm run lint` | ESLint 9 (regras do Next.js e do TypeScript) em todo o monorepo |
| `npm run typecheck` | `tsc --noEmit` em `core`, `etl` e `web` |
| `npm test` | Vitest: `core` e `etl` (inclui integridade dos artefatos) e depois o site (componentes, jsdom) |
| `npm run test:pacotes` | Só os testes de `core` e `etl` |
| `npm run check-metadata` | Versão, título, licença e DOI coerentes entre `package.json`, `CITATION.cff`, `.zenodo.json` e o rodapé; schema do CFF 1.2.0; dígito verificador do ORCID |
| `npm run build` | Compila o site |
| `npm run test:e2e` | Playwright sobre `apps/web/out` (rode o build antes): fluxos, axe-core WCAG 2.1 AA, rolagem horizontal, desktop e celular |
| `npm run validar` | Lint, typecheck, testes, metadados e build em sequência |
| `npm run etl -- <comando>` | CLI de ingestão; `npm run etl` sem argumento lista os comandos |

Para os testes de navegador num ambiente que já tem Chromium e não pode baixá-lo, aponte
`PLAYWRIGHT_CHROMIUM` para o executável. No CI o Playwright instala o próprio navegador.

## Testes

| Tipo | Onde | O que cobre |
|---|---|---|
| Unitários | `packages/core/src/__tests__` | Participação, CR-n, HHI, ranking com empates, competências, normalização |
| Unitários e integração | `packages/etl/src/__tests__` | Extração com arquivos reais de amostra, sincronização, alertas, artefatos gerados a partir de fixture, movimentações |
| Integridade dos dados | `packages/etl/src/__tests__/integridade-artefatos.test.ts` | Os JSON publicados: somas fecham com o total, participações somam 100%, CR crescente, HHI coerente com o ranking, 92 municípios com código IBGE válido, um arquivo por município e provedor, lacunas como `null` |
| Componentes | `apps/web/src/componentes/__tests__` | Componentes React em jsdom |
| Navegador | `apps/web/e2e/site.spec.ts` | Carregamento sem erro de console, um único `main`, acessibilidade WCAG 2.1 AA, ausência de rolagem horizontal, navegação ranking → provedor, 404, rodapé e citação; em desktop e celular |

## Integração contínua

`.github/workflows/ci.yml` roda a cada push e pull request:

1. `npm ci`
2. lint, typecheck e testes
3. verificação dos metadados de citação
4. build
5. testes de navegador sobre o build (job separado)

`security.yml` roda `npm audit` (falha em vulnerabilidade alta ou crítica) e CodeQL.

## Publicação

- `deploy.yml` publica `apps/web/out` no Cloudflare Workers (`wrangler.toml`, só arquivos
  estáticos) a cada push em `main` e ao fim de cada ingestão. Recusa publicar se
  `meta.json` estiver marcado como dados demonstrativos.
- Segredos do repositório: `CLOUDFLARE_API_TOKEN` e `CLOUDFLARE_ACCOUNT_ID`; na ingestão
  pela Base dos Dados, `GCP_SERVICE_ACCOUNT_JSON`; opcional, `DADOS_GOV_BR_API_KEY`.
- Os cabeçalhos de segurança (CSP, `X-Frame-Options`, `nosniff`, `Referrer-Policy`,
  `Permissions-Policy`) estão em `apps/web/public/_headers`.

## Ingestão mensal

`dados-reais.yml` roda no dia 12 às 09:00 UTC e pode ser disparada manualmente (fonte,
anos, URL específica, malha). Ela testa o motor de cálculo, baixa e importa os dados,
atualiza nomes, malha, domicílios e cadastro, reconstrói os artefatos, confere que não são
demonstrativos e os commita em `main`. Mudanças no ETL só chegam ao site depois de uma nova
ingestão.

## Nova versão citável

1. Atualize a versão em `package.json`, `CITATION.cff`, `.zenodo.json` e
   `apps/web/src/lib/citacao.json` e registre as mudanças no `CHANGELOG.md`.
2. Rode `npm run check-metadata`.
3. Crie a release no GitHub (tag `vX.Y.Z`). Com a integração GitHub–Zenodo ativa, o Zenodo
   arquiva a release e cria um DOI de versão sob o mesmo DOI de conceito.
4. Rode `node scripts/atualiza-citacao.mjs` para trazer o registro novo do Zenodo para o
   rodapé.

## Problemas comuns

| Sintoma | Causa e solução |
|---|---|
| O site compila, mas mostra "Sem dados carregados" | Faltam os artefatos em `apps/web/public/data`; restaure-os do Git ou rode o ETL |
| Ingestão falha por espaço em disco | Os arquivos da Anatel passam de 1 GB descompactados; libere espaço ou use `--anos 1` |
| `better-sqlite3` não compila | Instale as ferramentas de compilação do sistema (no Debian/Ubuntu, `build-essential` e `python3`) |
| Testes e2e não acham o navegador | Rode `npx playwright install chromium` ou defina `PLAYWRIGHT_CHROMIUM` |
