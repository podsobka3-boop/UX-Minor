import { useEffect, useState } from 'react';
import { App as AntApp, ConfigProvider, theme } from 'antd';
import ruRU from 'antd/locale/ru_RU';
import App from './App';

const light = {
  colorBgLayout: '#F7F5F0',
  colorBgContainer: '#FFFFFF',
  colorBgElevated: '#FFFFFF',
  colorText: '#1F2328',
  colorTextSecondary: '#6B7280',
  colorBorder: '#E5E1D8',
  colorBorderSecondary: '#E5E1D8',
  colorPrimary: '#3B6E5A',
  colorWarning: '#E8A33D',
  colorSuccess: '#2F9E44',
  colorError: '#C92A2A',
};
const dark = {
  colorBgLayout: '#1A1B1E',
  colorBgContainer: '#25262B',
  colorBgElevated: '#25262B',
  colorText: '#E9ECEF',
  colorTextSecondary: '#9AA0A6',
  colorBorder: '#373A40',
  colorBorderSecondary: '#373A40',
  colorPrimary: '#6FAF94',
  colorWarning: '#F2B85B',
  colorSuccess: '#51CF66',
  colorError: '#FF6B6B',
};

function useDarkMode() {
  const query = '(prefers-color-scheme: dark)';
  const [isDark, setDark] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const fn = (e: MediaQueryListEvent) => setDark(e.matches);
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);
  return isDark;
}

export default function Root() {
  const isDark = useDarkMode();
  return (
    <ConfigProvider
      locale={ruRU}
      theme={{
        algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          ...(isDark ? dark : light),
          fontFamily: "'Inter', system-ui, sans-serif",
          fontSize: 16,
          borderRadius: 12,
        },
      }}
    >
      <AntApp>
        <App />
      </AntApp>
    </ConfigProvider>
  );
}
