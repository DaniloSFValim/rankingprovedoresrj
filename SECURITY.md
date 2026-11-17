# Segurança

## Superfície

O site publicado é estático: não há API, banco de dados, autenticação, formulários nem
dados de usuários. Ele lê apenas arquivos do próprio domínio. A ingestão roda no GitHub
Actions, com segredos guardados como segredos do repositório.

## Controles

| Área | Controle |
|---|---|
| Cabeçalhos HTTP | `apps/web/public/_headers`: Content-Security-Policy restrita ao próprio domínio, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy` |
| XSS | React escapa o conteúdo das páginas; nos tooltips dos gráficos, que aceitam HTML, os nomes vindos de dados de terceiros passam por `escaparHtml` (`apps/web/src/lib/formato.ts`). Não há `dangerouslySetInnerHTML` |
| SQL | O warehouse SQLite só é usado pela ingestão; as consultas usam parâmetros, nunca concatenação de valores |
| Segredos | Nenhum segredo no repositório nem no site. `.env` está no `.gitignore`; os nomes das variáveis estão em [`.env.example`](.env.example). Na ingestão e no deploy, segredos vêm de `secrets` do GitHub |
| Dados pessoais | O site não coleta dados. Só guarda no `localStorage` do navegador a última cidade escolhida |
| Dependências | `npm audit` no CI (falha em alta ou crítica) e CodeQL |
| Integridade da publicação | O deploy recusa artefatos marcados como demonstrativos |

## Limitações conhecidas

- A CSP permite `'unsafe-inline'` em scripts e estilos: a exportação estática do Next.js
  embute scripts de hidratação no HTML, e o ECharts aplica estilos nos elementos. Sem
  servidor, não há como gerar nonces por requisição.
- Os cabeçalhos de `_headers` só valem na publicação pelo Cloudflare Workers; `npm run
  preview` não os aplica.

## Como relatar uma vulnerabilidade

Abra um aviso privado em *Security → Report a vulnerability* no repositório do GitHub. Não
abra issue pública com detalhes de exploração.
