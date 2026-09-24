# Guia de Desenvolvimento - NETRANK RJ BI

## 🚀 Começar Rápido

### Setup Inicial

```bash
# Clone e instale dependências
git clone https://github.com/DaniloSFValim/rankingprovedoresrj.git
cd rankingprovedoresrj
npm install

# Inicie o servidor de desenvolvimento
npm run dev
```

Aplicação disponível em: `http://localhost:3000`

## 📦 Estrutura do Projeto

```
rankingprovedoresrj/
├── apps/
│   └── web/                    # Aplicação Next.js (frontend)
│       ├── src/
│       │   ├── app/           # Rotas e páginas
│       │   ├── componentes/   # Componentes React
│       │   ├── lib/           # Utilitários e hooks
│       │   └── styles/        # CSS global
│       ├── e2e/               # Testes E2E Playwright
│       ├── public/            # Arquivos estáticos
│       └── package.json
├── packages/
│   ├── core/                  # Shared types e utilidades
│   └── etl/                   # Data transformation pipeline
├── AUDIT_FINAL_REPORT.html    # Relatório da auditoria
└── README.md
```

## 🧪 Testes

### Testes Unitários

```bash
# Executar testes
npm run test

# Com UI interativa
npm run test:ui

# Com coverage
npm run test:coverage
```

**Localização:** `apps/web/src/componentes/__tests__/`

**Framework:** Vitest + Testing Library

### Testes E2E

```bash
# Executar testes Playwright
npm run test:e2e

# Com UI de debugging
npm run test:e2e:ui

# Específico: testes de acessibilidade
npm run test:a11y
```

**Localização:** `apps/web/e2e/`

**Browsers:** Chromium + Firefox

### Load Testing

```bash
# Instalar k6 (uma vez)
brew install k6  # ou apt-get install k6

# Executar load tests
k6 run load-test.js
```

Veja `LOAD_TESTING.md` para configurações avançadas.

## 🔐 Security

### Verificar Vulnerabilidades

```bash
# Quick audit
npm run test:security

# Detailed report
npm audit
```

### GitHub Actions Automático

Security scanning roda:
- ✓ Em cada push para main/develop
- ✓ Em cada pull request
- ✓ Diariamente (03:00 UTC)

Relatórios disponíveis na aba "Security" do GitHub.

## 📊 Performance

### Build & Bundle Analysis

```bash
# Build para produção
npm run build

# Inspecionar tamanho de bundle
npm ls                    # Dependency tree
```

Otimizações implementadas:
- ✓ ECharts lazy-loaded (dynamic import)
- ✓ Image optimization (WebP/AVIF)
- ✓ CSS purging com Tailwind
- ✓ Code splitting por rota

Veja `PERFORMANCE_AUDIT.md` para detalhes.

### Monitorar Web Vitals em Produção

Para integrar Web Vitals tracking:

```typescript
import { initWebVitals } from '@/lib/web-vitals';

// Em seu layout/app root
useEffect(() => {
  initWebVitals();
}, []);
```

Métricas enviadas para: `/api/vitals`

## 🎨 Padrões de Código

### Componentes React

```typescript
// ✓ Use 'use client' para componentes interativos
'use client';

import { FC, ReactNode } from 'react';

interface MeuComponenteProps {
  titulo: string;
  conteudo: ReactNode;
}

export const MeuComponente: FC<MeuComponenteProps> = ({ titulo, conteudo }) => {
  return (
    <section>
      <h2>{titulo}</h2>
      {conteudo}
    </section>
  );
};
```

### Utilitários

```typescript
// ✓ Use functions tipadas em lib/
export function processar(dados: Dados[]): Resultado[] {
  return dados.map(item => ({...}));
}

// ✓ Typecheck automático com TypeScript strict
```

### Testes

```typescript
// ✓ Teste comportamento, não implementação
test('renderiza conteúdo quando dados carregam', () => {
  const { getByText } = render(<MeuComponente dados={dados} />);
  expect(getByText('Meu Conteúdo')).toBeInTheDocument();
});

// ✗ Não teste detalhes internos
// test('chama useState', () => { ... })
```

### Acessibilidade

```typescript
// ✓ Use semantic HTML
<button aria-label="Fechar menu">×</button>

// ✓ Role attributes quando necessário
<div role="progressbar" aria-valuenow={50} />

// ✓ Navegação por teclado suportada
<input onKeyDown={(e) => e.key === 'Enter' && handleSubmit()} />
```

## 🔄 Git Workflow

### Criar Feature Branch

```bash
# Criar branch a partir de main
git checkout main
git pull origin main
git checkout -b feature/sua-feature

# Fazer commits pequenos e descritivos
git commit -m "Adicionar filtro de ranking"
git commit -m "Melhorar performance do carregamento"
```

### Pull Request

1. Push sua branch: `git push -u origin feature/sua-feature`
2. Criar PR no GitHub
3. Aguardar CI (testes + security)
4. Pedir review
5. Merge quando aprovado

### Convenção de Commits

```
type(scope): descrição

feat: nova funcionalidade
fix: correção de bug
refactor: reorganização sem mudança funcional
perf: melhoria de performance
test: adicionar/melhorar testes
docs: atualizar documentação
chore: dependências, setup, etc
```

Exemplo:
```
feat(ranking): adicionar filtro por provedores
fix(comparador): resolver bug de seleção múltipla
perf(bundle): otimizar import de ECharts
```

## 📚 Tecnologias

### Core Stack

| Tecnologia | Versão | Propósito |
|-----------|--------|----------|
| Next.js | 15.1 | Framework React/SSR |
| React | 19.0 | UI Library |
| TypeScript | 5.3 | Type Safety |
| Tailwind CSS | 3.4 | Styling |
| ECharts | 5.5 | Visualizações |

### Testing & QA

| Tecnologia | Versão | Propósito |
|-----------|--------|----------|
| Vitest | 2.1 | Unit/Integration Tests |
| Testing Library | 15.0 | Component Testing |
| Playwright | 1.63 | E2E Tests |
| axe-core | 4.8 | Accessibility Testing |
| k6 | Latest | Load Testing |

### DevOps & Security

| Tecnologia | Propósito |
|-----------|----------|
| GitHub Actions | CI/CD Pipeline |
| Cloudflare Workers | Deployment |
| npm audit | Vulnerability Scanning |
| CodeQL | Code Analysis |

## 🐛 Debugging

### Browser DevTools

```javascript
// Inspecionar elemento
document.querySelector('[data-test="meu-elemento"]')

// Ver state de componente (React DevTools)
// Instalar extensão do React no Chrome/Firefox
```

### Console Logs Estruturados

```typescript
console.log({
  tipo: 'erro',
  modulo: 'ranking',
  mensagem: 'Falha ao carregar dados',
  dados: { statusCode: 404 }
});
```

### Playwright Debugging

```bash
# Pausar testes para debugging
PWDEBUG=1 npm run test:e2e

# Slowmo para ver ações
npx playwright test --headed --workers=1
```

## 📞 Suporte & Troubleshooting

### Problema: "Cannot find module '@/lib/algo'"

**Solução:** Verificar import path. `@/` aponta para `apps/web/src/`.

```typescript
// ✓ Correto
import { algo } from '@/lib/helper';

// ✗ Errado
import { algo } from '../../../lib/helper';
```

### Problema: "Testes falhando com 'Cannot set property'"

**Solução:** Vitest foi atualizado. Verificar que `vitest.config.ts` tem `setupFiles`.

### Problema: "Build falha com erro de TypeScript"

**Solução:** 
```bash
npm run lint    # Verificar erros
npx tsc --noEmit  # Type check completo
```

### Problema: "Performance ruim"

**Solução:**
1. Rodar build de produção: `npm run build`
2. Analisar bundle: `npm ls`
3. Ver `PERFORMANCE_AUDIT.md`
4. Executar load tests: `k6 run load-test.js`

## 📖 Recursos

- [Next.js Docs](https://nextjs.org/docs)
- [React Docs](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Playwright Testing](https://playwright.dev/docs/intro)
- [Vitest Guide](https://vitest.dev/)

---

**Atualizado em:** 2026-09-18
**Versão:** 1.0
