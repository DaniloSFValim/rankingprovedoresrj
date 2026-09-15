/** @type {import('next').NextConfig} */
const nextConfig = {
  // Exportacao estatica: todas as paginas sao geradas no build e servidas por
  // CDN. Ver docs/adr/0001-arquitetura.md para a justificativa.
  output: 'export',
  images: { unoptimized: true },
  trailingSlash: true,
  transpilePackages: ['@netrank/core'],
};
export default nextConfig;
