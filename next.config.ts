import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb'
    }
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // 忽略服务器端不需要的浏览器专用模块
      config.externals = [...(config.externals || []), 'pdf-parse']
      // 提供 Node.js 中不存在的模块的空 polyfill
      // config.resolve.fallback = {
      //   ...config.resolve.fallback,
      //   canvas: false,
      //   jsdom: false,
      //   bufferutil: false,
      //   'utf-8-validate': false
      // }
    }
    return config
  }
}

export default nextConfig
