/** @type {import('next').NextConfig} */
const nextConfig = {
  // Exportacao estatica: todas as paginas sao geradas no build e servidas por
  // CDN. Ver docs/adr/0001-arquitetura.md para a justificativa.
  output: 'export',
  images: { unoptimized: true },
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
