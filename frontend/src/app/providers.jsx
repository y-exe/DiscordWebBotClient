'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import { ThemeProvider, useTheme } from 'next-themes';
import { applyAppSettings, getHomeTheme, loadAppSettings } from '../hooks/useAppSettings';
import { getFallbackProxyUrl } from '../utils/helpers';
import { initAnalytics, trackPageView } from '../analytics';

const App = dynamic(() => import('../App'));

function BrowserSetup() {
  const pathname = usePathname();
  const { setTheme } = useTheme();

  useEffect(() => {
    import('../material-web');
    initAnalytics();
    const onImageError = (event) => {
      const image = event.target;
      if (!(image instanceof HTMLImageElement)) return;
      const fallback = getFallbackProxyUrl(image.currentSrc || image.src);
      if (fallback && image.src !== fallback) image.src = fallback;
    };
    document.addEventListener('error', onImageError, true);
    return () => document.removeEventListener('error', onImageError, true);
  }, []);

  useEffect(() => {
    const isPublic = pathname === '/' || pathname === '/login' || pathname === '/terms' || pathname === '/privacy';
    if (isPublic) {
      setTheme(getHomeTheme());
    } else {
      const settings = loadAppSettings();
      applyAppSettings(settings);
      setTheme(settings.theme || 'dark');
    }
    trackPageView(pathname);
  }, [pathname, setTheme]);

  return null;
}

export default function Providers({ children }) {
  const pathname = usePathname();
  const isPublicPage = pathname === '/' || pathname === '/login' || pathname === '/terms' || pathname === '/privacy';
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <BrowserSetup />
      {isPublicPage ? children : <App />}
    </ThemeProvider>
  );
}
