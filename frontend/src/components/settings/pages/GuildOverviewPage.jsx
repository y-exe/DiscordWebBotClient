import { useState } from 'react';
import { getProxyUrl } from '../../../utils/helpers';
import {
    ActionButton,
    EmptyState,
    LoadingSpinner,
    SectionLabel,
    SelectField,
    TextField,
    PERMISSION_BITS,
} from '../ui';

const ROLE_PERMISSION_GRID = [
    ['サーバーを管理', PERMISSION_BITS.MANAGE_GUILD],
    ['役職を管理', PERMISSION_BITS.MANAGE_ROLES],
    ['チャンネルを管理', PERMISSION_BITS.MANAGE_CHANNELS],
    ['メンバーをキック', PERMISSION_BITS.KICK_MEMBERS],
    ['メンバーをBAN', PERMISSION_BITS.BAN_MEMBERS],
    ['メンバーをタイムアウト', PERMISSION_BITS.MODERATE_MEMBERS],
    ['監査ログを表示', PERMISSION_BITS.VIEW_AUDIT_LOG],
    ['ウェブフックを管理', PERMISSION_BITS.MANAGE_WEBHOOKS],
    ['絵文字とスタンプを管理', PERMISSION_BITS.MANAGE_EXPRESSIONS],
    ['招待を作成', PERMISSION_BITS.CREATE_INVITE],
    ['メッセージを管理', PERMISSION_BITS.MANAGE_MESSAGES],
];

const formatDate = (timestamp) => {
    if (!timestamp) return '—';
    try {
        return new Date(timestamp).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
        return '—';
    }
};

/**
 * サーバー設定: 概要
 */
export const GuildOverviewPage = ({ socket, guildId, guild, channels = [], onChanged }) => {
    const [form, setForm] = useState({ name: guild?.name || '', description: guild?.description || '' });
    const [verificationLevel, setVerificationLevel] = useState(guild?.verificationLevel ?? 0);
    const [systemChannelId, setSystemChannelId] = useState(guild?.systemChannelId ?? null);
    const [icon, setIcon] = useState(null);
    const [banner, setBanner] = useState(null);
    const [fileKey, setFileKey] = useState(0);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    if (!guild) return <EmptyState title="サーバー情報を読み込めませんでした" />;

    const readableChannels = (channels || []).flatMap((category) => (category.channels || []));

    const handleIcon = (event) => {
        const file = event.target.files?.[0];
        if (!file || !file.type.startsWith('image/') || file.size > 1024 * 1024) {
            event.target.value = '';
            return;
        }
        const reader = new FileReader();
        reader.onload = () => setIcon(reader.result);
        reader.readAsDataURL(file);
    };

    const handleBanner = (event) => {
        const file = event.target.files?.[0];
        if (!file || !file.type.startsWith('image/') || file.size > 1024 * 1024) {
            event.target.value = '';
            return;
        }
        const reader = new FileReader();
        reader.onload = () => setBanner(reader.result);
        reader.readAsDataURL(file);
    };

    const handleSave = () => {
        if (!form.name.trim() || saving) return;
        setSaving(true);
        setError(null);
        const payload = { guildId, name: form.name.trim(), description: form.description, verificationLevel: Number(verificationLevel), systemChannelId };
        if (icon) payload.icon = icon;
        if (banner) payload.banner = banner;
        socket.timeout(15000).emit('updateGuild', payload, (err, result) => {
            setSaving(false);
            if (err || !result?.ok) {
                setError(result?.error || '保存できませんでした');
                return;
            }
            setIcon(null);
            setBanner(null);
            setFileKey((key) => key + 1);
            onChanged?.();
        });
    };

    return (
        <div className="settings-page">
            <div>
                <SectionLabel>サーバー情報</SectionLabel>
                <div className="flex items-center gap-4">
                    <label className="app-modal-icon-picker" title="アイコンを変更">
                        {icon ? <img src={icon} alt="" />
                            : guild.icon ? <img src={getProxyUrl(guild.icon)} alt="" />
                                : <span className="text-sm">{(guild.name || '?').slice(0, 2)}</span>}
                        <input key={fileKey} type="file" accept="image/*" className="hidden" onChange={handleIcon} />
                    </label>
                    <div className="min-w-0 flex-1">
                        <TextField label="サーバー名" value={form.name} maxLength={100} onChange={(name) => setForm((f) => ({ ...f, name }))} />
                    </div>
                </div>
                <label className="app-modal-icon-picker settings-banner-picker" title="バナーを変更">
                    {banner ? <img src={banner} alt="" />
                        : guild.banner ? <img src={getProxyUrl(guild.banner)} alt="" />
                            : <span className="text-xs text-[var(--app-outline)]">バナーなし</span>}
                    <input key={`banner-${fileKey}`} type="file" accept="image/*" className="hidden" onChange={handleBanner} />
                </label>
                <TextField
                    label="サーバーの説明" value={form.description} maxLength={120} counter
                    placeholder="このサーバーについて教えてください"
                    onChange={(description) => setForm((f) => ({ ...f, description }))}
                />
                <SelectField
                    label="確認レベル (参加制限)"
                    value={verificationLevel}
                    options={[
                        [0, '制限なし'],
                        [1, '低 — メール認証済みであること'],
                        [2, '中 — Discord登録から5分以上経過していること'],
                        [3, '高 — メンバーとして10分以上経過していること'],
                        [4, '最高 — 電話認証済みであること'],
                    ]}
                    onChange={(value) => setVerificationLevel(Number(value))}
                />
                <SelectField
                    label="システムメッセージチャンネル"
                    value={systemChannelId ?? ''}
                    options={[
                        ['', '無効'],
                        ...readableChannels.map((channel) => [channel.id, `#${channel.name}`]),
                    ]}
                    onChange={(value) => setSystemChannelId(value || null)}
                />
                <div className="settings-actions">
                    <ActionButton variant="tonal" onClick={() => {
                        setForm({ name: guild?.name || '', description: guild?.description || '' });
                        setVerificationLevel(guild?.verificationLevel ?? 0);
                        setSystemChannelId(guild?.systemChannelId ?? null);
                        setIcon(null);
                        setBanner(null);
                        setFileKey((key) => key + 1);
                    }}>リセット</ActionButton>
                    <ActionButton variant="filled" onClick={handleSave} busy={saving}>保存</ActionButton>
                </div>
                {error && <p className="app-modal-error">{error}</p>}
            </div>
            <div>
                <SectionLabel>サーバーの統計</SectionLabel>
                <div className="settings-info-grid">
                    <div><strong>{guild.memberCount ?? '—'}</strong><span>メンバー</span></div>
                    <div><strong>{guild.onlineCount ?? '—'}</strong><span>オンライン</span></div>
                    <div><strong>{formatDate(guild.createdAt)}</strong><span>作成日</span></div>
                </div>
            </div>
        </div>
    );
};

/**
 * サーバー設定: 役職
 */