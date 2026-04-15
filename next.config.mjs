/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  // GitHub Pages: https://kyunghunchung.github.io/pubg-esports-dashboard/
  basePath: '/pubg-esports-dashboard',
  assetPrefix: '/pubg-esports-dashboard/',
  images: { unoptimized: true },
}

export default nextConfig
