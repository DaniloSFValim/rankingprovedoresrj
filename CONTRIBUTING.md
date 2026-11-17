# Como contribuir

Contribuições são bem-vindas por issue ou pull request.

## Antes de abrir um pull request

1. Leia [`CONTEXT.md`](CONTEXT.md): ele registra decisões de método que não estão evidentes
   no código (o que o painel mostra, como trata dados declarados, o que não faz).
2. Rode a validação completa e a de navegador:

   ```bash
   npm ci
   npm run validar     # lint, tipos, testes, metadados e build
   npm run test:e2e    # depois do build
   ```

3. Mudanças em indicadores ou regras de dados precisam de teste em `packages/core` ou
   `packages/etl` e de nota no `CHANGELOG.md`, seção "Não publicado".

## Regras do projeto

- Os números publicados são os declarados à Anatel. Nada é corrigido, estimado ou
  preenchido; inconsistências viram alertas.
- Números citados em texto, documentação ou commit vêm dos artefatos, nunca de memória.
- O painel descreve e não classifica: não rotula mercados nem cita limites regulatórios.
- Textos em português, frases simples, sem emojis.
- Nunca versione `.env`, chaves ou dados pessoais.

## Licença das contribuições

Código contribuído é licenciado sob AGPL-3.0-only; documentação e dados, sob CC BY 4.0,
como o restante do repositório.
