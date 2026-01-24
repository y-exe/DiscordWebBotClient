import Symbol from '../common/Symbol';
import Wordmark from '../auth/Wordmark';

/**
 * for-web HomePage: @me ルート(チャンネル未選択)のホーム画面
 */
const HomeView = ({ onCreate, onOpenSettings }) => (
  <main className="app-chat">
    <header className="app-chat-header">
      <Symbol size={20}>home</Symbol>
      <span className="text-base font-semibold">ホーム</span>
      <div className="hidden min-w-0 flex-1 sm:block" />
    </header>
    <div className="min-h-0 flex-1 overflow-y-auto flex flex-col items-center justify-center gap-8 py-12">
      <Wordmark
        aria-hidden="true"
        style={{
          width: '160px',
          height: 'auto',
          color: 'var(--app-on-surface)',
        }}
      />
      <div className="app-home-buttons">
        <div className="app-home-buttons-col">
          <button type="button" className="app-home-category-button" onClick={onCreate}>
            <span className="app-home-category-icon">
              <Symbol size={26}>add_circle</Symbol>
            </span>
            <span className="min-w-0 text-left">
              <span className="block text-[15px] font-semibold">グループまたはサーバーを作成</span>
              <span className="block text-[13px] text-[var(--app-on-surface-variant)]">フレンドやbotを招待して大きなパーティーを開きましょう。</span>
            </span>
          </button>
          <button type="button" className="app-home-category-button" onClick={onOpenSettings}>
            <span className="app-home-category-icon">
              <Symbol size={24}>settings</Symbol>
            </span>
            <span className="min-w-0 text-left">
              <span className="block text-[15px] font-semibold">設定を開く</span>
              <span className="block text-[13px] text-[var(--app-on-surface-variant)]">左下の歯車アイコンからも開けます。</span>
            </span>
          </button>
        </div>
      </div>
    </div>
  </main>
);

export default HomeView;
