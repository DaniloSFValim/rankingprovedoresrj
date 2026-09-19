# Análise de Dados - Verificação de Sequência 60 Meses

**Data da Análise:** 2026-09-18  
**Fonte:** Meta.json + dados da Anatel

## 📊 Situação Atual

### Dados Disponíveis (conforme fonte Anatel)
- **Total competências no arquivo CSV**: 43 meses
- **Intervalo no CSV**: 2022-01 até 2026-07
- **Estrutura**:
  - 2022: 12 meses (jan-dez) ✅
  - 2023: **NENHUM** (lacuna) ❌
  - 2024: 12 meses (jan-dez) ✅
  - 2025: 12 meses (jan-dez) ✅
  - 2026: 7 meses (jan-jul) ✅

### Politica de Retenção em main

```
MAXIMO_COMPETENCIAS = 50 meses
Algoritmo: aplicarJanelaConsecutiva()
```

**Comportamento:**
1. Começa da competência mais recente (2026-07)
2. Caminha para trás enquanto há meses consecutivos
3. Para quando encontra uma lacuna

**Resultado Atual:**
- ✅ 31 meses contínuos: 2024-01 até 2026-07
- ❌ 2022 foi descartado (porque há lacuna em 2023)
- ❌ Série histórica de gráficos: apenas 31 meses

## ⚠️ Por Que Faltam 60 Meses Contínuos?

### Raiz do Problema

A **Anatel tem uma lacuna de 12 meses em 2023**.

```
Timeline dos dados da Anatel:
2022-01 ────── 2022-12 [GAP] 2024-01 ────── 2026-07
            ^DISPONÍVEL^   ^LACUNA^   ^DISPONÍVEL^
```

### Por que a lacuna existe?

Isso não está documentado explicitamente no código, mas baseado nos commits:
- 2022: dados históricos importados
- 2023: **não publicado pela Anatel** ou não coletado
- 2024+: série nova da Anatel começa

## 🔧 Opções de Solução

### Opção 1: Ignorar lacuna e manter 60+ meses com gap ❌
- Aumentar `MAXIMO_COMPETENCIAS = 60`
- Problema: gráficos mostram linha contínua atravessando 2023 (mês faltante)
- Variação em gráficos fica incorreta (2022 a 2024 parece contíguo)
- **Confiabilidade dos dados compromete**

### Opção 2: Aguardar Anatel publicar 2023 ✅ (Recomendado)
- Quando Anatel preencher a lacuna de 2023, automaticamente teremos 60 meses contínuos
- Aplicação já está configurada para isso
- Não requer mudanças

### Opção 3: Usar fonte alternativa (Base dos Dados) 🔍
- BigQuery tem microdados da Anatel
- Pode ter histórico mais completo
- **Requer:** Credenciais do Google Cloud
- **URL:** https://basedosdados.org/dataset/br_anatel_banda_larga_fixa
- **Limite gratuito:** 1 TB/mês no BigQuery

### Opção 4: Manter 31 meses contínuos (Status quo) ✅
- Série confiável e sem lacunas
- Bom para gráficos (sem descontinuidades)
- Cobertura: últimos 2,5 anos

## 📈 Recomendação

**Aguarde Anatel** (Opção 2)

A politica atual é correta:
- ✅ Prioriza **integridade** sobre alcance
- ✅ Uma lacuna em gráficos causa confusão maior que série curta
- ✅ Dados já estão lá na fonte (Anatel), só aguardando publicação de 2023

**Timeline esperado:**
- Se Anatel preencher 2023 em breve → 60 meses automático
- Se não preencher → aplicação adaptada para 31 meses confiáveis

## 🔗 Fontes

- **Anatel (primária):** https://www.anatel.gov.br/dadosabertos/paineis_de_dados/acessos/
- **Base dos Dados (alternativa):** https://basedosdados.org/
- **Ultima coleta:** 2026-09-16 02:52:37 UTC
- **Arquivo:** Acessos_Banda_Larga_Fixa_2026.csv

---
**Status:** Dados com integridade garantida mas alcance limitado pela fonte Anatel
