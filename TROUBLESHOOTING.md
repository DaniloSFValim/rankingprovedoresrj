# Troubleshooting Guide - NETRANK RJ BI

## 🔧 Problemas Comuns

### 1. Setup & Installation

#### ❌ "npm install fails with peer dependency warning"

```bash
# Erro típico:
# npm ERR! code ERESOLVE
# npm ERR! ERESOLVE unable to resolve dependency tree

# Solução:
npm install --legacy-peer-deps
```

**Causa:** React 19 tem restrições de peer dependency com Testing Library

#### ❌ "Node version mismatch"

```bash
# Verificar versão
node --version
npm --version

# Esperado:
# Node: v20.x+
# npm: 10.x+

# Atualizar Node
# macOS: brew upgrade node
# Ou: nvm use 20
```

#### ❌ "Port 3000 already in use"

```bash
# Encontrar processo usando porta 3000
lsof -i :3000

# Matar processo
kill -9 <PID>

# OU usar porta diferente
PORT=3001 npm run dev
```

---

### 2. Development Issues

#### ❌ "Cannot find module '@/lib/algo'"

```typescript
// ✗ Errado
import { algo } from '../../../lib/algo';

// ✓ Correto (@ = src/)
import { algo } from '@/lib/algo';
```

**Causa:** Path alias `@` aponta para `apps/web/src/`

**Verificar:** `apps/web/tsconfig.json` tem:
```json
{
  "compilerOptions": {
    "paths": { "@/*": ["./src/*"] }
  }
}
```

#### ❌ "Component not rendering / 'use client' needed"

```typescript
// ✗ Errado - Usa hooks sem 'use client'
export default function Card() {
  const [state, setState] = useState(0); // ❌ Erro!
  return <div>{state}</div>;
}

// ✓ Correto
'use client';
import { useState } from 'react';

export default function Card() {
  const [state, setState] = useState(0);
  return <div>{state}</div>;
}
```

**Regra:** Use `'use client'` se componente usa hooks, context, ou event listeners

#### ❌ "Tailwind CSS not applying"

```bash
# Verificar se arquivo está no config
cat apps/web/tailwind.config.ts

# Deve incluir:
# content: ['./src/**/*.{js,ts,jsx,tsx}']

# Rebuild
npm run dev

# Se ainda não funciona:
rm -rf .next
npm run dev
```

#### ❌ "TypeScript error but code works locally"

```bash
# Rodar type check
npx tsc --noEmit

# Se mostra erros:
# 1. Verificar `tsconfig.json`
# 2. Adicionar tipos: `@types/pacote`
# 3. Use `as any` como último recurso (não ideal)

# Exemplo:
const data = (response as any).body; // ✗ Evitar
const data = (response as unknown as Data).body; // ✓ Melhor
```

---

### 3. Testing Issues

#### ❌ "Test file not found"

```bash
# Vitest procura em:
# - __tests__/ folder
# - .test.ts / .test.tsx files
# - .spec.ts / .spec.tsx files

# Exemplo correto:
apps/web/src/componentes/__tests__/Kpi.test.tsx
```

#### ❌ "Cannot set property testPath"

```bash
# Erro: vitest version mismatch
npm list vitest @vitest/ui

# Esperado:
# vitest: 2.1.0
# @vitest/ui: 2.1.0

# Atualizar se diferente:
npm install -D vitest@2.1.0 @vitest/ui@2.1.0
```

#### ❌ "toBeInTheDocument is not defined"

```typescript
// Falta import de setup

// ✓ Verificar vitest.setup.ts existe:
// import '@testing-library/jest-dom/vitest';

// ✓ Verificar vitest.config.ts tem:
// setupFiles: ['./vitest.setup.ts']

// ✓ Se ainda falhar, reimporte:
import { expect, test } from 'vitest';
import '@testing-library/jest-dom/vitest';
```

#### ❌ "E2E test timeout"

```typescript
// Aumentar timeout
test('slow test', async ({ page }) => {
  await page.goto('/heavy-page');
  // ❌ Padrão é 30s, pode ser insuficiente
  
  // ✓ Aumentar timeout específico
  await expect(page.locator('.loaded')).toBeVisible({ timeout: 60000 });
});
```

#### ❌ "Playwright: browser not found"

```bash
# Instalar browsers
npx playwright install

# OU verificar caminho
export PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers
npx playwright install
```

---

### 4. Build & Performance

#### ❌ "Build fails with 'Module not found'"

```bash
# Cause: Import path errado ou arquivo faltando

# Debug:
npm run build 2>&1 | grep "Module not found"

# Comum:
# - Arquivo deletado
# - Typo em import
# - Path alias errado
```

#### ❌ "Bundle too large (> 200KB)"

```bash
# Analisar
npm run build
npm ls

# Procurar culpados
du -sh .next/static/**/*.js | sort -h | tail -10

# Possível solução:
# 1. Dynamic import de biblioteca grande
# 2. Code splitting por rota
# 3. Tailwind CSS purging
```

**Exemplo - Dynamic Import:**

```typescript
// ✗ Import estático (incluído no bundle)
import Chart from 'echarts';

// ✓ Dynamic import (lazy loaded)
const Chart = dynamic(() => import('echarts'));
```

#### ❌ "Production build much slower than dev"

```bash
# Normal - dev é otimizado para DX, production para performance

# Medir
time npm run build

# Esperado: 2-5 minutos

# Se > 10 minutos:
# - Verificar hardware (RAM, CPU)
# - Verificar archivos muitos grandes
# - Limpar node_modules: rm -rf node_modules && npm install
```

---

### 5. Runtime Issues

#### ❌ "Hydration mismatch"

```typescript
// Causa: Server rendering != client rendering

// ❌ Errado
export default function Component() {
  const theme = localStorage.getItem('theme'); // ❌ Não existe no SSR!
  return <div>{theme}</div>;
}

// ✓ Correto
'use client';
import { useEffect, useState } from 'react';

export default function Component() {
  const [theme, setTheme] = useState(null);
  
  useEffect(() => {
    setTheme(localStorage.getItem('theme'));
  }, []);
  
  return theme ? <div>{theme}</div> : null;
}
```

#### ❌ "Memory leak warnings"

```bash
# Em testes ou dev:
# Warning: Can't perform a React state update on an unmounted component

# Solução: Cleanup effect
useEffect(() => {
  let isMounted = true;
  
  fetchData().then(data => {
    if (isMounted) setData(data); // ✓ Verifica se ainda montado
  });
  
  return () => {
    isMounted = false; // Cleanup
  };
}, []);
```

#### ❌ "Infinite loop de requisições"

```typescript
// ✗ Errado
useEffect(() => {
  fetchData(); // Sem dependências = roda toda renderização!
});

// ✓ Correto
useEffect(() => {
  fetchData();
}, []); // Empty dependency = roda uma vez
```

---

### 6. Deployment Issues

#### ❌ "Build succeeds locally but fails in CI"

```bash
# Causas comuns:
# 1. Ambiente diferente (versões)
# 2. Variáveis de ambiente faltando
# 3. Permission issues

# Verificar:
git status  # Arquivos não commitados?
npm run build
npm run test
```

#### ❌ "Cloudflare Workers Deploy fails"

```bash
# Ver logs
# 1. GitHub Actions → Workflows → Cloudflare
# 2. Clique em "Details"
# 3. Procure por erro

# Causas:
# - Build size > 20MB
# - Credenciais faltando
# - Workers config inválida

# Solução:
npm run build
du -sh .next/
```

#### ❌ "Site works in staging but not production"

```bash
# Checklist:
- [ ] DNS points to Cloudflare
- [ ] SSL/TLS configured
- [ ] Environment variables set
- [ ] Cache rules correct
- [ ] Origins are correct

# Debug via:
curl -i https://rankingprovedoresrj.com
```

---

### 7. Security & Dependencies

#### ❌ "npm audit found vulnerabilities"

```bash
# Ver detalhes
npm audit

# Atualizar packages
npm audit fix

# Se não resolve:
npm update package-name

# Ultimo recurso: aceitar risco
npm audit --legacy-peer-deps
```

#### ❌ "Dependência com versão conflitante"

```bash
# Ver árvore
npm ls react

# Se múltiplas versões de mesma lib:
# - Pode causar erros
# - Aumenta bundle

# Solução:
npm dedupe
npm install
```

---

## 🎯 Debugging Steps

### Passo 1: Isolar o Problema

```bash
# Limpar cache
rm -rf .next node_modules package-lock.json
npm install

# Rebuild
npm run build

# Testar
npm run dev
```

### Passo 2: Verificar Logs

```bash
# Compilação
npm run build 2>&1 | head -50

# Testes
npm run test 2>&1 | tail -100

# Desenvolvimento
npm run dev 2>&1
```

### Passo 3: Usar DevTools

```bash
# Browser DevTools (F12)
- Console tab: ver erros
- Network tab: ver requisições
- React DevTools: ver componentes
- Performance tab: timing

# VS Code Debugger
// .vscode/launch.json
{
  "type": "node",
  "request": "launch",
  "program": "${workspaceFolder}/node_modules/.bin/vitest"
}
```

### Passo 4: Criar Minimal Reproduction

```bash
# Se bug é complexo:
1. Criar arquivo test.tsx simples
2. Copiar código problemático
3. Simplificar até achar cause
4. Reportar com exemplo
```

---

## 📞 When to Escalate

| Situação | Ação |
|----------|------|
| Erro não resolve após 30min | Abrir GitHub Issue |
| CI bloqueado | Post no Slack #dev |
| Dados corrompidos | Contatar admin |
| Site down em produção | Chamada de emergência |

---

## 🔗 Resources

- GitHub Issues: https://github.com/DaniloSFValim/rankingprovedoresrj/issues
- VS Code Debugging: https://code.visualstudio.com/docs/editor/debugging
- React DevTools: https://chrome.google.com/webstore/detail/react-developer-tools/
- Playwright Inspector: `PWDEBUG=1 npm run test:e2e`

---

**Atualizado em:** 2026-09-18
