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
      config.externals = [
        ...(config.externals || []),
        // Ant Design 相关（前端 UI 库）
        '@ant-design/x',
        '@ant-design/x-card',
        '@ant-design/x-markdown',
        '@ant-design/x-sdk',
        'antd',
        'antd-style',
        '@ant-design/icons',
        // 路由相关
        'react-router-dom',
        // PDF 处理相关（需要浏览器 API）
        'pdf-parse',
        'pdfjs-dist',
        '@napi-rs/canvas',
        'canvas'
      ]
      // 提供 Node.js 中不存在的模块的空 polyfill
      config.resolve.fallback = {
        ...config.resolve.fallback,
        canvas: false,
        jsdom: false,
        bufferutil: false,
        'utf-8-validate': false
      }
    }
    return config
  }
}

export default nextConfig
