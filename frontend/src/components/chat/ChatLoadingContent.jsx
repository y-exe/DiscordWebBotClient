const widths = [62, 44, 75, 54, 68, 36, 59, 78, 42, 64, 51, 72, 47, 66];

export default function ChatLoadingContent() {
  return (
    <div className="app-chat-loading-content" role="status" aria-label="チャットを読み込み中">
      {widths.map((width, index) => (
        <div key={index} className="app-chat-loading-row" aria-hidden="true">
          <span className="app-chat-loading-avatar" />
          <div className="app-chat-loading-lines">
            <span className="app-chat-loading-line name" />
            <span className="app-chat-loading-line" style={{ width: `${width}%` }} />
            {index % 3 !== 1 && <span className="app-chat-loading-line short" style={{ width: `${Math.max(24, width - 18)}%` }} />}
          </div>
        </div>
      ))}
    </div>
  );
}
