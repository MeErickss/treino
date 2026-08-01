import { AntdRegistry } from '@ant-design/nextjs-registry';
import Providers from './providers';
import BottomNav from '@/components/BottomNav';
import SWRegister from '@/components/SWRegister';
import './globals.scss';

export const metadata = {
  title: 'Treino',
  description: 'Meu treino pessoal — rotinas, cargas e progressão',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Treino',
  },
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
};

export const viewport = {
  themeColor: '#0f0f12',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>
        <AntdRegistry>
          <Providers>
            <main className="app-shell">{children}</main>
            <BottomNav />
          </Providers>
        </AntdRegistry>
        <SWRegister />
      </body>
    </html>
  );
}
