/** @type {import('next').NextConfig} */
const nextConfig = {
  // Exportacao estatica: todas as paginas sao geradas no build e servidas por
  // CDN. Ver docs/adr/0001-arquitetura.md para a justificativa.
  output: 'export',
  // Enable image optimization for automatic format conversion and caching
  // This applies to next/image components and dynamic images
  images: {
    unoptimized: false,
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  trailingSlash: true,
  transpilePackages: ['@netrank/core'],
  // @netrank/core usa imports ESM com extensao .js apontando para fontes .ts
  // (verbatimModuleSyntax). O webpack precisa dessa equivalencia explicita.
  webpack: (config) => {
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js'],
      '.mjs': ['.mts', '.mjs'],
    };
    return config;
  },
};
export default nextConfig;
