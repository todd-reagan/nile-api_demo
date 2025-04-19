/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true
  },
  trailingSlash: false,
  // Remove assetPrefix as it's causing issues with next/font
}

module.exports = nextConfig
