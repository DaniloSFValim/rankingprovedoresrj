# Contexto do projeto

Decisões e limites que não estão evidentes no código. Leia antes de mudar
indicadores, alertas ou a forma de apresentar os dados.

## O que o painel é

Painel estático sobre os acessos de banda larga fixa nos 92 municípios do
Estado do Rio de Janeiro, a partir dos dados abertos da Anatel. Serve de apoio
ao monitoramento de serviços concedidos da Seconser (Niterói). É um trabalho
independente e citável (DOI 10.5281/zenodo.22839933), sem vínculo com a Anatel.

## Decisões

**O painel descreve, não classifica.** Os indicadores de concentração (CR-n,
HHI) são mostrados como números. Não rotulamos um mercado como "concentrado"
ou "competitivo", e não citamos limites regulatórios (como as faixas de HHI do
CADE): isso seria conclusão concorrencial, que o painel não faz.

**Os números são o que as prestadoras declaram.** Acessos, municípios e
velocidades vêm das declarações das prestadoras à Anatel. Velocidade é a
contratada, não a medida. Nada é corrigido, estimado ou preenchido: uma
competência ausente aparece como lacuna, nunca como zero.

**Alertas são sinais para verificação, não correções.** Nenhum número muda por
causa deles. Regras em `packages/etl/src/pipeline/alertas.ts`:

- *Saída abrupta*: a prestadora some do município e representava ao menos 20%
  da base do mês anterior e ao menos 100 acessos.
- *Densidade implausível*: acima de 100 acessos residenciais por 100
  domicílios, ou abaixo de 15 ao lado de um vizinho acima de 100.
- Só os alertas com evidência de erro (`temEvidencia`) ganham borda tracejada
  no mapa. Densidade acima de 100 sem vizinho baixo é típica de municípios de
  veraneio e fica apenas como aviso na página do município.

**Vizinhança vem da malha do IBGE.** Dois municípios são vizinhos quando as
fronteiras compartilham ao menos dois vértices, com coordenadas arredondadas a
4 casas. Um vértice só é contato em ponto e não conta.

**Junção sempre pelo código IBGE.** Nunca pelo nome do município: as grafias
divergem entre IBGE e Anatel ("Parati"/"Paraty", acentos).

**Identidade da empresa pela raiz do CNPJ.** O nome exibido passa por
`nomeParaExibicao` (só nomes inteiramente em maiúsculas viram "Título";
siglas como TIM, SKY e EIRELI ficam como estão). Os slugs não mudam com isso.

**A página do município compara com vizinhos, não com o Estado.** Posição no
ranking estadual e painéis do Estado foram removidos dela de propósito.

**Densidade** = acessos de pessoa física por 100 domicílios particulares
ocupados (IBGE, Censo 2022, tabela 4712).

## Limitações conhecidas dos dados

- **Itaboraí, jul/2026.** A Fiber Vox (10.812 acessos, cerca de 46% da base
  local) sumiu da base sem aparecer em nenhum outro município. O padrão é de
  falha de envio à Anatel, não de perda de clientes, mas isso não pode ser
  provado com dados públicos.
- **Paracambi e vizinhos.** Paracambi tem densidade 107, cercada por Engenheiro
  Paulo de Frontin (3,7) e Mendes (9,2). A Viva Telecom declara a base inteira
  no município-sede, o que sugere acessos dos vizinhos registrados em
  Paracambi. Também não é comprovável com dados públicos.
- **Densidade acima de 100** em municípios de veraneio (Búzios, Arraial do
  Cabo, Paraty etc.): casas de uso ocasional têm internet mas não entram na
  contagem de domicílios ocupados do Censo.

## Operação

- O site é exportação estática (Next.js) servida por um Cloudflare Worker.
  O deploy roda a cada push na `main` e após a ingestão.
- A ingestão (`dados-reais.yml`) roda no dia 12 de cada mês e pode ser
  disparada manualmente. Mudanças no ETL (`packages/etl`) só chegam ao site
  depois que a ingestão roda de novo; um merge não basta.
- Os artefatos JSON ficam em `apps/web/public/data`.

## Apresentação

Tema claro em azul-petróleo, fonte Public Sans. Evitamos elementos de
template: rótulos em caixa-alta, cartões idênticos, gradientes decorativos,
setas "→" em links. Texto em frase simples, sem emojis.
