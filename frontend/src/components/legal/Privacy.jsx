'use client';
import { useEffect } from 'react';
import Footer from '../auth/Footer';

export default function Privacy() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="home-screen legal-page min-h-screen bg-black text-white font-google">
      <div className="max-w-4xl mx-auto py-16 px-6">
        <div className="legal-header mb-12">
          <h1 className="text-2xl md:text-4xl font-bold text-white tracking-tight">
            プライバシーポリシー
          </h1>
        </div>

        <div className="legal-content">
          <div className="space-y-12 leading-relaxed text-sm">
            <section>
              <p>
                Discord Web Token Client（以下「本サービス」または「当運営」）は、利用者のプライバシーを尊重し、個人情報の保護および透明性の確保に努めています。本プライバシーポリシー（以下「本ポリシー」）は、本サービスにおける情報の取得、利用、管理、および保護の方針を説明するものです。
              </p>
            </section>

            <section>
              <h2>第1条（取得する情報の種類と取り扱い方針）</h2>
              <div className="pl-4 space-y-4">
                <p>本サービスでは、機能の提供およびサービスの安定運用のために以下の情報を取り扱います。</p>

                <div className="space-y-2">
                  <h3 className="text-base font-semibold text-white">1. Discord認証情報（トークン等）</h3>
                  <p className="pl-4">
                    <strong>利用目的:</strong> 利用者が入力したDiscord Botトークンまたはユーザートークンは、DiscordゲートウェイおよびDiscord APIとの間で暗号化通信を確立し、メッセージの送受信、サーバー一覧・チャンネル一覧の取得等のクライアント機能を実行する目的にのみ使用されます。
                  </p>
                  <p className="pl-4">
                    <strong>非保存の原則:</strong> 当運営のバックエンドサーバーは、Socket通信のリアルタイム中継および初期検証のみを行い、利用者のDiscordトークンやメッセージ本文、画像等のプライベートな通信内容を当運営側のデータベースやストレージへ永続保存することは一切ありません。
                  </p>
                  <p className="pl-4">
                    <strong>端末内保存（ログイン履歴）:</strong> 利用者の利便性向上のため、入力されたトークンやアカウント情報は利用者のWebブラウザ内（Cookie / LocalStorage）にのみ保存されます。利用者は、ホーム画面の「ログイン履歴」の削除ボタンまたはブラウザのCookie消去機能を通じて、いつでも即座にこれらのローカルデータを完全削除できます。
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="text-base font-semibold text-white">2. サーバーアクセスログ</h3>
                  <p className="pl-4">
                    サーバーの不正アクセス監視、障害調査、およびDoS攻撃対策等のセキュリティ目的のため、IPアドレス、接続日時、リクエストURL、ユーザーエージェントなどの最小限の接続ログを一時的に記録する場合があります。これらのログは一定期間の経過後に自動的に破棄されます。
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2>第2条（Cookieおよびローカルストレージの利用）</h2>
              <div className="pl-4 space-y-3">
                <p>本サービスでは、WebブラウザのCookieおよびLocalStorage技術を使用しています。</p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>
                    <strong>セッション維持:</strong> ログイン状態の維持およびWebSocket接続の認証セッションを管理するために一時的なCookieを使用します。
                  </li>
                  <li>
                    <strong>ローカル設定の保持:</strong> テーマ設定（ダーク/ライトモード）、音量設定、ログイン履歴等のUI表示設定をLocalStorageに保存します。
                  </li>
                  <li>
                    これらは利用者の利便性向上およびサービス機能提供を目的としており、行動ターゲティング広告などの目的には一切利用されません。
                  </li>
                </ul>
              </div>
            </section>

            <section>
              <h2>第3条（Google アナリティクスの利用について）</h2>
              <div className="pl-4 space-y-4">
                <p>
                  本サービスでは、サービスの利用状況の把握、統計的なトラフィック分析、およびユーザー体験の向上のため、Google LLC（以下「Google社」）が提供するアクセス解析ツール「Google アナリティクス（Google Analytics 4）」を利用しています。
                </p>

                <div className="space-y-2">
                  <h3 className="text-base font-semibold text-white">1. データの収集と処理</h3>
                  <p className="pl-4">
                    Google アナリティクスは、利用者のブラウザにCookieを設定し、ウェブサイトの閲覧行動に関するデータ（訪問ページ、滞在時間、リファラー、使用ブラウザ、OS、大まかな地域情報等）を収集します。収集されたデータは匿名化されており、特定の個人を直接識別する情報（氏名、メールアドレス、Discordアカウント名、トークン等）は含まれません。
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="text-base font-semibold text-white">2. Google社の規約とプライバシーポリシー</h3>
                  <p className="pl-4">
                    Google アナリティクスにおけるデータの収集方法および利用方法については、
                    <a
                      href="https://marketingplatform.google.com/about/analytics/terms/jp/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-400 hover:underline mx-1"
                    >
                      Google アナリティクス利用規約
                    </a>
                    および
                    <a
                      href="https://policies.google.com/technologies/partner-sites?hl=ja"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-400 hover:underline mx-1"
                    >
                      Google プライバシーポリシー
                    </a>
                    をご確認ください。
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="text-base font-semibold text-white">3. Google アナリティクスの無効化（オプトアウト）</h3>
                  <p className="pl-4">
                    利用者は、ブラウザのCookie機能を無効化するか、Google社が提供する
                    <a
                      href="https://tools.google.com/dlpage/gaoptout?hl=ja"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-400 hover:underline mx-1"
                    >
                      Google アナリティクス オプトアウト アドオン
                    </a>
                    をブラウザに導入することにより、Google アナリティクスによるデータの収集を随時拒否することができます。
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2>第4条（第三者への情報提供の制限）</h2>
              <div className="pl-4 space-y-3">
                <p>当運営は、取得した情報を以下の場合を除き、いかなる第三者にも開示・提供・販売いたしません。</p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>法令に基づき裁判所、警察等の公的機関から正当な手続きにより開示を求められた場合。</li>
                  <li>人の生命、身体または財産の保護のために必要があり、本人の同意を得ることが困難である場合。</li>
                  <li>本サービスの不正利用やサイバー攻撃等の違法行為からサービスおよび利用者を保護するために緊急の必要がある場合。</li>
                </ul>
              </div>
            </section>

            <section>
              <h2>第5条（安全管理措置）</h2>
              <div className="pl-4 space-y-3">
                <p>
                  当運営は、取り扱う情報の漏洩、滅失または毀損の防止その他の安全管理のために、SSL/TLSによる通信の暗号化、サーバー環境へのアクセス権限管理、レート制限やセキュリティヘッダーの導入など、適切な技術的・組織的安全対策を実施しています。
                </p>
              </div>
            </section>

            <section>
              <h2>第6条（利用者の権利とデータ削除）</h2>
              <div className="pl-4 space-y-3">
                <p>
                  利用者は、自身のWebブラウザ上で保持されているCookieおよびLocalStorageのデータを、ブラウザの設定画面または本サービス内の削除機能を用いて、いつでも自由に全消去することができます。また、当運営が保持する一時ログ等について開示・削除を希望される場合は、下記のお問い合わせ窓口までご連絡ください。
                </p>
              </div>
            </section>

            <section>
              <h2>第7条（本ポリシーの改定）</h2>
              <div className="pl-4 space-y-3">
                <p>
                  当運営は、法令の改正、技術動向の変化、またはサービスの改善に伴い、本ポリシーを随時見直し、改定することがあります。重要な変更が行われた場合には、本ウェブサイト上にて告知します。改定後のポリシーは本ページに掲載された時点より効力を生じるものとします。
                </p>
              </div>
            </section>

            <section>
              <h2>第8条（お問い合わせ窓口）</h2>
              <div className="pl-4 space-y-3">
                <p>
                  本プライバシーポリシーまたは本サービスにおけるデータの取り扱いに関するご質問・ご意見は、公式GitHubリポジトリのIssue、または開発者のDiscord（ID:y_exe）までお問い合わせください。
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
