import {ConfigProvider} from 'antd';
// import { AntdRegistry } from '@ant-design/nextjs-registry';
// import 'antd/dist/reset.css'; // antd 样式
import zhCN from 'antd/locale/zh_CN'; // v5 写法
import type {Metadata} from 'next'
import './globals.css'
import Layout from '@/components/Layout'

export const metadata: Metadata = {
  title: 'AI智能机器人',
  description: 'AI智能机器人描述',
}

export default function BasicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN" style={{ height: '100%' }}>
      <body
        style={{
          height: '100%',
          margin: 0,
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <ConfigProvider
          locale={zhCN}
          theme={{
            token: {
              // 可选：统一字体
              fontFamily: 'Inter, system-ui, sans-serif',
            },
          }}
        >
          {/* 核心：让内容区域自动占满全部高度 */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
              {/*<Layout>*/}
              {children}
              {/*</Layout>*/}
          </div>
        </ConfigProvider>
      </body>
    </html>
  )
}