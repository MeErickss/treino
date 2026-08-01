'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarOutlined, UnorderedListOutlined, LineChartOutlined } from '@ant-design/icons';
import styles from './BottomNav.module.scss';

const items = [
  { href: '/', label: 'Hoje', icon: <CalendarOutlined /> },
  { href: '/rotinas', label: 'Rotinas', icon: <UnorderedListOutlined /> },
  { href: '/historico', label: 'Histórico', icon: <LineChartOutlined /> },
];

export default function BottomNav() {
  const path = usePathname();
  // esconde a navegação durante o treino, pra focar
  if (path?.startsWith('/treino')) return null;

  return (
    <nav className={styles.nav}>
      {items.map((it) => {
        const active = it.href === '/' ? path === '/' : path.startsWith(it.href);
        return (
          <Link key={it.href} href={it.href} className={active ? styles.active : undefined}>
            {it.icon}
            <span>{it.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
