import { useEffect, useState } from 'react';
import OverrideSwitch from '../OverrideSwitch';
import {
    ActionButton,
    EmptyState,
    LoadingSpinner,
    SectionLabel,
    SelectField,
    TextField,
} from '../ui';

const SLOWMODE_OPTIONS = [
    [0, 'オフ'], [5, '5秒'], [10, '10秒'], [15, '15秒'], [30, '30秒'], [60, '1分'],
    [120, '2分'], [300, '5分'], [600, '10分'], [1800, '30分'], [3600, '1時間'], [7200, '2時間'], [21600, '6時間'],
];

const TYPE_LABELS = {
    0: 'テキストチャンネル', 2: 'ボイスチャンネル', 4: 'カテゴリ', 5: 'お知らせチャンネル',
    13: 'ステージチャンネル', 15: 'フォーラムチャンネル', 10: 'スレッド', 11: '公開スレッド', 12: '非公開スレッド',
};

/**
 * チャンネル設定: 概要
 */
export const ChannelOverviewPage = ({ socket, channelId, onChanged }) => {
    const [channel, setChannel] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState(null);

    useEffect(() => {
        if (!socket || !channelId) return;
        socket.timeout(15000).emit('getChannel', { channelId }, (err, result) => {
            setLoading(false);
            const data = err ? null : result;
            if (!data?.ok) {
                setError(data?.error || 'チャンネル情報を取得できませんでした');
                return;
            }
            setChannel(data.channel);
            setForm({
                name: data.channel.name || '',
                topic: data.channel.topic || '',
                nsfw: Boolean(data.channel.nsfw),
                rateLimitPerUser: data.channel.rateLimitPerUser || 0,
            });
        });
    }, [socket, channelId]);

    const handleSave = async () => {
        if (!form?.name?.trim() || saving) return;
        setSaving(true);
        setError(null);
        socket.timeout(15000).emit('updateChannel', {
            channelId,
            name: form.name.trim(),
            topic: form.topic,
            nsfw: form.nsfw,
            rateLimitPerUser: form.rateLimitPerUser,
        }, (err, result) => {
            setSaving(false);
            if (err || !result?.ok) {
                setError(result?.error || '保存できませんでした');
                return;
            }
            onChanged?.();
        });
    };

    if (loading) return <LoadingSpinner />;
    if (!channel || !form) return <EmptyState title="チャンネルを読み込めませんでした" description={error} />;

    const isThread = [10, 11, 12].includes(channel.type);
    const isVoice = ['GUILD_VOICE', 'GUILD_STAGE_VOICE', 2, 13].includes(channel.type);
    const isCategory = channel.type === 4 || channel.type === 'GUILD_CATEGORY';
    const showMature = !isCategory && !isVoice && !isThread;

    const toggleMature = () => {
        setForm((f) => ({ ...f, nsfw: !f.nsfw }));
        socket.timeout(15000).emit('updateChannel', { channelId, nsfw: !form.nsfw }, (err, result) => {
            if (err || !result?.ok) setError(result?.error || '更新できませんでした');
        });
    };

    return (
        <div className="settings-page">
            <div>
                <SectionLabel>チャンネル情報</SectionLabel>
                <TextField label="チャンネル名" value={form.name} maxLength={100} counter onChange={(name) => setForm((f) => ({ ...f, name }))} />
                {!isCategory && !isVoice && !isThread && (
                    <TextField
                        label="トピック" value={form.topic} maxLength={1024} counter multiline rows={2}
                        placeholder="このチャンネルは何について?"
                        onChange={(topic) => setForm((f) => ({ ...f, topic }))}
                    />
                )}
                {!isCategory && !isVoice && !isThread && (
                    <SelectField
                        label="スローモード" value={form.rateLimitPerUser}
                        options={SLOWMODE_OPTIONS}
                        onChange={(value) => setForm((f) => ({ ...f, rateLimitPerUser: Number(value) }))}
                    />
                )}
                <div className="settings-actions">
                    <ActionButton variant="tonal" onClick={() => setForm({
                        name: channel.name || '',
                        topic: channel.topic || '',
                        nsfw: Boolean(channel.nsfw),
                        rateLimitPerUser: channel.rateLimitPerUser || 0,
                    })}>リセット</ActionButton>
                    <ActionButton variant="filled" onClick={handleSave} busy={saving}>保存</ActionButton>
                </div>
                {error && <p className="app-modal-error">{error}</p>}
            </div>
            {showMature && (
                <div>
                    <SectionLabel>年齢制限として設定</SectionLabel>
                    <p className="settings-card-description">このチャンネルを開くときに年齢確認が表示されます。</p>
                    <div className="settings-actions">
                        <ActionButton variant="tonal" onClick={toggleMature}>{form.nsfw ? '年齢制限を解除' : '年齢制限として設定'}</ActionButton>
                    </div>
                </div>
            )}
            <div>
                <SectionLabel>チャンネルの種類</SectionLabel>
                <p className="settings-card-description">{TYPE_LABELS[channel.type] || 'チャンネル'} ・ ID: {channel.id}</p>
            </div>
        </div>
    );
};

export { ChannelPermissionsPage } from './ChannelPermissionsPage';
export { ChannelWebhooksPage } from './ChannelWebhooksPage';
