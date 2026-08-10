import { useEffect, useState } from 'react';
import {
  FaBell,
  FaChevronLeft,
  FaCode,
  FaDisplay,
  FaGlobe,
  FaKeyboard,
  FaPalette,
  FaPowerOff,
  FaRotateLeft,
  FaShieldHalved,
  FaUniversalAccess,
  FaUser,
  FaVolumeHigh,
  FaXmark,
} from 'react-icons/fa6';

const sections = [
  {
    title: 'ユーザー設定',
    entries: [
      { id: 'account', title: 'マイアカウント', icon: <FaUser /> },
      { id: 'appearance', title: '外観', icon: <FaPalette /> },
      { id: 'notifications', title: '通知', icon: <FaBell /> },
      { id: 'accessibility', title: 'アクセシビリティ', icon: <FaUniversalAccess /> },
      { id: 'language', title: '言語', icon: <FaGlobe /> },
      { id: 'keybinds', title: 'キーバインド', icon: <FaKeyboard /> },
      { id: 'privacy', title: 'プライバシー・安全', icon: <FaShieldHalved /> },
      { id: 'advanced', title: '詳細設定', icon: <FaCode /> },
    ],
  },
];

const pageTitles = Object.fromEntries(sections.flatMap((section) => section.entries.map((entry) => [entry.id, entry.title])));
const accents = [
  ['violet', '#9f86ff', 'バイオレット'],
  ['blue', '#72a7ff', 'ブルー'],
  ['green', '#66d49b', 'グリーン'],
  ['orange', '#ffad70', 'オレンジ'],
  ['rose', '#ff8ca8', 'ローズ'],
  ['mono', '#c7c7cb', 'モノクローム'],
];

const AppSettings = ({ user, settings, onSettingsChange, onReset, onClose, onLogout }) => {
  const [page, setPage] = useState('account');
  const [mobileDetail, setMobileDetail] = useState(false);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      if (mobileDetail && window.matchMedia('(max-width: 720px)').matches) setMobileDetail(false);
      else onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileDetail, onClose]);

  const navigate = (id) => {
    setPage(id);
    setMobileDetail(true);
  };

  return (
    <div className="settings-root" role="dialog" aria-modal="true" aria-label="設定">
      <aside className="settings-sidebar" data-mobile-hidden={mobileDetail ? 'true' : 'false'}>
        <div className="settings-sidebar-scroll no-scrollbar">
          <div className="settings-mobile-heading">
            <h1>設定</h1>
            <md-icon-button type="button" class="m3-icon-button" onClick={onClose} aria-label="設定を閉じる"><FaXmark /></md-icon-button>
          </div>
          <div className="settings-account-card">
            <Avatar user={user} />
            <div className="settings-sidebar-button-content">
              <span className="settings-sidebar-button-title">{user?.displayName || user?.globalName || user?.username || 'ユーザー'}</span>
              <span className="settings-sidebar-button-subtitle">@{user?.username || 'unknown'}</span>
            </div>
          </div>
          {sections.map((section) => (
            <div key={section.title} className="settings-category-group">
              <span className="settings-category-title">{section.title}</span>
              <div className="settings-category-entries">
                {section.entries.map((entry) => (
                  <SidebarButton key={entry.id} selected={page === entry.id} onClick={() => navigate(entry.id)}>
                    <span className="settings-sidebar-icon">{entry.icon}</span>
                    <span className="settings-sidebar-button-title">{entry.title}</span>
                  </SidebarButton>
                ))}
              </div>
            </div>
          ))}
          <md-divider />
          <button type="button" className="settings-logout" onClick={onLogout}><FaPowerOff /> ログアウト</button>
        </div>
      </aside>

      <main className="settings-content" data-mobile-visible={mobileDetail ? 'true' : 'false'}>
        <div className="settings-content-inner" key={page}>
          <div className="settings-title-row">
            <md-icon-button type="button" class="m3-icon-button settings-mobile-back" onClick={() => setMobileDetail(false)} aria-label="設定一覧に戻る"><FaChevronLeft /></md-icon-button>
            <h1 className="settings-page-title">{pageTitles[page]}</h1>
          </div>
          <SettingsPage page={page} user={user} settings={settings} update={onSettingsChange} onReset={onReset} />
          <div className="settings-content-spacer" />
        </div>
        <div className="settings-close-area">
          <md-icon-button type="button" class="m3-icon-button" onClick={onClose} aria-label="設定を閉じる"><FaXmark /></md-icon-button>
          <span className="settings-esc-label">ESC</span>
        </div>
      </main>
    </div>
  );
};

const SettingsPage = ({ page, user, settings, update, onReset }) => {
  if (page === 'account') {
    const copyId = () => navigator.clipboard?.writeText(user?.id || '');
    return (
      <div className="settings-page">
        <UserSummary user={user} />
        <div className="settings-card">
          <InfoRow label="ユーザー名" value={user?.username || '—'} />
          <InfoRow label="表示名" value={user?.displayName || user?.globalName || user?.username || '—'} />
          <InfoRow label="ユーザー ID" value={settings.developerMode ? (user?.id || '—') : '開発者モードで表示'} />
          <div className="settings-actions">
            <md-filled-tonal-button type="button" onClick={copyId} disabled={!user?.id || !settings.developerMode}>ユーザー ID をコピー</md-filled-tonal-button>
          </div>
          <p className="settings-card-description">プロフィールや認証情報の変更は Discord 側で管理されています。このクライアントからは変更しません。</p>
        </div>
      </div>
    );
  }

  if (page === 'appearance') {
    return (
      <div className="settings-page">
        <AppearancePreview settings={settings} />
        <Section title="テーマ">
          <Segmented value={settings.theme} onChange={(theme) => update({ theme })} options={[
            ['light', 'ライト'], ['dark', 'ダーク'], ['system', 'システム'],
          ]} />
          <div className="settings-color-swatches" aria-label="アクセントカラー">
            {accents.map(([id, color, label]) => (
              <button key={id} type="button" className="settings-color-swatch" data-selected={settings.accent === id} style={{ background: color }} title={label} aria-label={label} onClick={() => update({ accent: id })}><md-ripple /></button>
            ))}
          </div>
        </Section>
        <div className="settings-category-button-group">
          <SwitchRow title="透明感とぼかし効果" description="対応するサーフェスに背景ぼかしを使います" checked={settings.blur} onChange={(blur) => update({ blur })} />
          <SliderRow title="メッセージサイズ" value={settings.messageSize} min={12} max={24} suffix="px" onChange={(messageSize) => update({ messageSize })} />
          <SliderRow title="メッセージ間隔" value={settings.messageSpacing} min={0} max={16} suffix="px" onChange={(messageSpacing) => update({ messageSpacing })} />
          <SelectRow title="UI フォント" value={settings.interfaceFont} options={['Inter', 'gg sans', 'Google Sans']} onChange={(interfaceFont) => update({ interfaceFont })} />
          <SwitchRow title="送信ボタンを表示" checked={settings.showSendButton} onChange={(showSendButton) => update({ showSendButton })} />
        </div>
      </div>
    );
  }

  if (page === 'notifications') {
    const toggleDesktop = async (enabled) => {
      if (!enabled) return update({ desktopNotifications: false });
      if (!('Notification' in window)) return;
      const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
      update({ desktopNotifications: permission === 'granted' });
    };
    const permission = 'Notification' in window ? Notification.permission : 'unsupported';
    return (
      <div className="settings-page">
        <Section title="デスクトップ通知" description={`ブラウザー権限: ${permission}`}>
          <SwitchRow title="新しいメッセージを通知" description="別のタブを見ているときに通知します" checked={settings.desktopNotifications} onChange={toggleDesktop} />
          <SwitchRow title="通知音を鳴らす" checked={settings.notificationSound} onChange={(notificationSound) => update({ notificationSound })} />
        </Section>
      </div>
    );
  }

  if (page === 'accessibility') return (
    <div className="settings-page"><div className="settings-category-button-group">
      <SwitchRow title="アニメーションを減らす" description="画面遷移やホバーの動きを抑えます" checked={settings.reducedMotion} onChange={(reducedMotion) => update({ reducedMotion })} />
      <SwitchRow title="コンパクト表示" description="メッセージ間隔とアバター表示を詰めます" checked={settings.compactMode} onChange={(compactMode) => update({ compactMode })} />
    </div></div>
  );

  if (page === 'language') return <div className="settings-page"><Section title="表示言語"><InfoRow label="現在の言語" value="日本語" /><p className="settings-card-description">このビルドでは日本語 UI を使用します。</p></Section></div>;

  if (page === 'keybinds') return <div className="settings-page"><div className="settings-category-button-group"><KeybindRow action="設定を開く" keys="Ctrl + ," /><KeybindRow action="メッセージ入力へ移動" keys="Ctrl + K" /><KeybindRow action="設定・オーバーレイを閉じる" keys="Esc" /></div></div>;

  if (page === 'privacy') return <div className="settings-page"><Section title="セッションとデータ"><p className="settings-card-description">設定値とアカウントの表示情報はこのブラウザーの localStorage に保存されます。トークンはJavaScriptから読み取れないHttpOnly Cookieに保存され、バックエンドのDBやファイルには保存されません。</p></Section></div>;

  return (
    <div className="settings-page">
      <div className="settings-category-button-group"><SwitchRow title="開発者モード" description="UI にユーザー ID などの技術情報を表示します" checked={settings.developerMode} onChange={(developerMode) => update({ developerMode })} /></div>
      <Section title="設定をリセット" description="外観・通知・アクセシビリティを初期値に戻します"><md-outlined-button type="button" onClick={onReset}><FaRotateLeft slot="icon" />初期設定に戻す</md-outlined-button></Section>
    </div>
  );
};

const AppearancePreview = ({ settings }) => (
  <div
    className="settings-preview"
    style={{
      '--message-preview-size': `${settings.messageSize}px`,
      '--message-preview-gap': `${settings.compactMode ? Math.min(settings.messageSpacing, 4) : settings.messageSpacing}px`,
    }}
    aria-label="メッセージ表示プレビュー"
  >
    <div className="settings-preview-messages">
      <div className="settings-preview-message">
        <div className="settings-preview-avatar">S</div>
        <div><div className="settings-preview-meta"><strong>プレビュー</strong><span>今日 12:00</span></div><p>文字サイズとメッセージ間隔を確認できます。</p></div>
      </div>
      <div className="settings-preview-message">
        <div className="settings-preview-avatar">M</div>
        <div><div className="settings-preview-meta"><strong>Material 3</strong><span>今日 12:01</span></div><p><code>Expressive なサーフェスと操作感</code></p></div>
      </div>
    </div>
  </div>
);

const Avatar = ({ user, large = false }) => <div className={large ? 'settings-user-avatar' : 'settings-sidebar-avatar'}>{user?.avatar ? <img src={user.avatar} alt="" /> : (user?.username?.[0]?.toUpperCase() || 'U')}</div>;
const UserSummary = ({ user }) => <div className="settings-user-summary"><div className="settings-user-banner" /><div className="settings-user-info"><div className="settings-user-avatar-ring"><Avatar user={user} large /></div><div className="settings-user-details"><div className="settings-user-name">{user?.displayName || user?.globalName || user?.username || 'ユーザー'}</div><div className="settings-user-status">@{user?.username || 'unknown'}</div></div></div></div>;
const Section = ({ title, description, children }) => <section className="settings-card"><h2 className="settings-card-title">{title}</h2>{description && <p className="settings-card-description">{description}</p>}{children}</section>;
const InfoRow = ({ label, value }) => <div className="settings-info-row"><span>{label}</span><strong>{value}</strong></div>;
const SidebarButton = ({ selected, onClick, children }) => <button type="button" className={`settings-sidebar-button ${selected ? 'selected' : ''}`} aria-current={selected ? 'page' : undefined} onClick={onClick}><md-ripple />{children}</button>;

const Segmented = ({ value, onChange, options }) => <div className="settings-segmented">{options.map(([id, label], index) => {
  const active = value === id;
  const Button = active ? 'md-filled-button' : 'md-filled-tonal-button';
  return <Button key={id} type="button" data-edge={index === 0 ? 'start' : index === options.length - 1 ? 'end' : 'middle'} onClick={() => onChange(id)}>{label}</Button>;
})}</div>;

const SwitchRow = ({ title, description, checked, onChange }) => <div className="settings-category-button settings-control-row" onClick={() => onChange?.(!checked)}><div className="settings-category-button-content"><span className="settings-category-button-title">{title}</span>{description && <span className="settings-category-button-description">{description}</span>}</div><md-switch class="m3-switch shrink-0" selected={checked} aria-label={title} onClick={(event) => event.stopPropagation()} onChange={(event) => onChange?.(event.currentTarget.selected)} /></div>;
const SliderRow = ({ title, value, min, max, onChange, suffix }) => <div className="settings-category-button settings-category-button-column"><div className="settings-category-button-content"><span className="settings-category-button-title">{title}</span></div><div className="settings-category-button-slider"><md-slider class="m3-slider" min={min} max={max} value={value} aria-label={title} onInput={(event) => onChange(Number(event.currentTarget.value))} /><output className="settings-category-button-slider-value">{value}{suffix}</output></div></div>;
const SelectRow = ({ title, value, options, onChange }) => <div className="settings-category-button settings-control-row"><div className="settings-category-button-content"><span className="settings-category-button-title">{title}</span></div><md-outlined-select class="m3-select settings-inline-select" value={value} aria-label={title} onInput={(event) => onChange(event.currentTarget.value)}>{options.map((option) => <md-select-option key={option} value={option} selected={value === option}>{option}</md-select-option>)}</md-outlined-select></div>;
const KeybindRow = ({ action, keys }) => <div className="settings-category-button"><div className="settings-category-button-content"><span className="settings-category-button-title">{action}</span></div><kbd className="settings-category-button-kbd">{keys}</kbd></div>;

export default AppSettings;
