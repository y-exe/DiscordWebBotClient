import '../index.css';
import '../App.css';
import Providers from './providers';

export const metadata = {
  metadataBase: new URL('https://ycord.pages.dev'),
  title: { default: 'materialcord', template: '%s | materialcord' },
  description: 'ブラウザで動作する Discord クライアント',
};

export const viewport = {
  themeColor: '#191919',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        <link rel="shortcut icon" type="image/x-icon" href="/fabicon.ico" />
        <link rel="icon" type="image/x-icon" href="/fabicon.ico" />
      </head>
      <body><Providers>{children}</Providers></body>
    </html>
  );
}
