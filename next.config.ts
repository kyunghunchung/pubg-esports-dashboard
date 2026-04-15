import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'export',
  // GitHub Pages: https://kyunghunchung.github.io/pubg-esports-dashboard/
  basePath: '/pubg-esports-dashboard',
  assetPrefix: '/pubg-esports-dashboard/',
  images: { unoptimized: true },
  // API Routes는 static export에서 동작하지 않으므로 제거됨
}

export default nextConfig
