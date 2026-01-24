import { useEffect, useRef, useState } from 'react';

import { getProxyUrl } from '../../../utils/helpers';
import Symbol from '../../common/Symbol';
import {
    TextField,
    CategoryButton,
    CategoryButtonCollapse,
    CategoryButtonGroup,
    CategorySelect,
    Row,
    SectionLabel,
    LoadingSpinner,
} from '../ui';

const PRESENCE_OPTIONS = [
    ['online', 'オンライン', 'var(--brand-presence-online)'],
    ['idle', '退席中', 'var(--brand-presence-idle)'],
    ['dnd', '取り込み中', 'var(--brand-presence-busy)'],
    ['invisible', 'オフラインとして表示', 'var(--brand-presence-invisible)'],
];

const Avatar = ({ user, size = 58 }) => (
    <div className="settings-user-avatar" style={{ width: size, height: size }}>
        {user?.avatar ? <img src={getProxyUrl(user.avatar)} alt="" /> : (user?.displayName?.[0]?.toUpperCase() || user?.username?.[0]?.toUpperCase() || 'U')}
    </div>
);

/* UserSummary */
const UserSummary = ({ user, bannerUrl, onEdit }) => (
    <div
        className="settings-user-summary"
        style={bannerUrl ? {
            backgroundImage: `linear-gradient(color-mix(in srgb, var(--app-surface-container-low) 70%, transparent), color-mix(in srgb, var(--app-surface-container-low) 70%, transparent)), url("${getProxyUrl(bannerUrl)}")`,
            color: 'var(--app-on-surface)',
        } : undefined}
    >
        <div className="settings-user-info">
            <Avatar user={user} />
            <div className="settings-user-details">
                <span className="settings-user-name">{user?.displayName || user?.globalName || user?.username || 'ユーザー'}</span>
                <span className="settings-user-status">@{user?.username || 'unknown'}</span>
            </div>
            {onEdit && (
                <button
                    type="button"
                    className="app-expressive-button size-sm shape-square is-active settings-user-edit"
                    onClick={onEdit}
                    aria-label="プロフィールを編集"
                >
                    <md-ripple />
                    <Symbol size={20}>edit</Symbol>
                </button>
            )}
        </div>
        <div className="settings-user-bottom">
            <div className="settings-user-bottom-padding" />
            <div className="settings-user-badges" title="アカウントの作成日">
                <Symbol size={14} fill>cake</Symbol>
            </div>
        </div>
    </div>
);

/* Sessions: Discord のログインセッション管理 */
const SESSION_ICONS = {
    windows: <Symbol size={22}>desktop_windows</Symbol>,
    mac: <Symbol size={22}>laptop_mac</Symbol>,
    linux: <Symbol size={22}>terminal</Symbol>,
    ios: <Symbol size={22}>phone_iphone</Symbol>,
    android: <Symbol size={22}>android</Symbol>,
};

const SessionIcon = ({ os, platform }) => {
    const key = `${os} ${platform}`.toLowerCase();
    if (key.includes('windows')) return SESSION_ICONS.windows;
    if (key.includes('mac') || key.includes('macos')) return SESSION_ICONS.mac;
    if (key.includes('linux')) return SESSION_ICONS.linux;
    if (key.includes('ios') || key.includes('iphone') || key.includes('ipad')) return SESSION_ICONS.ios;
    if (key.includes('android')) return SESSION_ICONS.android;
    return <Symbol size={22}>help_outline</Symbol>;
};

const SessionsPage = ({ socket }) => {
    const [sessions, setSessions] = useState(null);
    const [error, setError] = useState(null);
    const [busyId, setBusyId] = useState(null);

    useEffect(() => {
        if (!socket) return;
        socket.timeout(15000).emit('getSessions', {}, (err, result) => {
            if (err || !result?.ok) {
                setError(result?.error || 'セッションを読み込めませんでした');
                return;
            }
            setSessions(result.sessions || []);
        });
    }, [socket]);

    const logoutSession = (session) => {
        setBusyId(session.id);
        socket.timeout(15000).emit('logoutSession', { sessionId: session.id }, (err, result) => {
            setBusyId(null);
            if (err || !result?.ok) {
                setError(result?.error || 'セッションからログアウトできませんでした');
                return;
            }
            setSessions((prev) => (prev || []).filter((item) => item.id !== session.id));
        });
    };

    if (error) return <p className="app-modal-error">{error}</p>;
    if (!sessions) return <LoadingSpinner />;

    const current = sessions.find((session) => session.current);
    const others = sessions.filter((session) => !session.current);

    return (
        <div className="settings-page">
            <CategoryButtonGroup>
                <CategoryButtonCollapse
                    icon={<SessionIcon os={current?.os} platform={current?.platform} />}
                    title="現在のセッション"
                    description={current?.os || 'このデバイス'}
                >
                    <CategoryButton
                        iconBlank
                        title={current?.os || 'このデバイス'}
                        description={current?.location || 'このブラウザー'}
                    />
                </CategoryButtonCollapse>
                {others.length > 0 && (
                    <CategoryButton
                        icon={<Symbol size={22}>logout</Symbol>}
                        title="他のすべてのセッションからログアウト"
                        description="このデバイス以外のすべてのセッションをログアウトします"
                        onClick={() => others.forEach((session) => logoutSession(session))}
                    />
                )}
            </CategoryButtonGroup>
            {others.length > 0 && (
                <CategoryButtonGroup>
                    {others.map((session) => (
                        <CategoryButton
                            key={session.id}
                            icon={<SessionIcon os={session.os} platform={session.platform} />}
                            title={session.os || '不明なデバイス'}
                            description={session.location || session.platform || ''}
                            action={(
                                <button
                                    type="button"
                                    className="app-expressive-button size-sm shape-square is-active"
                                    title="このセッションからログアウト"
                                    disabled={busyId === session.id}
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        logoutSession(session);
                                    }}
                                >
                                    <md-ripple />
                                    <Symbol size={18}>logout</Symbol>
                                </button>
                            )}
                        />
                    ))}
                </CategoryButtonGroup>
            )}
            {sessions.length === 0 && <p className="settings-card-description">セッション情報を取得できませんでした。</p>}
        </div>
    );
};

const AccountPage = ({ user, socket, navigate }) => {
    const initialPresence = PRESENCE_OPTIONS.some(([value]) => value === user?.status)
        ? user.status
        : (user?.status === 'offline' ? 'invisible' : null);
    const [presence, setPresence] = useState(initialPresence);
    const [customStatus, setCustomStatus] = useState(user?.customStatus || user?.custom_status?.text || '');
    const [saved, setSaved] = useState(false);

    const applyPresence = (status) => {
        setPresence(status);
        socket?.emit('setPresence', { status }, (result) => {
            if (result?.ok !== false) {
                setSaved(true);
                setTimeout(() => setSaved(false), 2000);
            }
        });
    };

    const saveCustomStatus = () => {
        socket?.emit('setCustomStatus', { text: customStatus.trim() });
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const currentPresence = PRESENCE_OPTIONS.find(([value]) => value === presence);

    return (
        <div className="settings-page">
            <CategoryButtonGroup>
                <UserSummary user={user} onEdit={() => navigate?.('profile')} />
            </CategoryButtonGroup>
            <CategoryButtonGroup>
                <CategoryButton
                    icon={<Symbol size={22}>alternate_email</Symbol>}
                    title="ユーザー名"
                    description={user?.username}
                />
                <CategoryButton
                    icon={<Symbol size={22}>badge</Symbol>}
                    title="ユーザー ID"
                    description={user?.id}
                    action="copy"
                    onClick={() => navigator.clipboard?.writeText(user?.id || '')}
                />
            </CategoryButtonGroup>
            <CategoryButtonGroup>
                <CategorySelect
                    icon={currentPresence
                        ? <span className="settings-presence-dot" style={{ background: currentPresence[2] }} />
                        : <Symbol size={22}>schedule</Symbol>}
                    title="ステータス"
                    value={presence ?? PRESENCE_OPTIONS[0][0]}
                    onChange={applyPresence}
                    options={PRESENCE_OPTIONS.map(([value, label, color]) => ({
                        value,
                        label,
                        icon: <span className="settings-presence-dot" style={{ background: color }} />,
                    }))}
                />
            </CategoryButtonGroup>
            <CategoryButtonGroup>
                <CategoryButton icon={<Symbol size={22}>emoji_emotions</Symbol>} title="カスタムステータス">
                    <div className="settings-category-button-form">
                        <TextField
                            label="カスタムステータス"
                            value={customStatus}
                            maxLength={128}
                            placeholder="今なにしてる?"
                            onChange={setCustomStatus}
                        />
                        <Row>
                            <button type="button" className="settings-btn settings-btn-tonal" onClick={saveCustomStatus}>保存</button>
                        </Row>
                    </div>
                </CategoryButton>
            </CategoryButtonGroup>
            {saved && <p className="settings-saved-hint">保存しました</p>}
            <p className="settings-card-description">認証情報は Discord 側で管理されています。トークンは HttpOnly Cookie にのみ保存されます。</p>
        </div>
    );
};

/* UserProfileEditor: アバター/バナー/表示名/一人称/自己紹介 */
const ProfileImageField = ({ label, value, onPick, onRemove, round = false }) => {
    const inputRef = useRef(null);
    return (
        <div className="settings-image-field">
            <span className="app-modal-label">{label}</span>
            <div className="settings-image-field-row">
                <span
                    className={`settings-image-thumb${round ? ' is-round' : ''}`}
                    style={value ? { backgroundImage: `url(${typeof value === 'string' && value.startsWith('data:') ? value : getProxyUrl(value)})` } : undefined}
                >
                    {!value && <Symbol size={20}>add_photo_alternate</Symbol>}
                </span>
                <input ref={inputRef} type="file" accept="image/*" hidden onChange={onPick} />
                <button type="button" className="settings-btn settings-btn-text" onClick={() => inputRef.current?.click()}>画像を選択</button>
                {value && (
                    <button type="button" className="settings-btn settings-btn-text" onClick={onRemove}>削除</button>
                )}
            </div>
        </div>
    );
};

const ProfilePage = ({ user, socket, navigate }) => {
    const [initial, setInitial] = useState(null);
    const [form, setForm] = useState(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        if (!socket || !user?.id || loaded) return;
        socket.timeout(15000).emit('getUserProfile', { userId: user.id, guildId: '@me' }, (err, result) => {
            setLoaded(true);
            const next = {
                displayName: (!err && result?.displayName) || user.displayName || user.globalName || user.username || '',
                pronouns: (!err && result?.pronouns) || '',
                bio: (!err && result?.bio) || '',
                avatar: (!err && result?.avatar) || user.avatar || null,
                banner: (!err && result?.banner) || null,
            };
            setInitial(next);
            setForm(next);
        });
    }, [socket, user?.id, loaded, user]);

    if (!form || !initial) return <LoadingSpinner />;

    const dirty = form.displayName !== initial.displayName
        || form.pronouns !== initial.pronouns
        || form.bio !== initial.bio
        || form.avatar !== initial.avatar
        || form.banner !== initial.banner;

    const pickImage = (kind) => (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        event.target.value = '';
        if (!file.type.startsWith('image/')) {
            setError('画像ファイルを選択してください');
            return;
        }
        if (file.size > 4 * 1024 * 1024) {
            setError('画像は4MB以下にしてください');
            return;
        }
        setError(null);
        const reader = new FileReader();
        reader.onload = () => setForm((prev) => ({ ...prev, [kind]: reader.result }));
        reader.readAsDataURL(file);
    };

    const reset = () => {
        setForm(initial);
        setError(null);
    };

    const save = () => {
        setSaving(true);
        setError(null);
        const payload = { pronouns: form.pronouns.trim(), bio: form.bio.trim() };
        if (form.displayName.trim() !== (initial.displayName || '')) payload.displayName = form.displayName.trim();
        if (form.avatar !== initial.avatar) {
            if (typeof form.avatar === 'string' && form.avatar.startsWith('data:image/')) payload.avatar = form.avatar;
            else if (form.avatar === null) payload.removeAvatar = true;
        }
        if (form.banner !== initial.banner) {
            if (typeof form.banner === 'string' && form.banner.startsWith('data:image/')) payload.banner = form.banner;
            else if (form.banner === null) payload.removeBanner = true;
        }
        socket.timeout(20000).emit('updateSelfProfile', payload, (err, result) => {
            setSaving(false);
            if (err || !result?.ok) {
                setError(result?.error || 'プロフィールを保存できませんでした');
                return;
            }
            setInitial(form);
        });
    };

    return (
        <div className="settings-page">
            <CategoryButtonGroup>
                <UserSummary user={{ ...user, displayName: form.displayName || user.displayName }} bannerUrl={form.banner} onEdit={() => { }} />
            </CategoryButtonGroup>
            <h2 className="settings-page-title">グローバルプロフィールを編集</h2>
            <ProfileImageField
                label="アバター"
                value={form.avatar}
                round
                onPick={pickImage('avatar')}
                onRemove={() => setForm((prev) => ({ ...prev, avatar: null }))}
            />
            <ProfileImageField
                label="バナー"
                value={form.banner}
                onPick={pickImage('banner')}
                onRemove={() => setForm((prev) => ({ ...prev, banner: null }))}
            />
            <TextField
                label="表示名"
                value={form.displayName}
                maxLength={32}
                counter
                onChange={(value) => setForm((prev) => ({ ...prev, displayName: value }))}
            />
            <TextField
                label="一人称"
                value={form.pronouns}
                maxLength={40}
                counter
                placeholder="ぼく / 私"
                onChange={(value) => setForm((prev) => ({ ...prev, pronouns: value }))}
            />
            <CategoryButtonGroup>
                <CategoryButton
                    icon={<Symbol size={22}>badge</Symbol>}
                    title="ユーザー名を変更しますか?"
                    description="ユーザー名はアカウント設定で編集できます"
                    action="chevron"
                    onClick={() => navigate?.('account')}
                />
            </CategoryButtonGroup>
            <SectionLabel>プロフィールの自己紹介</SectionLabel>
            <TextField
                label="自己紹介"
                value={form.bio}
                maxLength={190}
                counter
                multiline
                rows={4}
                placeholder="Something cool about me..."
                onChange={(value) => setForm((prev) => ({ ...prev, bio: value }))}
            />
            <Row gap={8}>
                <button type="button" className="settings-btn settings-btn-text" onClick={reset} disabled={!dirty}>リセット</button>
                <button type="button" className="settings-btn settings-btn-filled" onClick={save} disabled={saving || !dirty}>
                    {saving ? '保存中...' : '保存'}
                </button>
            </Row>
            {error && <p className="app-modal-error">{error}</p>}
        </div>
    );
};

export {
    Avatar,
    SessionsPage,
    AccountPage,
    ProfilePage,
};