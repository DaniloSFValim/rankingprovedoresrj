/**
 * Bundle Analyzer - Analisa tamanho de bundle
 *
 * Uso:
 * node scripts/analyze-bundle.js
 */

const fs = require('fs');
const path = require('path');

function getDirectorySize(dir) {
  let size = 0;

  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stats = fs.statSync(filePath);

    if (stats.isDirectory()) {
      size += getDirectorySize(filePath);
    } else {
      size += stats.size;
    }
  }

  return size;
}

function formatBytes(bytes) {
  const sizes = ['B', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 B';

  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
}

function analyzeBundle() {
  const nextDir = path.join(__dirname, '../.next');

  if (!fs.existsSync(nextDir)) {
    console.error('❌ .next directory not found. Run: npm run build');
    process.exit(1);
  }

  console.log('\n📊 Bundle Analysis Report\n');
  console.log('=' .repeat(50));

  const subdirs = {
    'static/chunks': 'JavaScript Chunks',
    'static/css': 'CSS Files',
    'static/media': 'Media Files',
    'static/font': 'Fonts',
    'server': 'Server Code',
  };

  let totalSize = 0;
  const breakdown = [];

  for (const [subdir, label] of Object.entries(subdirs)) {
    const fullPath = path.join(nextDir, subdir);

    if (fs.existsSync(fullPath)) {
      const size = getDirectorySize(fullPath);
      breakdown.push({ label, size });
      totalSize += size;

      console.log(`\n${label}:`);
      console.log(`  Size: ${formatBytes(size)}`);

      // Listar arquivos top 3
      const files = [];
      function listFiles(dir, prefix = '') {
        const items = fs.readdirSync(dir);
        for (const item of items) {
          const itemPath = path.join(dir, item);
          const stats = fs.statSync(itemPath);
          if (stats.isFile()) {
            files.push({ name: prefix + item, size: stats.size });
          } else if (stats.isDirectory()) {
            listFiles(itemPath, prefix + item + '/');
          }
        }
      }

      listFiles(fullPath);
      files.sort((a, b) => b.size - a.size);

      console.log(`  Top files:`);
      for (let i = 0; i < Math.min(3, files.length); i++) {
        console.log(`    - ${files[i].name}: ${formatBytes(files[i].size)}`);
      }
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`\nTotal Bundle Size: ${formatBytes(totalSize)}\n`);

  // Breakdown chart
  console.log('📈 Breakdown:\n');
  breakdown.sort((a, b) => b.size - a.size);

  for (const item of breakdown) {
    const percent = ((item.size / totalSize) * 100).toFixed(1);
    const barLength = Math.round((item.size / totalSize) * 30);
    const bar = '█'.repeat(barLength) + '░'.repeat(30 - barLength);

    console.log(`${item.label.padEnd(20)} ${bar} ${percent}%`);
  }

  // Recommendations
  console.log('\n💡 Optimization Suggestions:\n');

  const jsSize = breakdown.find(b => b.label === 'JavaScript Chunks')?.size || 0;
  const cssSize = breakdown.find(b => b.label === 'CSS Files')?.size || 0;

  if (jsSize > 200000) {
    console.log('⚠️  JavaScript bundle is large (> 200KB)');
    console.log('   → Consider code splitting by route');
    console.log('   → Check for unused dependencies');
  }

  if (cssSize > 50000) {
    console.log('⚠️  CSS bundle is large (> 50KB)');
    console.log('   → Enable Tailwind CSS purging');
    console.log('   → Remove unused utilities');
  }

  console.log('\n✅ Run: npm run build && node scripts/analyze-bundle.js');
  console.log('   to track bundle size over time\n');
}

analyzeBundle();
