import '../index.css';
import '../App.css';
import Providers from './providers';

export const metadata = {
  metadataBase: new URL('https://discord.yexe.xyz'),
  title: { default: 'Discord Web Token Client | yexe.xyz', template: '%s | Discord Web Token Client | yexe.xyz' },
  description: 'ブラウザで動作する Discord クライアント',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <head><link rel="icon" href="/fabicon.ico" /></head>
      <body><Providers>{children}</Providers></body>
    </html>
  );
}
