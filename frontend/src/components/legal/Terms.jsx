'use client';
import { useEffect } from 'react';
import Footer from '../auth/Footer';

export default function Terms() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="home-screen legal-page min-h-screen bg-black text-white font-google">
      <div className="max-w-4xl mx-auto py-16 px-6">
        <div className="legal-header mb-12">
          <h1 className="text-2xl md:text-4xl font-bold text-white tracking-tight">
            利用規約
          </h1>
        </div>

        <div className="legal-content">
          <div className="space-y-12 leading-relaxed text-sm">
            <section>
              <p>
                本利用規約（以下「本規約」）は、Discord Web Token Client（以下「本サービス」または「当運営」）の利用条件を定めるものです。利用者は、本サービスを利用することにより、本規約のすべての条項に同意したものとみなされます。
              </p>
            </section>

            <section>
              <h2>第1条（総則および本サービスの性質）</h2>
              <div className="pl-4 space-y-3">
                <p>
                  1. 本サービスは、Webブラウザ上でDiscordのBotトークンおよびユーザートークンを用いた接続・操作を行うことができるサードパーティ製のオープンソースクライアントです。
                </p>
                <p>
                  2. 本サービスは、開発・検証、教育、軽量環境での利用、および個人の利便性向上を目的として提供されています。
                </p>
              </div>
            </section>

            <section>
              <h2>第2条（自己責任の原則およびDiscord利用規約との関係）</h2>
              <div className="pl-4 space-y-3">
                <p>
                  1. Discord公式のサービス利用規約（Terms of Service）およびコミュニティガイドラインでは、一般ユーザーアカウントのトークンを用いた自動化や非公式クライアントからのアクセス（いわゆるSelf-bot）が制限または禁止されています。本サービスでユーザートークンを使用することは、Discord公式の利用規約に抵触する恐れがあります。
                </p>
                <p>
                  2. 利用者は、本サービスで認証情報（Botトークン、ユーザートークンを含む）を使用するにあたり、自らの判断と責任において利用するものとします。
                </p>
                <p>
                  3. 本サービスの利用により、利用者のDiscordアカウントに停止（BAN）、一時的凍結、機能制限、警告等の不利益が生じた場合であっても、当運営および開発者は一切の責任を負いません。
                </p>
                <p>
                  4. Botトークンを使用する場合、当該Botの権限設定および招待先サーバーにおける安全管理は利用者が全責任を負うものとします。
                </p>
              </div>
            </section>

            <section>
              <h2>第3条（非公式性の明記および知的財産権）</h2>
              <div className="pl-4 space-y-3">
                <p>
                  1. 「Discord」およびDiscordのロゴ、関連するすべての商標・サービスマークは、Discord, Inc.の登録商標または商標です。本サービスはDiscord, Inc.が公式に提供、後援、推奨、または提携しているものではなく、完全に独立した非公式のプロジェクトです。
                </p>
                <p>
                  2. 本サービスのソースコード、インターフェースデザイン、ロゴ等の知的財産権は、当運営または各権利者に帰属し、適用されるオープンソースライセンスの範囲内で利用が認められます。
                </p>
                <p>
                  3. 本サービス内に第三者の権利を侵害するコンテンツが存在すると判断される場合は、正当な権利者より開発者のDiscord（ID:y_exe）までご連絡ください。内容を確認の上、速やかに適切な措置を講じます。
                </p>
              </div>
            </section>

            <section>
              <h2>第4条（禁止事項）</h2>
              <div className="pl-4 space-y-3">
                <p>利用者は、本サービスの利用にあたり、直接的または間接的に以下の行為を行ってはなりません。</p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>Discord, Inc.の定めるサービス利用規約、コミュニティガイドライン、開発者ポリシーに違反する行為。</li>
                  <li>スパムメッセージの送信、大量メンション、レイド（荒らし行為）、他者への嫌がらせ行為。</li>
                  <li>第三者のトークンやログイン情報を不正に取得、窃取、または無断で使用する行為。</li>
                  <li>本サービスの提供サーバーやネットワークに対して過剰な負荷をかける行為（DDoS攻撃、過度な同時接続等）。</li>
                  <li>本サービスの脆弱性を探索、悪用する行為、または不正な手段によるリバースエンジニアリングを行う行為。</li>
                  <li>法令または公序良俗に反する行為、犯罪行為を助長する行為。</li>
                  <li>その他、当運営が不適切と合理的に判断する行為。</li>
                </ul>
              </div>
            </section>

            <section>
              <h2>第5条（免責事項およびサービスの中断・終了）</h2>
              <div className="pl-4 space-y-3">
                <p>
                  1. 本サービスは「現状有姿」で提供され、動作の正確性、完全性、安全性、継続性、特定目的への適合性について、明示的・黙示的を問わず一切の保証を行いません。
                </p>
                <p>
                  2. Discord APIの仕様変更、Discord公式による接続遮断、通信障害、ホスティングサーバーの保守点検または障害、その他不可抗力により生じたサービス停止やデータ消失について、当運営は一切の責任を負いません。
                </p>
                <p>
                  3. 利用者の端末環境（OS、ブラウザ拡張機能、不正ソフトウェア等）に起因する認証情報の漏洩やアカウント侵害について、当運営は一切の責任を負いません。
                </p>
                <p>
                  4. 当運営は、利用者に事前に通知することなく、本サービスの全部または一部の提供を中断、停止、または終了することができるものとします。
                </p>
              </div>
            </section>

            <section>
              <h2>第6条（規約の改定）</h2>
              <div className="pl-4 space-y-3">
                <p>
                  当運営は、必要と判断した場合には、利用者の事前の承諾を得ることなく本規約を随時改定することができます。改定後の規約は本ウェブサイト上に掲載された時点より効力を生じるものとし、規約改定後に利用者が本サービスを継続して利用した場合、改定後の規約に同意したものとみなされます。
                </p>
              </div>
            </section>

            <section>
              <h2>第7条（準拠法および管轄裁判所）</h2>
              <div className="pl-4 space-y-3">
                <p>
                  本規約の成立、効力、履行および解釈に関しては、日本法が適用されるものとします。本サービスに関して生じた一切の紛争については、日本国内の管轄裁判所を合意管轄とします。
                </p>
              </div>
            </section>

            <section>
              <h2>第8条（お問い合わせ窓口）</h2>
              <div className="pl-4 space-y-3">
                <p>
                  本規約に関するご質問・ご意見、または権利侵害に関する通知等は、公式GitHubリポジトリのIssue、または開発者のDiscord（ID:y_exe）までお問い合わせください。
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
      <Footer forceDark={true} />

      <style jsx global>{`
        body {
          background: #000 !important;
        }
        .legal-page {
          background: #000;
          color: #fff;
        }
        .legal-header h1,
        .legal-content h2 {
          color: #fff !important;
        }
        .legal-header {
          display: block;
          text-align: left;
        }
        .legal-header h1 {
          margin: 0;
          border-bottom: 1px solid #333;
          padding-bottom: 1rem;
        }
        .legal-content {
          background: #000 !important;
          border: 0;
          border-radius: 0 !important;
          padding: 0 !important;
        }
        .legal-content,
        .legal-content p,
        .legal-content li {
          color: #d4d4d4 !important;
        }
        .legal-content section h2 {
          margin-bottom: 1rem;
          font-size: 1.2rem;
          font-weight: 700;
          color: #fff !important;
        }
      `}</style>
    </div>
  );
}
