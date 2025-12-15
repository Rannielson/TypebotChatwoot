/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  
  // Variáveis de ambiente
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
  },
  
  // Configuração do Turbopack
  turbopack: {
    // Define o diretório raiz do workspace para evitar avisos sobre múltiplos lockfiles
    root: process.cwd(),
  },
  
  // Otimizações experimentais do Turbopack
  experimental: {
    // Habilita cache do sistema de arquivos do Turbopack para desenvolvimento
    // Isso acelera significativamente hot reload e recompilações
    turbopackFileSystemCacheForDev: true,
  },
  
  // Otimizações de compilação
  compiler: {
    // Remove console.log em produção (reduz tamanho do bundle)
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  
  // Otimizações de compressão
  compress: true,
  
  // Otimizações de imagens
  images: {
    // Formato moderno para melhor compressão
    formats: ['image/avif', 'image/webp'],
    // Limite de tamanho para otimização automática
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Domínios permitidos para otimização de imagens
    remotePatterns: [],
  },
  
  // Otimizações de produção
  productionBrowserSourceMaps: false, // Desabilita source maps em produção para reduzir tamanho
  poweredByHeader: false, // Remove header X-Powered-By para segurança
  
  // Otimizações de bundle
  swcMinify: true, // Usa SWC para minificação (mais rápido que Terser)
  
  // Otimizações de headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
