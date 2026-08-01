'use client';

import { ConfigProvider, App, theme } from 'antd';
import ptBR from 'antd/locale/pt_BR';

export default function Providers({ children }) {
  return (
    <ConfigProvider
      locale={ptBR}
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#22c55e',
          colorInfo: '#22c55e',
          borderRadius: 12,
          fontSize: 15,
        },
        components: {
          Card: { paddingLG: 16 },
        },
      }}
    >
      <App>{children}</App>
    </ConfigProvider>
  );
}
