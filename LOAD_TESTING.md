# Load Testing - NETRANK RJ BI

## Overview

Load testing com k6 para validar performance da plataforma sob carga. O arquivo `load-test.js` implementa um cenário realista de usuários acessando as páginas críticas.

## Setup

### Instalar k6

**macOS:**
```bash
brew install k6
```

**Linux:**
```bash
sudo apt-get install k6
```

**Windows:**
```bash
choco install k6
```

Ou baixar em: https://k6.io/docs/getting-started/installation/

## Executar Load Tests

### Execução Básica

```bash
k6 run load-test.js
```

### Com URL Customizada

```bash
BASE_URL=https://rankingprovedoresrj.com k6 run load-test.js
```

### Com Estágios (Ramp-up/Ramp-down)

```bash
k6 run --stage 30s:50 --stage 1m:100 --stage 30s:0 load-test.js
```

Isso significa:
- 30 segundos ramping up para 50 usuários virtuais
- 1 minuto mantendo 100 usuários virtuais
- 30 segundos ramping down para 0 usuários

### Output JSON para Análise

```bash
k6 run -o json=results.json load-test.js
```

## Métricas Coletadas

- **page_load_time**: Duração total de carregamento de página
- **api_response_time**: Tempo de resposta de API
- **errors**: Taxa de erros
- **successful_requests**: Contador de requisições bem-sucedidas
- **failed_requests**: Contador de requisições com falha

## Limites (Thresholds)

O teste define limites de aceitação:

```
- p95 < 500ms:  95% das requisições devem ser respondidas em menos de 500ms
- p99 < 1000ms: 99% das requisições devem ser respondidas em menos de 1s
- Erro rate < 10%: Menos de 10% de falhas
- Error rate < 5%: Menos de 5% de erros
```

Se algum threshold falhar, o teste retorna código de saída 1.

## Cenários Testados

### 1. Homepage
- Validar carregamento
- Verificar presença da navbar
- Tempo de resposta < 3s

### 2. Ranking Page
- Carregamento da tabela
- Tempo de resposta < 2s

### 3. Municipalities Page
- Carregamento de página
- Tempo de resposta < 2.5s

### 4. Comparison Page
- Carregamento do comparador
- Tempo de resposta < 3s

## Integração em CI/CD

Para rodar load tests em CI/CD (ex: GitHub Actions):

```yaml
- name: Install k6
  run: |
    sudo apt-get install -y k6

- name: Run load tests
  run: |
    k6 run load-test.js
  continue-on-error: false
```

## Análise de Resultados

### Interpretar Relatório

```
page_load_time (Trend):
  avg: 1250ms   # Média
  p95: 2100ms   # 95º percentil
  p99: 2800ms   # 99º percentil

errors (Rate):
  2.5%          # Taxa de erro

successful_requests (Counter):
  450           # Total de requisições bem-sucedidas
```

### Red Flags

- **p95/p99 > limites**: Página pode estar lenta sob carga
- **Error rate > 5%**: Possível instabilidade ou timeout
- **Memory spikes**: Possível memory leak

## Performance Benchmarks

### Targets Esperados

```
Homepage:
  - avg: < 1500ms
  - p95: < 2500ms
  
Ranking:
  - avg: < 1200ms
  - p95: < 2000ms
  
Comparison:
  - avg: < 1500ms
  - p95: < 2500ms
```

## Troubleshooting

### "Connection refused"

```bash
# Garantir que servidor está rodando
npm run dev
```

### "Too many open files"

Aumentar limite de file descriptors:

```bash
ulimit -n 65536
k6 run load-test.js
```

### "Threshold Failed"

Se thresholds falham:
1. Aumentar carga gradualmente (não de 0 a 1000 VUs)
2. Verificar performance da máquina (CPU, RAM)
3. Verificar logs do servidor por erros
4. Revisar queries de banco de dados

## Resources

- [k6 Documentation](https://k6.io/docs/)
- [k6 API Reference](https://k6.io/docs/javascript-api/)
- [Performance Testing Guide](https://k6.io/docs/guides/)

---

**Última atualização:** 2026-09-18
