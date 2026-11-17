# Declaração de uso de inteligência artificial

O NETRANK RJ foi desenvolvido por Danilo Valim com assistência de um assistente de
programação baseado em inteligência artificial (Claude Code, da Anthropic). Esta
declaração registra o que foi feito com essa assistência e o que permaneceu sob
responsabilidade do autor.

## Responsabilidade do autor

- Concepção do projeto, escopo e objetivo da plataforma.
- Escolha das fontes de dados públicas e do recorte geográfico.
- Decisões de método registradas em [`CONTEXT.md`](../CONTEXT.md), entre elas: o painel
  descreve e não classifica mercados; piso de base nas listas de movimentação; exclusão
  dos retornos após falha de declaração; tratamento do último mês como preliminar.
- Revisão e aprovação de cada mudança antes da incorporação ao ramo principal.
- Validação dos resultados contra os dados publicados pelas fontes.
- Responsabilidade pelo conteúdo publicado, pelas conclusões e por eventuais erros.

## Uso do assistente de IA

- Escrita e revisão de código (ETL, cálculo de indicadores, interface).
- Escrita de testes automatizados e da configuração de integração contínua.
- Redação e revisão de documentação.
- Auditoria técnica de segurança, acessibilidade, desempenho e coerência dos dados.

O assistente não gerou, estimou nem alterou dados. Todos os números publicados vêm das
bases públicas citadas, processadas pelo código do repositório, e são conferidos pelos
testes de integridade.

## Rastreabilidade

Os commits feitos com o assistente trazem a linha `Co-Authored-By: Claude` na mensagem.
Em 17/11/2026, 48 dos 72 commits do histórico (sem contar os de merge) têm essa marca. O
histórico do Git não foi reescrito.
