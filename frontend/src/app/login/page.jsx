import Login from '../../components/auth/Login';

export const metadata = {
  title: 'ログイン',
  description: 'materialcord はブラウザで動作する Discord クライアントです。Bot とユーザーのトークンに対応しています。',
  alternates: { canonical: '/login' },
  openGraph: { title: 'ログイン | materialcord', description: 'ブラウザで動作する Discord クライアントです。', url: '/login', type: 'website' },
  twitter: { card: 'summary' },
};

export default function LoginPage() {
  return <Login />;
}
