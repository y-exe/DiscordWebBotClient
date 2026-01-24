import { useCallback, useEffect, useState } from 'react';
import Symbol from '../../common/Symbol';
import { FaGlobe, FaHashtag } from 'react-icons/fa6';
import {
    ActionButton,
    EmptyState,
    LoadingSpinner,
    SectionLabel,
    TextField,
} from '../ui';

/**
 * チャンネル設定: ウェブフック
 */
export const ChannelWebhooksPage = ({ socket, channelId, canManage }) => {
    const [webhooks, setWebhooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [name, setName] = useState('');
    const [busy, setBusy] = useState(false);
    const [viewing, setViewing] = useState(null); // 詳細編集中のウェブフック
    const [form, setForm] = useState(null); // { name, avatar: string|null }
    const [saving, setSaving] = useState(false);
    const [copied, setCopied] = useState(false);

    const load = useCallback(() => {
        if (!socket || !channelId) return;
        socket.timeout(15000).emit('getChannelWebhooks', { channelId }, (err, result) => {
            setLoading(false);
            if (err || !result?.ok) {
                setError(result?.error || 'ウェブフックを取得できませんでした');
                return;
            }
            setWebhooks(result.webhooks || []);
        });
    }, [socket, channelId]);

    useEffect(() => { load(); }, [load]);

    if (!canManage) return <EmptyState icon={<FaGlobe size={22} />} title="権限がありません" description="ウェブフックを管理する権限がありません。" />;

    const openWebhook = (webhook) => {
        setViewing(webhook);
        setForm({ name: webhook.name, avatar: webhook.avatar });
        setError(null);
        setCopied(false);
    };

    const webhookUrl = viewing ? `${window.location.origin}/webhooks/${viewing.id}/${viewing.token}` : '';

    const saveWebhook = () => {
        if (!form?.name?.trim() || saving || !viewing) return;
        setSaving(true);
        setError(null);
        const payload = { webhookId: viewing.id, name: form.name.trim() };
        if (form.avatar !== viewing.avatar) payload.avatar = form.avatar ?? '';
        socket.timeout(15000).emit('editWebhook', payload, (err, result) => {
            setSaving(false);
            if (err || !result?.ok) {
                setError(result?.error || '保存できませんでした');
                return;
            }
            setViewing(null);
            setForm(null);
            load();
        });
    };

    const handleAvatar = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/') || file.size > 1024 * 1024) {
            event.target.value = '';
            return;
        }
        const reader = new FileReader();
        reader.onload = () => setForm((f) => ({ ...f, avatar: reader.result }));
        reader.readAsDataURL(file);
        event.target.value = '';
    };

    if (viewing && form) {
        return (
            <div className="settings-page">
                <button type="button" className="settings-back-btn" onClick={() => { setViewing(null); setForm(null); }}>
                    <Symbol size={20}>arrow_back</Symbol>
                    ウェブフック
                </button>
                <div>
                    <SectionLabel>{viewing.name} を編集</SectionLabel>
                    <div className="settings-webhook-avatar-row">
                        <img
                            src={form.avatar || 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" rx="40" fill="%234f545c"/></svg>')}
                            alt=""
                            className="settings-webhook-avatar"
                        />
                        <div className="flex flex-col gap-2">
                            <label className="settings-btn settings-btn-tonal" style={{ cursor: 'pointer' }}>
                                アイコンをアップロード
                                <input type="file" accept="image/*" hidden onChange={handleAvatar} />
                            </label>
                            {form.avatar && (
                                <button type="button" className="settings-btn settings-btn-text" onClick={() => setForm((f) => ({ ...f, avatar: null }))}>アイコンを削除</button>
                            )}
                        </div>
                    </div>
                    <TextField label="ウェブフック名" value={form.name} maxLength={80} onChange={(v) => setForm((f) => ({ ...f, name: v }))} />
                    <div className="settings-action-row">
                        <button
                            type="button"
                            className="settings-btn settings-btn-text"
                            onClick={() => { setForm({ name: viewing.name, avatar: viewing.avatar }); }}
                            disabled={saving}
                        >
                            リセット
                        </button>
                        <ActionButton variant="filled" busy={saving} onClick={saveWebhook} disabled={!form.name.trim()}>
                            保存
                        </ActionButton>
                    </div>
                </div>
                <div>
                    <SectionLabel>連携</SectionLabel>
                    <div className="settings-list">
                        <button
                            type="button"
                            className="settings-list-row settings-list-row-button"
                            onClick={() => {
                                navigator.clipboard?.writeText(webhookUrl).then(() => {
                                    setCopied(true);
                                    window.setTimeout(() => setCopied(false), 1500);
                                });
                            }}
                        >
                            <span className="settings-list-icon"><Symbol size={18}>content_copy</Symbol></span>
                            <span className="min-w-0 flex-1 text-left">{copied ? 'コピーしました!' : 'ウェブフックURLをコピー'}</span>
                            <Symbol size={18} className="text-[var(--app-outline)]">chevron_right</Symbol>
                        </button>
                        <button
                            type="button"
                            className="settings-list-row settings-list-row-button"
                            onClick={() => {
                                socket.timeout(15000).emit('deleteWebhook', { webhookId: viewing.id }, (err, result) => {
                                    if (!err && result?.ok) {
                                        setViewing(null);
                                        setForm(null);
                                        load();
                                    } else {
                                        setError(result?.error || '削除できませんでした');
                                    }
                                });
                            }}
                        >
                            <span className="settings-list-icon settings-icon-danger"><Symbol size={18}>delete</Symbol></span>
                            <span className="min-w-0 flex-1 text-left" style={{ color: 'var(--app-error)' }}>ウェブフックを削除</span>
                            <Symbol size={18} className="text-[var(--app-outline)]">chevron_right</Symbol>
                        </button>
                    </div>
                </div>
                {error && <p className="app-modal-error">{error}</p>}
            </div>
        );
    }

    return (
        <div className="settings-page">
            <SectionLabel>ウェブフック</SectionLabel>
            <p className="settings-card-description">外部サービスからこのチャンネルへメッセージを送れます。</p>
            <div className="flex gap-2">
                    <div className="min-w-0 flex-1">
                        <TextField label="新しいウェブフック名" value={name} maxLength={80} placeholder="Captain Hook" onChange={setName} />
                    </div>
                    <div className="pt-6">
                        <ActionButton
                            variant="tonal"
                            disabled={!name.trim()}
                            busy={busy}
                            onClick={() => {
                                setBusy(true);
                                socket.timeout(15000).emit('createWebhook', { channelId, name: name.trim() }, (err, result) => {
                                    setBusy(false);
                                    if (err || !result?.ok) {
                                        setError(result?.error || 'ウェブフックを作成できませんでした');
                                        return;
                                    }
                                    setName('');
                                    load();
                                });
                            }}
                        >
                            作成
                        </ActionButton>
                    </div>
                </div>
            {error && <p className="app-modal-error">{error}</p>}
            {loading ? <LoadingSpinner /> : webhooks.length === 0 ? (
                <EmptyState title="ウェブフックはありません" description="上のフォームから作成できます。" />
            ) : (
                <div className="settings-list">
                    {webhooks.map((webhook) => (
                        <button key={webhook.id} type="button" className="settings-list-row settings-list-row-button" onClick={() => openWebhook(webhook)}>
                            {webhook.avatar
                                ? <img src={webhook.avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
                                : <span className="settings-list-icon"><FaHashtag size={14} /></span>}
                            <span className="min-w-0 flex-1 text-left">
                                <span className="block truncate">{webhook.name}</span>
                                <span className="block text-xs text-[var(--app-outline)]">ID: {webhook.id}</span>
                            </span>
                            <Symbol size={18} className="text-[var(--app-outline)]">chevron_right</Symbol>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};
