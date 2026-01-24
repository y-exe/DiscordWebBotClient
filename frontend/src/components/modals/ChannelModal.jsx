import { useMemo, useState } from 'react';
import { FaHashtag } from 'react-icons/fa6';
import Modal from '../common/Modal';

const CHANNEL_TYPE_OPTIONS = [
    { id: 'text', label: 'テキストチャンネル', hint: 'メッセージや画像、動画を送信します' },
    { id: 'voice', label: 'ボイスチャンネル', hint: '通話やビデオ、画面共有をします' },
    { id: 'announcement', label: 'お知らせチャンネル', hint: '重要なお知らせを投稿します' },
    { id: 'forum', label: 'フォーラムチャンネル', hint: '投稿を作って話し合う場所です' },
];

const TYPE_LABELS = {
    0: 'テキストチャンネル', 2: 'ボイスチャンネル', 4: 'カテゴリ',
    5: 'お知らせチャンネル', 13: 'ステージチャンネル', 15: 'フォーラムチャンネル',
    GUILD_TEXT: 'テキストチャンネル', GUILD_VOICE: 'ボイスチャンネル', GUILD_CATEGORY: 'カテゴリ',
    GUILD_ANNOUNCEMENT: 'お知らせチャンネル', GUILD_STAGE_VOICE: 'ステージチャンネル', GUILD_FORUM: 'フォーラムチャンネル',
};

const SLOWMODE_OPTIONS = [
    [0, 'オフ'], [5, '5秒'], [10, '10秒'], [15, '15秒'], [30, '30秒'], [60, '1分'],
    [120, '2分'], [300, '5分'], [600, '10分'], [1800, '30分'], [3600, '1時間'], [7200, '2時間'], [21600, '6時間'],
];

/**
 * チャンネル作成 / 編集モーダル
 * mode: 'create' | 'edit'
 * (呼び出し側で key を変えて再マウントし、状態を初期化します)
 */
const ChannelModal = ({
    open = true,
    mode = 'create',
    channel = null,
    categories = [],
    defaultParentId = null,
    initialType = null,
    busy = false,
    error = null,
    onSubmit,
    onClose,
}) => {
    const isEdit = mode === 'edit' && channel;
    const [name, setName] = useState(isEdit ? (channel.name || '') : '');
    const [type, setType] = useState(initialType || 'text');
    const [parentId, setParentId] = useState(isEdit ? (channel.parentId || '') : (defaultParentId || ''));
    const [topic, setTopic] = useState(isEdit ? (channel.topic || '') : '');
    const [nsfw, setNsfw] = useState(isEdit ? Boolean(channel.nsfw) : false);
    const [slowmode, setSlowmode] = useState(isEdit ? (channel.rateLimitPerUser || 0) : 0);

    const channelType = channel?.type;
    const isCategory = channelType === 'GUILD_CATEGORY' || channelType === 4;
    const isVoice = ['GUILD_VOICE', 'GUILD_STAGE_VOICE', 2, 13].includes(channelType);
    const isThread = [10, 11, 12].includes(channelType);
    const isCreatingCategory = !isEdit && initialType === 'category';
    const showTopic = isCreatingCategory ? false : !isEdit || (!isCategory && !isVoice && !isThread);
    const showSlowmode = isCreatingCategory ? false : !isEdit || (!isCategory && !isVoice && !isThread);
    const showNsfw = isCreatingCategory ? false : !isCategory && !isVoice && !isThread;

    const canSubmit = useMemo(() => name.trim().length > 0 && !busy, [name, busy]);

    const handleSubmit = (event) => {
        event.preventDefault();
        if (!canSubmit) return;
        if (isEdit) {
            const payload = { name: name.trim() };
            if (showTopic) payload.topic = topic;
            if (!isCategory && !isVoice && !isThread) payload.nsfw = nsfw;
            if (showSlowmode) payload.rateLimitPerUser = Number(slowmode);
            onSubmit?.(payload);
        } else {
            onSubmit?.({
                name: name.trim(),
                type,
                parentId: parentId || null,
                nsfw: type === 'text' || type === 'announcement' ? nsfw : undefined,
            });
        }
    };

    return (
        <Modal
            open={open}
            title={isEdit ? 'チャンネルを編集' : 'チャンネルを作成'}
            description={isEdit ? (TYPE_LABELS[channelType] || 'チャンネル') : 'サーバーに新しいチャンネルを追加します'}
            onClose={busy ? undefined : onClose}
            width={480}
            footer={(
                <>
                    <button type="button" className="app-modal-button" onClick={onClose} disabled={busy}>キャンセル</button>
                    <button type="button" className="app-modal-button app-modal-button-primary" onClick={handleSubmit} disabled={!canSubmit}>
                        {busy ? '処理中...' : isEdit ? '変更を保存' : '作成'}
                    </button>
                </>
            )}
        >
            <form className="app-modal-form" onSubmit={handleSubmit}>
                {!isEdit && initialType !== 'category' && (
                    <div className="app-modal-type-grid">
                        {CHANNEL_TYPE_OPTIONS.map((option) => (
                            <button
                                key={option.id}
                                type="button"
                                className="app-modal-type-option"
                                data-selected={type === option.id}
                                onClick={() => setType(option.id)}
                            >
                                <FaHashtag size={16} className="mt-0.5 shrink-0" />
                                <span className="min-w-0">
                                    <span className="block text-sm font-semibold">{option.label}</span>
                                    <span className="block text-xs text-[var(--app-on-surface-variant)]">{option.hint}</span>
                                </span>
                            </button>
                        ))}
                    </div>
                )}
                <label className="app-modal-field">
                    <span className="app-modal-label">{isCategory ? 'カテゴリ名' : 'チャンネル名'}</span>
                    <input
                        className="app-modal-input"
                        value={name}
                        maxLength={100}
                        autoFocus
                        placeholder="new-channel"
                        onChange={(e) => setName(e.target.value)}
                    />
                </label>
                {!isEdit && (
                    <label className="app-modal-field">
                        <span className="app-modal-label">カテゴリ (任意)</span>
                        <select className="app-modal-input" value={parentId} onChange={(e) => setParentId(e.target.value)}>
                            <option value="">カテゴリなし</option>
                            {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                        </select>
                    </label>
                )}
                {showTopic && (
                    <label className="app-modal-field">
                        <span className="app-modal-label">チャンネルのトピック (任意)</span>
                        <textarea
                            className="app-modal-input app-modal-textarea"
                            value={topic}
                            maxLength={1024}
                            rows={2}
                            placeholder="このチャンネルは何について?"
                            onChange={(e) => setTopic(e.target.value)}
                        />
                    </label>
                )}
                {showNsfw && (
                    <>
                        <div className="app-modal-toggle-row" onClick={() => setNsfw((v) => !v)}>
                            <div className="min-w-0">
                                <span className="block text-sm font-semibold">年齢制限チャンネル (NSFW)</span>
                                <span className="block text-xs text-[var(--app-on-surface-variant)]">開くときに年齢確認が表示されます</span>
                            </div>
                            <span className="app-modal-switch" data-checked={nsfw}><span className="app-modal-switch-knob" /></span>
                        </div>
                        {showSlowmode && (
                            <label className="app-modal-field">
                                <span className="app-modal-label">スローモード</span>
                                <select className="app-modal-input" value={slowmode} onChange={(e) => setSlowmode(Number(e.target.value))}>
                                    {SLOWMODE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                                </select>
                            </label>
                        )}
                    </>
                )}
                {error && <p className="app-modal-error">{error}</p>}
            </form>
        </Modal>
    );
};

export default ChannelModal;
