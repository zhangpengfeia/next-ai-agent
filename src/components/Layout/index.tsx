'use client'
import React from 'react';
import { LaptopOutlined, NotificationOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { Breadcrumb, Layout, theme } from 'antd';
import { AntdMenu } from './AntdMenu';
import { usePathname } from 'next/navigation';
import 'dayjs/locale/zh-cn';
import dayjs from 'dayjs';
dayjs.locale('zh-cn');

interface IProps {
  children: React.ReactNode,
}


const { Header, Content, Footer, Sider } = Layout;

const items: MenuProps['items'] = [
  {
    key: `/`,
    icon: React.createElement(NotificationOutlined),
    label: `Home`,
  },
  {
    key: `/test`,
    icon: React.createElement(LaptopOutlined),
    label: `AI智能机器人`,
  },
]

function findMenuLabelByKey(
  items: any[],
  key: string
): string | undefined {
  for (const item of items) {
    if (item && typeof item === 'object' && 'key' in item && item.key === key) {
      return typeof item.label === 'string'
        ? item.label
        : (item.label as any)?.props?.children || undefined;
    }
    // 只递归有 children 的项
    if (item && typeof item === 'object' && Array.isArray((item as any).children)) {
      const found = findMenuLabelByKey((item as any).children, key);
      if (found) return found;
    }
  }
  return undefined;
}
const App: React.FC<IProps> = ({children}) => {
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const currentLabel = findMenuLabelByKey(items, usePathname());
  return (
    <Layout>
      <Header style={{ display: 'flex', alignItems: 'center' }}>
        <div className="demo-logo" />
        {/* <Menu
          theme="dark"
          mode="horizontal"
          defaultSelectedKeys={['2']}
          items={items1}
          style={{ flex: 1, minWidth: 0 }}
        /> */}
      </Header>
      <div style={{ padding: '0 48px' }}>
       <Breadcrumb
          style={{ margin: '16px 0' }}
          items={[{ title: currentLabel }]}
        />
        <Layout
          style={{ padding: '24px 0', background: colorBgContainer, borderRadius: borderRadiusLG }}
        >
          <Sider style={{ background: colorBgContainer }} width={200}>
            <AntdMenu
              mode="inline"
              style={{ height: '800px' }}
              items={items}
            />
          </Sider>
          <Content style={{ padding: '0 24px', minHeight: 280 }}>
            {children}
          </Content>
        </Layout>
      </div>
      <Footer style={{ textAlign: 'center' }}>
        {new Date().getFullYear()}
      </Footer>
    </Layout>
  );
};

export default App;