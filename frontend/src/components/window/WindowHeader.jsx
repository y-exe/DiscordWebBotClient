import Wordmark from '../auth/Wordmark';

/**
 * アプリ上部のタイトルバー。for-web の Titlebar と同様に
 * ホーム(@me)では Stoat ワードマーク、サーバー表示中はサーバー名を出す。
 */
const WindowHeader = ({ guild }) => {
  return (
    <div className="app-titlebar drag-region">
      {guild ? (
        <span>{guild.name}</span>
      ) : (
        <Wordmark
          aria-hidden="true"
          style={{
            height: '18px',
            width: 'auto',
            marginBlockStart: '1px',
            color: 'var(--md-sys-color-on-surface)',
          }}
        />
      )}
    </div>
  );
};

export default WindowHeader;
