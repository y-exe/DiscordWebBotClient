import { useRef } from 'react';

import { getProxyUrl } from '../../../utils/helpers';
import Symbol from '../../common/Symbol';
import {
    GroupButton,
    CategoryButton,
    CategoryButtonGroup,
    Checkbox,
    Row,
    SectionLabel,
    SectionTitle,
    SwitchRow,
    LoadingSpinner,
} from '../ui';

const accents = [
    ['#FF5733', 'レッド'],
    ['#ffdc2f', 'イエロー'],
    ['#9bf088', 'グリーン'],
    ['#54ecc1', 'ティール'],
    ['#549bec', 'ブルー'],
    ['#5470ec', 'インディゴ'],
    ['#8C5FD3', 'パープル'],
];


const CONTRAST_OPTIONS = [
    [-1, '低'],
    [0, '標準'],
    [0.5, '高め'],
    [1, '最高'],
];

const VARIANT_OPTIONS = [
    ['monochrome', 'モノクローム'],
    ['neutral', 'ニュートラル'],
    ['tonal_spot', 'トーナルスポット'],
    ['fruit_salad', 'フルーツサラダ'],
];

const INTERFACE_FONTS = ['Inter', 'Open Sans', 'Roboto', 'Noto Sans', 'Lato', 'Lexend', 'Montserrat', 'Poppins', 'Ubuntu', 'Bitter', 'Comic Neue', 'IBM Plex Sans', 'Plus Jakarta Sans', 'Atkinson Hyperlegible', 'Google Sans', 'gg sans'];
const MONOSPACE_FONTS = ['JetBrains Mono', 'Fira Code', 'Roboto Mono', 'Source Code Pro', 'Space Mono', 'Ubuntu Mono', 'IBM Plex Mono'];

const AppearancePage = ({ user, appSettings, onSettingsChange }) => {
    const settings = appSettings;
    const update = onSettingsChange;
    const pickerRef = useRef(null);
    return (
        <div className="settings-page">
            <div>
                <SectionTitle>色</SectionTitle>
                <Row gap={2} justify="stretch">
                    <GroupButton group="connected-start" groupActive={settings.theme === 'light'} onPress={() => update({ theme: 'light' })}>ライト</GroupButton>
                    <GroupButton group="connected" groupActive={settings.theme === 'dark'} onPress={() => update({ theme: 'dark' })}>ダーク</GroupButton>
                    <GroupButton group="connected-end" groupActive={settings.theme === 'system'} onPress={() => update({ theme: 'system' })}>システム</GroupButton>
                </Row>
                <Row gap={2} wrap align style={{ marginTop: 2 }}>
                    <GroupButton
                        size="md"
                        className="app-expressive-button-filled"
                        aria-label="カスタムアクセント"
                        title="カスタムアクセント"
                        onPress={() => pickerRef.current?.click()}
                    >
                        <Symbol size={20}>palette</Symbol>
                    </GroupButton>
                    <input
                        ref={pickerRef}
                        type="color"
                        value={settings.accent}
                        onChange={(e) => update({ accent: e.currentTarget.value })}
                        style={{ position: 'absolute', opacity: 0, width: 0, height: 0, padding: 0, border: 'none' }}
                    />
                    {accents.map(([color, label]) => (
                        <GroupButton
                            key={color}
                            size="md"
                            group="standard"
                            groupActive={settings.accent.toLowerCase() === color.toLowerCase()}
                            bg={color}
                            aria-label={label}
                            title={label}
                            onPress={() => update({ accent: color })}
                        />
                    ))}
                </Row>
                <Row gap={2} justify="stretch" style={{ marginTop: 2 }}>
                    {CONTRAST_OPTIONS.map(([value, label], index) => (
                        <GroupButton
                            key={value}
                            size="xs"
                            group={index === 0 ? 'connected-start' : index === CONTRAST_OPTIONS.length - 1 ? 'connected-end' : 'connected'}
                            groupActive={settings.contrast === value}
                            onPress={() => update({ contrast: value })}
                        >
                            {label}
                        </GroupButton>
                    ))}
                </Row>
                <Row gap={2} justify="stretch" style={{ marginTop: 2 }}>
                    {VARIANT_OPTIONS.map(([value, label], index) => (
                        <GroupButton
                            key={value}
                            size="xs"
                            group={index === 0 ? 'connected-start' : index === VARIANT_OPTIONS.length - 1 ? 'connected-end' : 'connected'}
                            groupActive={settings.variant === value}
                            onPress={() => update({ variant: value })}
                        >
                            {label}
                        </GroupButton>
                    ))}
                </Row>
            </div>
            <div>
                <SectionTitle>表示とテキスト</SectionTitle>
                <Checkbox checked={settings.blur} onChange={({ currentTarget: { checked } }) => update({ blur: checked })}>
                    透明感とぼかし効果 (古いマシンでは動作が重くなります)
                </Checkbox>
                <AppearancePreview settings={settings} user={user} />
                <SectionLabel>メッセージサイズ</SectionLabel>
                <input type="range" className="app-slider" min={12} max={24} value={settings.messageSize} onChange={(e) => update({ messageSize: Number(e.target.value) })} />
                <SectionLabel>メッセージ間隔</SectionLabel>
                <input type="range" className="app-slider" min={0} max={16} value={settings.messageSpacing} onChange={(e) => update({ messageSpacing: Number(e.target.value) })} />
                <label className="app-modal-field">
                    <span className="app-modal-label">UI フォント</span>
                    <select
                        className="app-modal-input"
                        value={settings.interfaceFont}
                        onChange={(e) => update({ interfaceFont: e.target.value })}
                    >
                        {INTERFACE_FONTS.map((font) => <option key={font} value={font} style={{ fontFamily: font }}>{font}</option>)}
                    </select>
                </label>
                <label className="app-modal-field">
                    <span className="app-modal-label">等幅フォント</span>
                    <select
                        className="app-modal-input"
                        value={settings.monospaceFont}
                        onChange={(e) => update({ monospaceFont: e.target.value })}
                    >
                        {MONOSPACE_FONTS.map((font) => <option key={font} value={font} style={{ fontFamily: font }}>{font}</option>)}
                    </select>
                </label>
            </div>
            <div>
                <SectionTitle>チャット入力</SectionTitle>
                <Checkbox checked={settings.showSendButton} onChange={({ currentTarget: { checked } }) => update({ showSendButton: checked })}>
                    送信ボタンを表示
                </Checkbox>
            </div>
        </div>
    );
};

const NotificationsPage = ({ appSettings, onSettingsChange }) => {
    const toggleDesktop = async (enabled) => {
        if (!enabled) return onSettingsChange({ desktopNotifications: false });
        if (!('Notification' in window)) return;
        const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
        onSettingsChange({ desktopNotifications: permission === 'granted' });
    };
    const permission = 'Notification' in window ? Notification.permission : 'unsupported';
    return (
        <div className="settings-page">
            <CategoryButtonGroup>
                <CategoryButton
                    icon={<Symbol size={22}>notifications</Symbol>}
                    title="デスクトップ通知を有効化"
                    description={permission === 'unsupported'
                        ? 'このブラウザーは通知に対応していません'
                        : 'タブを開いている間、通知を受信します'}
                    action={<Checkbox checked={appSettings.desktopNotifications} />}
                    onClick={() => toggleDesktop(true)}
                />
                <CategoryButton
                    icon={<Symbol size={22}>mark_unread_chat_alt</Symbol>}
                    title="通知音を鳴らす"
                    action={<Checkbox checked={appSettings.notificationSound} />}
                    onClick={() => onSettingsChange({ notificationSound: !appSettings.notificationSound })}
                />
            </CategoryButtonGroup>
        </div>
    );
};

const LanguagePage = () => (
    <div className="settings-page">
        <CategoryButtonGroup>
            <CategoryButton
                icon={<Symbol size={22}>language</Symbol>}
                title="日本語"
                variant="tertiaryAlt"
                action={<span className="settings-cat-radio" data-checked="true" />}
            />
        </CategoryButtonGroup>
        <p className="settings-card-description">このビルドでは日本語 UI のみを提供しています。</p>
    </div>
);

const AdvancedPage = ({ appSettings, onSettingsChange, onReset }) => (
    <div className="settings-page">
        <div className="settings-page-block">
            <Checkbox checked={appSettings.compactMode} onChange={({ currentTarget: { checked } }) => onSettingsChange({ compactMode: checked })}>
                コンパクトモード
            </Checkbox>
            <Checkbox checked={appSettings.reducedMotion} onChange={({ currentTarget: { checked } }) => onSettingsChange({ reducedMotion: checked })}>
                アニメーションを減らす
            </Checkbox>
            <Checkbox checked={appSettings.developerMode} onChange={({ currentTarget: { checked } }) => onSettingsChange({ developerMode: checked })}>
                開発者モード
            </Checkbox>
        </div>
        <p className="settings-card-description">
            開発者モードを有効にすると ID などの技術情報が表示され、権限がなくてもサーバー/チャンネル設定を表示できます (権限がない操作はサーバーに拒否されます)。
        </p>
        <CategoryButtonGroup>
            <CategoryButton
                icon={<Symbol size={22}>restart_alt</Symbol>}
                title="初期設定に戻す"
                description="外観・通知・アクセシビリティを初期値に戻します"
                onClick={onReset}
            />
        </CategoryButtonGroup>
        <p className="settings-card-description">
            設定値とアカウントの表示情報はこのブラウザーの localStorage に保存されます。
            トークンは JavaScript から読み取れない HttpOnly Cookie に保存され、バックエンドの DB やファイルには保存されません。
        </p>
    </div>
);

const AppearancePreview = ({ settings, user }) => (
    <div
        className="settings-preview"
        style={{
            '--message-preview-size': `${settings.messageSize}px`,
            '--message-group-spacing': `${settings.compactMode ? Math.min(settings.messageSpacing, 4) : settings.messageSpacing}px`,
        }}
        aria-label="メッセージ表示プレビュー"
    >
        <div className="settings-preview-messages">
            <div className="settings-preview-message">
                {user?.avatar
                    ? <img className="settings-preview-avatar" src={getProxyUrl(user.avatar)} alt="" />
                    : <div className="settings-preview-avatar">{user?.displayName?.[0]?.toUpperCase() || user?.username?.[0]?.toUpperCase() || 'S'}</div>}
                <div>
                    <div className="settings-preview-meta"><strong>{user?.displayName || user?.username || 'プレビュー'}</strong><span>今日 12:00</span></div>
                    <p>Sphinx of black quartz, judge my vow</p>
                </div>
            </div>
            <div className="settings-preview-message">
                <div className="settings-preview-avatar">M</div>
                <div>
                    <div className="settings-preview-meta"><strong>MysticPixie</strong><span>今日 12:01</span></div>
                    <p><code>The quick brown fox jumped over the lazy dog</code></p>
                </div>
            </div>
        </div>
    </div>
);
export {
    AppearancePage,
    NotificationsPage,
    LanguagePage,
    AdvancedPage,
};

export { SessionsPage, AccountPage, ProfilePage } from './UserAccountPages';
