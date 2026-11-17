# Dados, metodologia e rastreabilidade

Este documento descreve de onde vêm os dados, o que é feito com eles e o que o painel
publica. As decisões de método estão resumidas em [`CONTEXT.md`](../CONTEXT.md).

## Fontes

| Fonte | Publicador | Conteúdo usado | Acesso | Licença ou condição |
|---|---|---|---|---|
| Acessos de Banda Larga Fixa | Anatel | Acessos por prestadora (CNPJ), município (código IBGE), competência, velocidade contratada, tecnologia e tipo de pessoa | ZIP anual em `anatel.gov.br/dadosabertos`, localizado pelo inventário público de bases da Anatel | Dados abertos governamentais |
| Base dos Dados (alternativa) | Base dos Dados, a partir da Anatel | Mesma tabela, consultada no BigQuery | `basedosdados.org`, com conta no Google Cloud | Termos da Base dos Dados |
| Censo 2022, tabela 4712, variável 381 | IBGE (SIDRA) | Domicílios particulares permanentes ocupados por município | API do SIDRA | Dados abertos governamentais |
| Malha municipal e nomes oficiais | IBGE | Geometria dos 92 municípios e nomes oficiais | API de malhas e de localidades do IBGE | Dados abertos governamentais |
| CNPJ | Receita Federal, via BrasilAPI e Minha Receita | Razão social, situação cadastral, data de abertura e porte | APIs públicas sobre os dados abertos do CNPJ | Dados abertos governamentais |

Periodicidade: a ingestão roda no dia 12 de cada mês (GitHub Actions) e pode ser disparada
manualmente. O cadastro do CNPJ é renovado a cada 30 dias; domicílios e malha são fixos.

A procedência de cada publicação fica em `apps/web/public/data/meta.json`: fonte, URL,
nome do arquivo baixado, competência inicial e final, data de coleta e data de
processamento.

## Níveis de dado

O painel distingue quatro níveis, e nenhum número de um nível é apresentado como de outro.

| Nível | O que é | Onde fica |
|---|---|---|
| **Original** | Arquivo como publicado pela fonte, sem modificação | `data/raw/` (não versionado: grande e reprodutível) |
| **Tratado** | Linhas do RJ validadas, com prestadora identificada pela raiz do CNPJ | Warehouse SQLite `data/netrank.sqlite` |
| **Indicador calculado** | Participação, CR-n, HHI, ranking, densidade, variações | Artefatos JSON em `apps/web/public/data` |
| **Sinal de verificação** | Alertas de qualidade e marcações de mês preliminar ou de falha de declaração | Artefatos JSON, campos `alertas`, `retornoAposQueda`, `competenciaPreliminar` |

O painel não publica estimativas: não há interpolação, imputação nem projeção. Uma
competência ausente aparece como lacuna (`null`), nunca como zero ou valor estimado.

## Transformações

1. **Filtro geográfico.** Só linhas com UF = RJ e código IBGE começando por 33.
2. **Validação de linha.** São rejeitadas e contadas, por motivo, as linhas com competência
   inválida, código IBGE inválido, empresa sem nome ou acessos não numéricos.
3. **Identidade da prestadora.** Raiz do CNPJ (8 primeiros dígitos). Sem CNPJ, nome
   normalizado, com alerta `identidade_por_nome`. Grupos econômicos e correções conhecidas
   ficam em `data/metadata/prestadoras-identidade.json`.
4. **Nome exibido.** Nomes inteiramente em maiúsculas viram "Título", preservando siglas
   (TIM, SKY, EIRELI, S.A.). A identidade e os endereços das páginas não mudam com isso.
5. **Velocidade.** A velocidade contratada é agrupada em faixas: até 10 Mbps, 10 a 50,
   50 a 100, 100 a 300, 300 a 500, 500 Mbps a 1 Gbps e 1 Gbps ou mais. "Conexões lentas" é a
   parcela abaixo de 50 Mbps entre os acessos com velocidade informada.
6. **Junção territorial.** Sempre pelo código IBGE, nunca pelo nome do município.

## Indicadores

| Indicador | Definição |
|---|---|
| Participação de mercado | Acessos da prestadora ÷ total de acessos do recorte × 100 |
| CR-n | Soma das participações das *n* maiores (CR1, CR3, CR5, CR10) |
| HHI | Soma dos quadrados das participações, em pontos percentuais; de perto de 0 a 10.000 |
| Densidade | Acessos de pessoa física ÷ domicílios particulares ocupados (Censo 2022) × 100 |
| Variação mensal e em 12 meses | Diferença absoluta e percentual contra a mesma prestadora ou recorte no período anterior |
| Ranking | Ordem decrescente de acessos; empates recebem a mesma posição (1, 2, 2, 4) |

### Salto isolado na série do Estado

Mês que se afasta 5% ou mais da média dos dois vizinhos, enquanto os vizinhos ficam a até
3% entre si (`saltosIsolados`, em `packages/core/src/serie.ts`). Hoje marca out/2024. A
página inicial mostra o aviso abaixo do gráfico; o número não muda.

### O que os números medem e o que não medem

| Medida | É | Não é |
|---|---|---|
| Acessos | Contratos de banda larga fixa declarados pelas prestadoras à Anatel | Pessoas, domicílios ou empresas atendidas |
| Participação | Fatia da prestadora no total de acessos registrados no recorte | Participação em receita ou em cobertura de rede |
| Municípios atendidos | Municípios em que a prestadora declarou ao menos um acesso | Área coberta pela rede da prestadora |
| Densidade | Razão entre acessos de pessoa física e domicílios ocupados | Percentual de domicílios com internet (um domicílio pode ter mais de um acesso) |
| Velocidade | Velocidade contratada | Velocidade medida |

Sem dados de rede ou de domicílios atendidos, o painel não calcula cobertura. Os textos
usam "acessos registrados", "distribuição dos acessos" e "participação das prestadoras".

A densidade publicada pela Anatel não é usada: a série dela tem lacunas e valores
incompatíveis com os próprios acessos.

## Critérios e regras de apresentação

- **O mês mais recente é preliminar.** A Anatel o revisa para cima na publicação seguinte
  (julho de 2026 passou de 4.258.767 para 4.350.038 acessos). As movimentações comparam o
  penúltimo mês com o antepenúltimo; home e ranking avisam que o último mês é preliminar.
- **Piso nas movimentações.** Variação percentual e avanço no ranking só entram nas listas com
  ao menos 1.000 acessos no mês anterior (100 na visão de um município).
- **Retorno após queda isolada.** Se o mês anterior ficou abaixo de 50% do retrasado e o
  atual voltou a pelo menos 80% dele, a variação é atribuída à declaração, e o provedor sai das
  listas de movimentação e aparece numa lista à parte.
- **O painel descreve, não classifica.** Não rotula mercados como "concentrados" nem cita
  limites regulatórios.

## Qualidade e inconsistências

O controle de qualidade nunca altera, corrige ou remove um registro. Ele registra alertas:

| Alerta | Regra |
|---|---|
| `competencia_vazia` | Competência sem nenhuma linha do RJ |
| `variacao_anormal` | Variação mensal da prestadora de 30% ou mais (crítica a partir de 100%), com ao menos 500 acessos no mês anterior |
| `empresa_nova`, `empresa_desaparecida` | Entrada ou saída de prestadora relevante |
| `lacuna_na_serie` | Competência ausente entre a primeira e a última |
| `taxa_rejeicao_alta` | Proporção alta de linhas rejeitadas na validação |
| `tecnologia_nao_mapeada` | Tecnologia fora da tabela de correspondência |

No painel, cada município pode ter alertas de dados (`packages/etl/src/pipeline/alertas.ts`):
saída abrupta de prestadora (ao menos 20% da base e 100 acessos) e densidade implausível
(acima de 100, ou abaixo de 15 ao lado de vizinho acima de 100). Os que têm evidência de erro
recebem borda tracejada no mapa.

## Reprodução

Num ambiente com Node.js 20+, rede e alguns GB livres:

```bash
npm ci
npm run etl -- sincronizar --anos 2
npm run etl -- municipios
npm run etl -- malhas
npm run etl -- domicilios
npm run etl -- receita
npm run etl -- build
npm run build
```

O resultado deve coincidir com os artefatos versionados para as mesmas publicações da
Anatel. A Anatel revisa meses recentes, então uma reprodução feita depois de uma revisão
reflete os números revisados. O histórico do Git guarda cada versão publicada dos
artefatos.

## Limitações conhecidas

- Os dados são declaratórios: atrasos e erros de envio das prestadoras aparecem no painel
  (exemplos documentados em [`CONTEXT.md`](../CONTEXT.md): Itaboraí em julho de 2026 e
  Paracambi).
- Velocidade é a contratada, não a entregue nem a medida.
- Domicílios de uso ocasional não entram no Censo, o que eleva a densidade em municípios de
  veraneio.
- A classificação de tipo de atuação (operadora, provedor) é heurística e serve só como
  agrupamento descritivo.
