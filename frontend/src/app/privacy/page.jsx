import Privacy from '../../components/legal/Privacy';

export const metadata = {
  title: 'プライバシーポリシー',
  description: 'Discord Web Token Client のデータとトークンの取り扱いについて。',
  alternates: { canonical: '/privacy' },
  openGraph: { title: 'プライバシーポリシー | Discord Web Token Client', description: 'データとトークンの取り扱いについて。', url: '/privacy', type: 'website' },
  twitter: { card: 'summary' },
};

export default function PrivacyPage() {
  return <Privacy />;
}
