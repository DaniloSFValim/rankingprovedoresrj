# CI/CD Runbook - NETRANK RJ BI

## 🔄 Pipeline Overview

```
Commit → Lint & Type Check → Unit Tests → E2E Tests → 
Security Scan → Build → Deploy → Monitor
```

## 📋 GitHub Actions Workflows

### 1. **verificar** (Default CI)

Roda em: Push para `main`/`develop`, Pull Requests

```yaml
✓ Setup Node.js
✓ Install dependencies  
✓ Run linting
✓ TypeScript type check
✓ Run unit tests
✓ Run E2E tests
✓ Build for production
✓ Report artifacts
```

**Tempo esperado:** 5-8 minutos

**Branches afetadas:** main, develop, feature/*

### 2. **security** (Security Scanning)

Roda em: Push, PR, Diariamente (03:00 UTC)

```yaml
✓ npm audit (moderate level)
✓ Outdated packages check
✓ CodeQL analysis
✓ Software Composition Analysis
✓ Comentar resultados em PR
```

**Tempo esperado:** 3-5 minutos

### 3. **Cloudflare Workers** (Deployment)

Roda em: Push para `main`

```yaml
✓ Instancia Workers
✓ Deploy para production
✓ Generate preview URLs
✓ Report status
```

**Tempo esperado:** 2-3 minutos

## 🚀 Deploy Pipeline

### Local Development

```bash
# 1. Criar branch
git checkout -b feature/minha-feature

# 2. Fazer mudanças e testar localmente
npm run dev
npm run test
npm run test:e2e

# 3. Commit & Push
git commit -m "feat: minha feature"
git push -u origin feature/minha-feature
```

### Pull Request

```bash
# GitHub Actions roda automaticamente

# Verificar status:
# 1. Abra PR no GitHub
# 2. Veja "Checks" para status de cada job
# 3. Aguarde tudo estar ✓

# Se falhar:
# - Veja logs clicando em "Details"
# - Corrija o código localmente
# - Faça novo commit & push (atualiza PR automaticamente)
```

### Merge & Deploy

```bash
# Quando PR é aprovada e tudo está ✓:
# 1. Clique "Merge Pull Request"
# 2. Cloudflare Workers deploy inicia automaticamente
# 3. Monitorar em GitHub Actions tab

# Após deploy:
# - Production disponível
# - Verificar https://rankingprovedoresrj.com
# - Monitorar Web Vitals & errors
```

## ⚠️ Troubleshooting

### Workflow "verificar" Falha

#### Erro: "Type Checking Failed"

```bash
# Local
npx tsc --noEmit

# Fixar
# 1. Ver erro de tipo
# 2. Corrigir em seu código
# 3. Push novo commit
```

#### Erro: "Tests Failed"

```bash
# Local
npm run test        # Unit tests
npm run test:e2e    # E2E tests

# Fixar testes
# 1. Executar localmente
# 2. Fazer debug
# 3. Push correção
```

#### Erro: "Build Failed"

```bash
# Local
npm run build

# Causas comuns:
# - Import path incorreto
# - Componente sem 'use client'
# - Tipo faltando
# - CSS não gerado
```

### Workflow "security" Falha

#### "Critical Vulnerability Found"

```bash
# Ver qual package
npm audit

# Atualizar package
npm update vulnerable-package

# Testar
npm run test
npm run build

# Commit & push
git commit -am "fix: atualizar dependência vulnerável"
```

#### "Outdated Packages"

```bash
# Verificar
npm outdated

# Atualizar (com cuidado)
npm update package-name

# OU: agendar para depois
```

### Cloudflare Workers Deploy Falha

#### Status: "Failed"

1. Clique "View logs" em Actions
2. Procure por erro em logs
3. Causas comuns:
   - Build failed (veja CI errors)
   - Workers config inválida
   - File size limit excedido

**Solução típica:**
```bash
# Reduzir bundle size
npm run build
du -sh .next/

# Se > 20MB, verificar arquivos grandes
find .next -size +1M -type f
```

## 📊 Monitoramento

### Web Vitals em Produção

Checkpoints para verificar:

```
FCP (First Contentful Paint):
  - Esperado: < 1.8s
  - Warning: > 3s

LCP (Largest Contentful Paint):
  - Esperado: < 2.5s  
  - Warning: > 4s

CLS (Cumulative Layout Shift):
  - Esperado: < 0.1
  - Warning: > 0.25
```

### Performance Metrics

Acessar via Cloudflare Dashboard:
1. Login em Cloudflare
2. rankingprovedoresrj.com
3. Analytics → Performance

### Error Monitoring

Configurar alertas para:
- Erro rate > 5%
- Latência > 2s
- 5XX status codes

## 🔐 Security Checklist

### Antes de Deploy

- [ ] npm audit retorna 0 vulnerabilidades
- [ ] Testes E2E passando
- [ ] Type checking sem erros
- [ ] Nenhuma credencial em código
- [ ] Dependências atualizadas

### Após Deploy

- [ ] Site carrega normalmente
- [ ] Sem console errors
- [ ] Web Vitals dentro do esperado
- [ ] Sem erros em logs

## 📝 Common Workflows

### Hotfix para Bug Crítico

```bash
# 1. Checkout hotfix branch de main
git checkout main
git pull origin main
git checkout -b hotfix/bug-critico

# 2. Fazer fix rápido (mínimo)
# Evitar refactoring

# 3. Push & criar PR
git commit -am "fix: descrição do bug"
git push -u origin hotfix/bug-critico

# 4. No GitHub: criar PR
# - Mergear direto (sem muita revieww)
# - Deploy automático
```

### Agendado: Atualizar Dependências

```bash
# Criar branch de maintenance
git checkout -b chore/update-dependencies

# Atualizar
npm update
npm audit fix

# Rodar testes
npm run test
npm run build

# Commit & PR
git commit -am "chore: atualizar dependências"
git push -u origin chore/update-dependencies

# Criar PR para análise
```

### Feature com Testes

```bash
# Padrão recomendado
git checkout -b feature/nova-feature

# 1. Criar testes primeiro (TDD)
# echo "test('...', () => { ... })" > src/componentes/__tests__/Nova.test.tsx

# 2. Implementar feature
# src/componentes/Nova.tsx

# 3. Testar localmente
npm run test
npm run test:e2e

# 4. Commit detalhado
git commit -m "test: adicionar testes para Nova feature"
git commit -m "feat: implementar Nova feature"
git commit -m "docs: atualizar docs/desenvolvimento.md"

# 5. Push & PR
git push -u origin feature/nova-feature
```

## 🎯 Performance Targets

| Métrica | Target | Warning | Critical |
|---------|--------|---------|----------|
| Build Time | < 5min | > 7min | > 10min |
| Test Time | < 3min | > 4min | > 5min |
| Bundle Size | < 200KB | > 300KB | > 500KB |
| FCP | < 1.8s | > 3s | > 5s |
| LCP | < 2.5s | > 4s | > 6s |
| Error Rate | < 1% | > 5% | > 10% |

## 📞 Emergency Contacts

| Situação | Ação |
|----------|------|
| Site Down | Check GitHub Actions, Cloudflare status |
| High Error Rate | Check logs, rollback last deploy |
| Security Issue | Disable feature, security scan |
| Performance Degradation | Check Web Vitals, profile |

## 📚 Related Docs

- `docs/desenvolvimento.md` - Guia para desenvolvedores
- `PERFORMANCE_AUDIT.md` - Análise de performance
- `LOAD_TESTING.md` - Load testing guide
- `AUDIT_FINAL_REPORT.html` - Relatório de auditoria

---

**Atualizado em:** 2026-09-18
**Version:** 1.0
