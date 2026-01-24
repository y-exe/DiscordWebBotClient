import Login from '../../components/auth/Login';

export const metadata = {
  title: 'ログイン',
  description: 'DiscordWebTokenClient はブラウザで動作する Discord クライアントです。Bot とユーザーのトークンに対応しています。',
  alternates: { canonical: '/login' },
  openGraph: { title: 'ログイン | Discord Web Token Client', description: 'ブラウザで動作する Discord クライアントです。', url: '/login', type: 'website' },
  twitter: { card: 'summary' },
};

export default function LoginPage() {
  return <Login />;
}
