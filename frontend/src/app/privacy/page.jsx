import Privacy from '../../components/legal/Privacy';

export const metadata = {
  title: 'プライバシーポリシー',
  description: '本サービスのデータとトークンの取り扱いについて。',
  alternates: { canonical: '/privacy' },
  openGraph: { title: 'プライバシーポリシー | materialcord', description: 'データとトークンの取り扱いについて。', url: '/privacy', type: 'website' },
  twitter: { card: 'summary' },
};

export default function PrivacyPage() {
  return <Privacy />;
}
