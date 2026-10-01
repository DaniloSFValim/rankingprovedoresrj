# NETRANK RJ

Leia o contexto do projeto antes de mudar indicadores, alertas, textos ou a
apresentação dos dados:

@CONTEXT.md

## Comandos

```bash
npm test                      # testes de todos os pacotes
npm run build -w @netrank/web # site estático em apps/web/out
npm run etl -- build          # artefatos JSON (precisa de data/netrank.sqlite)
```

## Lembretes

- Mudança no ETL (`packages/etl`) só chega ao site depois de uma nova ingestão
  (workflow `dados-reais.yml`); o merge não basta.
- Textos em português, frase simples, sem emojis nem caixa-alta decorativa.
- Nunca inventar dados: números citados em texto ou commit vêm dos artefatos.
