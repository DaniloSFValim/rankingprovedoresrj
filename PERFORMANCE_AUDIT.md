# Phase 7: Performance Audit

**Date**: 2026-09-18  
**Status**: In Progress

## Current Bundle Analysis

### JavaScript Bundle Size
```
Total: 2.1 MB
- chunks/576-*.js:         1,017 KB (ECharts library)
- chunks/framework-*.js:     214 KB (React, Next.js runtime)
- chunks/18-*.js:            170 KB (Chart components)
- chunks/87c73c54-*.js:      169 KB (Unknown)
- chunks/main-*.js:          126 KB (App code)
- chunks/polyfills-*.js:     110 KB (Polyfills)
```

### CSS Bundle Size
```
Total: 32 KB (Tailwind CSS - optimized)
```

### Images
```
Status: No images in /public
Images served: External/dynamic only
Optimization opportunity: Enable Next.js Image optimization
```

## Identified Issues

### 1. **ECharts Library Size (1 MB) - HIGH PRIORITY**
- **Problem**: Full echarts library imported in Grafico.tsx
- **Impact**: 1 MB of every page bundle
- **Solution Options**:
  - Option A: Dynamic lazy-load with React.lazy()
  - Option B: Tree-shake unused ECharts features
  - Option C: Use lightweight alternative (recharts)
  - **Recommended**: Option A (dynamic import)

### 2. **Image Optimization Disabled - MEDIUM PRIORITY**
- **Problem**: `images: { unoptimized: true }` in next.config.mjs
- **Impact**: No automatic image resizing, format conversion, or caching
- **Solution**: Enable image optimization (change to `unoptimized: false`)
- **Note**: Only affects dynamic/external images

### 3. **Unused CSS Analysis - LOW PRIORITY**
- **Status**: Tailwind CSS is already tree-shaken (32 KB is reasonable)
- **Action**: Monitor with `npm run build` for any growth

### 4. **Code Splitting Opportunity - MEDIUM PRIORITY**
- **Problem**: Large chunk (87c73c54-*.js at 169 KB)
- **Unknown**: Need to identify what this contains
- **Action**: Analyze with webpack-bundle-analyzer

## Performance Recommendations

| Priority | Issue | Action | Est. Savings |
|----------|-------|--------|--------------|
| HIGH | ECharts dynamic import | Lazy-load charts on demand | 600-800 KB |
| MEDIUM | Image optimization | Enable automatic optimization | 10-20% reduction |
| MEDIUM | Code splitting | Use dynamic imports for routes | 50-100 KB |
| LOW | CSS purging | Monitor Tailwind usage | 5-10 KB |

## Metrics to Track

- First Contentful Paint (FCP)
- Largest Contentful Paint (LCP)
- Cumulative Layout Shift (CLS)
- Time to Interactive (TTI)
- Total Bundle Size
- Gzipped Bundle Size

## Implementation Plan

**Phase 7.1**: Dynamic import for ECharts  
**Phase 7.2**: Enable Next.js image optimization  
**Phase 7.3**: Bundle analyzer setup and unused code detection  
**Phase 7.4**: Performance testing and monitoring  

---

Next: Begin Phase 7.1 (ECharts dynamic import optimization)
