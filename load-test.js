/**
 * Load Testing com k6
 *
 * Execução:
 * k6 run load-test.js
 *
 * Com estágios:
 * k6 run --stage 30s:50 --stage 1m:100 --stage 30s:0 load-test.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Métricas customizadas
const errorRate = new Rate('errors');
const pageLoadTime = new Trend('page_load_time');
const apiResponseTime = new Trend('api_response_time');
const successfulRequests = new Counter('successful_requests');
const failedRequests = new Counter('failed_requests');

export const options = {
  stages: [
    { duration: '30s', target: 50 },   // Ramp-up to 50 VUs
    { duration: '1m', target: 100 },   // Ramp-up to 100 VUs
    { duration: '30s', target: 0 },    // Ramp-down to 0 VUs
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],  // 95% requests < 500ms
    http_req_failed: ['rate<0.1'],                    // < 10% fail rate
    errors: ['rate<0.05'],                            // < 5% error rate
  },
};

export default function () {
  // Homepage
  group('Homepage', () => {
    const res = http.get(`${BASE_URL}/`);
    pageLoadTime.add(res.timings.duration);

    check(res, {
      'status is 200': (r) => r.status === 200,
      'load time < 3s': (r) => r.timings.duration < 3000,
      'contains navbar': (r) => r.body.includes('Navegação'),
    });

    if (res.status === 200) {
      successfulRequests.add(1);
    } else {
      failedRequests.add(1);
      errorRate.add(1);
    }
  });

  sleep(1);

  // Ranking page
  group('Ranking Page', () => {
    const res = http.get(`${BASE_URL}/ranking/`);
    pageLoadTime.add(res.timings.duration);

    check(res, {
      'status is 200': (r) => r.status === 200,
      'has ranking table': (r) => r.body.includes('table') || r.body.includes('ranking'),
      'response time < 2s': (r) => r.timings.duration < 2000,
    });

    if (res.status === 200) {
      successfulRequests.add(1);
    } else {
      failedRequests.add(1);
      errorRate.add(1);
    }
  });

  sleep(1);

  // Municipios page
  group('Municipalities Page', () => {
    const res = http.get(`${BASE_URL}/municipios/`);
    pageLoadTime.add(res.timings.duration);

    check(res, {
      'status is 200': (r) => r.status === 200,
      'page loads': (r) => r.timings.duration < 2500,
    });

    if (res.status === 200) {
      successfulRequests.add(1);
    } else {
      failedRequests.add(1);
      errorRate.add(1);
    }
  });

  sleep(1);

  // Comparison page
  group('Comparison Page', () => {
    const res = http.get(`${BASE_URL}/compara/municipios/`);
    pageLoadTime.add(res.timings.duration);

    check(res, {
      'status is 200': (r) => r.status === 200,
      'comparison loads': (r) => r.timings.duration < 3000,
    });

    if (res.status === 200) {
      successfulRequests.add(1);
    } else {
      failedRequests.add(1);
      errorRate.add(1);
    }
  });

  sleep(Math.random() * 3 + 2);  // Random sleep 2-5 seconds
}

export function handleSummary(data) {
  return {
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
    'load-test-results.json': JSON.stringify(data),
  };
}

function textSummary(data, options = {}) {
  const { indent = '', enableColors = false } = options;

  let summary = '\n=== Load Test Summary ===\n';

  if (data.metrics) {
    for (const [key, metric] of Object.entries(data.metrics)) {
      if (metric.values && metric.type === 'Trend') {
        summary += `${indent}${key}:\n`;
        summary += `${indent}  avg: ${Math.round(metric.values.avg || 0)}ms\n`;
        summary += `${indent}  p95: ${Math.round(metric.values['p(95)'] || 0)}ms\n`;
        summary += `${indent}  p99: ${Math.round(metric.values['p(99)'] || 0)}ms\n`;
      } else if (metric.values && (metric.type === 'Counter' || metric.type === 'Rate')) {
        summary += `${indent}${key}: ${Math.round(metric.values.value || 0)}\n`;
      }
    }
  }

  return summary;
}
