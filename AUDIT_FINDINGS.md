# AUDITORIA INTEGRADA - NETRANK RJ BI
**Data:** 2026-09-18  
**Status:** Em Progresso  
**Autor:** Claude Haiku 4.5

---

## EXECUTIVO

Auditoria sistemática do NETRANK RJ identificou **16 problemas críticos** distribuídos em 5 categorias:
1. **Duplicação de Código** (2 problemas)
2. **Código Morto** (11 componentes/funções)
3. **Acessibilidade** (2 problemas)
4. **Qualidade de Dados** (1 problema)
5. **Organização** (1 problema)

**Impacto:** Redução de complexidade (~500 LOC remocíveis), melhoria de manutenibilidade, conformidade com WCAG.

---

## 1. DUPLICAÇÃO DE CÓDIGO

### 1.1 Dois Módulos de Exportação de Dados ✅ CORRIGIDO

**Status:** CONSOLIDADO - exportacao.ts absorveu exportar.ts

---

### 1.2 Comparadores de Municípios e Provedores (NOVO ACHADO)

**Arquivos:**
- `apps/web/src/app/compara/municipios/page.tsx` (437 LOC)
- `apps/web/src/app/compara/prestadoras/page.tsx` (465 LOC)

**Problema:**
Estrutura idêntica em ambas as páginas:
- Mesma arquitetura de estado (indice, selecionadas, loading, error)
- Mesma lógica de carregamento dinâmico
- Mesmos padrões de renderização
- Apenas nomes de interfaces e campos diferem

**Exemplo de Duplicação:**
```typescript
// compara/municipios/page.tsx
interface Municipio {
  codigoIbge: string; slug: string; nome: string;
  totalAcessos: number; numeroProvedores: number;
}

// compara/prestadoras/page.tsx
interface Provedor {
  id: string; slug: string; nome: string;
  acessos: number; marketShare: number; posicao: number;
}
```

**Recomendação:** REFATORAR em componente genérico `<Comparador<T>>` com:
- Props: `tipo: 'municipios' | 'provedores'`
- Carregamento genérico via callbacks
- Redução potencial: ~200 LOC

**Severidade:** MÉDIA (impacta manutenção futura)  
**Status:** PENDENTE (complexidade: refatoração estrutural)

---

**Arquivo:** `apps/web/src/lib/exportacao.ts` e `apps/web/src/lib/exportar.ts`

**Problema:**
- `exportacao.ts`: Exporta funções diretas `paraCSV()`, `paraJSON()`, download via browser
- `exportar.ts`: Fornece metadados de datasets e lista de exports disponíveis
- Ambas contêm lógica de conversão CSV (linhas 17-35 em exportacao.ts vs 23-35 em exportar.ts)
- Nomes e assinaturas diferentes causam confusão

**Duplicação Específica:**
```typescript
// exportacao.ts:
function downloadArquivo(conteudo: string, nomeArquivo: string, tipo: string)

// exportar.ts:
export function converterParaCsv(dados: Array<Record<string, any>>): string
```

**Recomendação:** CONSOLIDAR em um único módulo com separação clara de responsabilidades.

---

## 2. CÓDIGO MORTO (11 PROBLEMAS)

### 2.1 Componentes Não Utilizados

| Componente | Localização | Status | Ação |
|:--|:--|:--|:--|
| `LoadingFallback.tsx` | `src/componentes/` | Nunca importado | ❌ Remover |
| `ResponsiveTable.tsx` | `src/componentes/` | Nunca importado | ❌ Remover |
| `A11yFeatures.tsx` | `src/componentes/` | Nunca importado | ❌ Remover |
| `FiltrosAvancados.tsx` | `src/componentes/` | Nunca importado | ❌ Remover |
| `BotoesExportacao.tsx` | `src/componentes/` | Nunca importado | ❌ Remover |
| `MapaCoberturaProvedores.tsx` | `src/componentes/` | Nunca importado | ❌ Remover |

**Total:** 6 componentes = ~400 LOC remocíveis

### 2.2 Funções de Dados Não Utilizadas

| Função | Localização | Última Ref | Ação |
|:--|:--|:--|:--|
| `lerCorrida()` | `apps/web/src/lib/dados.ts` | L231 | ❌ Remover (nunca chamada) |
| `lerTecnologia()` | `apps/web/src/lib/dados.ts` | L293 | ❌ Remover (nunca chamada) |

---

## 3. ACESSIBILIDADE (WCAG 2.1)

### 3.1 Atributo Redundante em Kpi.tsx

**Localização:** `apps/web/src/componentes/Kpi.tsx:28`

**Problema:**
```typescript
{unidade && <span className="text-sm text-grafite-400" aria-hidden="false">{unidade}</span>}
```

`aria-hidden="false"` é redundante. Remover melhora semântica.

**Severidade:** BAIXA (impacto mínimo, apenas redundância)  
**Ação:** Remover atributo

### 3.2 Falta de Aria-label em TabelaRanking.tsx

**Localização:** `apps/web/src/componentes/TabelaRanking.tsx:65-73`

**Problema:**
```typescript
<span className={`ml-2 text-xs ${corVariacao(linha.variacaoPosicao)}`}>
  {setaVariacao(linha.variacaoPosicao)}         {/* Sem aria-label */}
  {Math.abs(linha.variacaoPosicao)}
</span>
```

Screen readers não conseguem interpretar o ícone (▲/▼) ou o número.

**Badge "NOVO"** também carece de contexto:
```typescript
<span className="ml-2 rounded bg-marca-500/20 px-1.5 py-0.5 text-[10px] font-medium text-marca-300">
  NOVO                    {/* Sem aria-label explicativo */}
</span>
```

**Severidade:** MÉDIA (afeta inclusão)  
**Ação:** Adicionar aria-label explicativo

---

## 4. QUALIDADE DE DADOS

### 4.1 Anomalias de CNPJs (Já Documentadas em IMPLEMENTATION_STATUS.md)

**Status:** Requer auditoria com Receita Federal  
**Empresas Afetadas:**
- Leste Telecom: 4 CNPJs distintos (🔴 CRÍTICO)
- CLARO: 2 CNPJs (92 municípios = anomalia)
- OI: 2 CNPJs (92 municípios = anomalia)

---

## 5. ORGANIZAÇÃO

### 5.1 Padrão de Nomenclatura Inconsistente

**Problema:** Arquivos de exportação usam nomes conflitantes:
- `exportacao.ts` (português)
- `exportar.ts` (português)

Ambos em inglês nos comentários. Recomenda-se consistência.

---

## PLANO DE IMPLEMENTAÇÃO

### FASE 1: Remover Código Morto (30 min)
- [ ] Remover 6 componentes não utilizados
- [ ] Remover `lerCorrida()` e `lerTecnologia()` de dados.ts
- [ ] Verificar imports em IMPLEMENTATION_STATUS.md
- [ ] Commit: "Remove dead code: 6 unused components + 2 data functions"

### FASE 2: Consolidar Exportação (15 min)
- [ ] Mesclar `exportacao.ts` + `exportar.ts`
- [ ] Manter funções de download direto + metadata de datasets
- [ ] Testar em página `/dados/`
- [ ] Commit: "Consolidate: merge exportacao.ts + exportar.ts"

### FASE 3: Acessibilidade (10 min)
- [ ] Remover `aria-hidden="false"` de Kpi.tsx
- [ ] Adicionar `aria-label` em TabelaRanking.tsx
- [ ] Testar com leitor de tela
- [ ] Commit: "Fix accessibility: aria-labels + remove redundant attributes"

---

## RESUMO FINAL

| Categoria | Problemas | Severidade | Status |
|:--|:--|:--|:--|
| Duplicação | 2 | MÉDIA | Pendente |
| Código Morto | 8 | BAIXA | Pendente |
| Acessibilidade | 2 | MÉDIA | Pendente |
| Dados | 1 | CRÍTICA | Requer auditoria |
| **TOTAL** | **13** | — | — |

