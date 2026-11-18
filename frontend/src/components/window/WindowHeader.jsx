// タイトルバー: ホームではサービス名、サーバー表示中はサーバー名
const WindowHeader = ({ guild }) => {
  return (
    <div className="app-titlebar drag-region">
      {guild ? (
        <span>{guild.name}</span>
      ) : (
        <span
          aria-hidden="true"
          style={{
            fontSize: '13px',
            fontWeight: 600,
            marginBlockStart: '1px',
            color: 'var(--md-sys-color-on-surface)',
          }}
        >
          materialcord
        </span>
      )}
    </div>
  );
};

export default WindowHeader;
