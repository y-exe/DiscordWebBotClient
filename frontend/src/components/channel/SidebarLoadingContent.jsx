const widths = [68, 52, 76, 61, 45, 72, 56, 79, 64, 49, 71, 54, 77, 59, 47, 70, 53, 74, 63, 50];

export default function SidebarLoadingContent({ isDMList = false, showTop = false }) {
  return (
    <div className="app-sidebar-loading" role="status" aria-label={isDMList ? 'DM一覧を読み込み中' : 'チャンネル一覧を読み込み中'}>
      {showTop && isDMList && (
        <div className="app-sidebar-loading-top" aria-hidden="true">
          <span className="app-sidebar-loading-title" />
          <span className="app-sidebar-loading-row"><span className="app-sidebar-loading-icon" /><span className="app-sidebar-loading-line" style={{ width: '38%' }} /></span>
          <span className="app-sidebar-loading-row"><span className="app-sidebar-loading-icon" /><span className="app-sidebar-loading-line" style={{ width: '48%' }} /></span>
          <span className="app-sidebar-loading-category" />
        </div>
      )}
      {!isDMList && <span className="app-sidebar-loading-category" aria-hidden="true" />}
      {widths.map((width, index) => (
        <div key={index} className="app-sidebar-loading-row" aria-hidden="true">
          <span className={isDMList ? 'app-sidebar-loading-avatar' : 'app-sidebar-loading-icon'} />
          <span className="app-sidebar-loading-line" style={{ width: `${width}%` }} />
        </div>
      ))}
    </div>
  );
}
