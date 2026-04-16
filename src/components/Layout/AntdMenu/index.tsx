import { Menu } from 'antd';
import { useEffect, useState } from 'react';
import type { MenuProps } from 'antd';
import { useRouter,usePathname } from 'next/navigation';

type MenuItem = Required<MenuProps>['items'][number];

interface AntdMenuProps {
    items: MenuItem[];
    mode?: 'horizontal' | 'vertical' | 'inline';
    theme?: 'light' | 'dark';
    className?: string;
    style?: React.CSSProperties;
    inlineCollapsed?: boolean;
}

function hasChildren(
    item: MenuItem
  ): item is Extract<MenuItem, { children: MenuItem[] }> {
    return (
      !!item &&
      typeof item === 'object' &&
      Array.isArray((item as any).children)
    );
}

export const AntdMenu = ({
    items,
    mode = 'horizontal',
    theme = 'light',
    className,
    style,
    inlineCollapsed
}: AntdMenuProps) => {
    const router = useRouter();
    const pathname = usePathname();
    const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  // 根据当前路由设置选中的菜单项
    useEffect(() => {
          // 递归查找匹配当前路径的菜单项
        const getSelectedKeys = (pathname: string, menuItems: MenuItem[]): string[] => {
            for (const item of menuItems || []) {
                if (item?.key && typeof item.key === 'string') {
                    // 精确匹配
                    if (item.key === pathname) {
                        return [item.key];
                    }
                    // 前缀匹配（用于子路由）
                    if (pathname.startsWith(item.key) && item.key !== '/') {
                        return [item.key];
                    }
                }
                // 递归检查子菜单
                if (hasChildren(item)) {
                    const childKeys = getSelectedKeys(pathname, item.children);
                    if (childKeys.length > 0) {
                        return childKeys;
                    }
                }
            }
            return [];
        };
        const keys = getSelectedKeys(pathname, items);
        setSelectedKeys(keys);
    }, [pathname, items]);

    // 处理菜单点击事件
    const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
        if (typeof key === 'string') {
            router.push(key);
        }
    };
    return (
        <Menu
            mode={mode}
            theme={theme}
            selectedKeys={selectedKeys}
            items={items}
            onClick={handleMenuClick}
            className={className}
            style={style}
            inlineCollapsed={inlineCollapsed}
        />
    );
};