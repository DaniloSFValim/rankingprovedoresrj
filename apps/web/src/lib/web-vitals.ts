/**
 * Web Vitals tracking para monitoramento de performance em produção
 * Coleta: FCP, LCP, CLS, TTFB, INP
 */

import { onCLS, onFCP, onINP, onLCP, onTTFB, type Metric } from 'web-vitals';

type VitalMetric = Metric & {
  rating: 'good' | 'needs-improvement' | 'poor';
};

const VITALS_THRESHOLDS = {
  FCP: { good: 1800, needsImprovement: 3000 },
  LCP: { good: 2500, needsImprovement: 4000 },
  CLS: { good: 0.1, needsImprovement: 0.25 },
  TTFB: { good: 600, needsImprovement: 1800 },
  INP: { good: 200, needsImprovement: 500 },
};

function getRating(metric: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  const thresholds = VITALS_THRESHOLDS[metric as keyof typeof VITALS_THRESHOLDS];
  if (!thresholds) return 'poor';

  if (value <= thresholds.good) return 'good';
  if (value <= thresholds.needsImprovement) return 'needs-improvement';
  return 'poor';
}

function sendMetric(metric: VitalMetric) {
  // Enviar para analytics backend
  if (typeof window !== 'undefined' && navigator.sendBeacon) {
    const data = JSON.stringify({
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      id: metric.id,
      url: window.location.href,
      timestamp: new Date().toISOString(),
    });

    navigator.sendBeacon('/api/vitals', data);
  }
}

export function initWebVitals() {
  if (typeof window === 'undefined') return;

  // First Contentful Paint
  onFCP((metric) => {
    const vitals: VitalMetric = {
      ...metric,
      rating: getRating('FCP', metric.value),
    };
    sendMetric(vitals);
  });

  // Largest Contentful Paint
  onLCP((metric) => {
    const vitals: VitalMetric = {
      ...metric,
      rating: getRating('LCP', metric.value),
    };
    sendMetric(vitals);
  });

  // Cumulative Layout Shift
  onCLS((metric) => {
    const vitals: VitalMetric = {
      ...metric,
      rating: getRating('CLS', metric.value),
    };
    sendMetric(vitals);
  });

  // Time to First Byte
  onTTFB((metric) => {
    const vitals: VitalMetric = {
      ...metric,
      rating: getRating('TTFB', metric.value),
    };
    sendMetric(vitals);
  });

  // Interaction to Next Paint (replaces FID)
  onINP((metric) => {
    const vitals: VitalMetric = {
      ...metric,
      rating: getRating('INP', metric.value),
    };
    sendMetric(vitals);
  });
}
