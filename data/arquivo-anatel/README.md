# Arquivo das publicações da Anatel

Um retrato por publicação distinta da base de acessos de banda larga fixa da Anatel,
recorte do Estado do Rio de Janeiro. Serve para medir as revisões que a Anatel faz em
competências já publicadas.

- Gerado pelo comando `npm run etl -- arquivar`, a cada ingestão (`dados-reais.yml`).
- Só grava quando o conteúdo difere do último retrato.
- `indice.json` lista cada retrato: data da coleta, URL de origem, período, número de
  linhas, total de acessos e SHA-256 do CSV.

## Formato

CSV comprimido com gzip, ordenado, uma linha por competência × município × prestadora ×
tecnologia:

| Coluna | Conteúdo |
|---|---|
| `competencia` | AAAA-MM |
| `codigo_ibge` | Código IBGE do município (7 dígitos) |
| `empresa_id` | Identificador da prestadora no NETRANK (`cnpj:` + raiz do CNPJ) |
| `cnpj` | CNPJ declarado à Anatel |
| `tecnologia` | Tecnologia normalizada (FIBRA, CABO, RADIO etc.) |
| `acessos` | Acessos declarados |

## Limitações

- O primeiro retrato é de 17/11/2026 em diante. Versões anteriores da base não foram
  guardadas no nível de prestadora; o histórico do Git guarda só os artefatos agregados do
  site a partir de 16/09/2026.
- O período de cada retrato depende de quantos anos a ingestão baixou (`--anos`).
- Os números são os declarados pelas prestadoras, sem correção.

Fonte: Anatel, dados abertos. Dados sob CC BY 4.0, como o restante do repositório.
