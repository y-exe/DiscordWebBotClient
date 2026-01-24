import '../index.css';
import '../App.css';
import Providers from './providers';

export const metadata = {
  metadataBase: new URL('https://discord.yexe.xyz'),
  title: { default: 'Stoat', template: '%s | Stoat' },
  description: 'ブラウザで動作する Discord クライアント',
};

export const viewport = {
  themeColor: '#191919',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        <link rel="shortcut icon" type="image/x-icon" href="/assets/web/icon.ico" />
        <link rel="icon" type="image/svg+xml" href="/assets/web/monochrome.svg" />
        <link rel="apple-touch-icon" href="/assets/web/android-chrome-192x192.png" />
      </head>
      <body><Providers>{children}</Providers></body>
    </html>
  );
}
