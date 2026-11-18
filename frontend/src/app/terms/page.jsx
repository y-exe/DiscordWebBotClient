import Terms from '../../components/legal/Terms';

export const metadata = {
  title: '利用規約',
  description: '本サービスの利用規約です。',
  alternates: { canonical: '/terms' },
  openGraph: { title: '利用規約 | materialcord', description: '本サービスの利用規約です。', url: '/terms', type: 'website' },
  twitter: { card: 'summary' },
};

export default function TermsPage() {
  return <Terms />;
}
