import { useState } from 'react';
import { FaCopy, FaCheck } from 'react-icons/fa6';
import Modal from '../common/Modal';

/**
 * 招待リンク作成モーダル
 * (呼び出し側で key を変えて再マウントし、状態を初期化します)
 */
const InviteModal = ({ open = true, channelName = '', busy = false, invite = null, error = null, onCreate, onClose }) => {
    const [maxAge, setMaxAge] = useState(86400);
    const [maxUses, setMaxUses] = useState(0);
    const [temporary, setTemporary] = useState(false);
    const [copied, setCopied] = useState(false);

    const copyLink = async () => {
        if (!invite?.url) return;
        try {
            await navigator.clipboard.writeText(invite.url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch { /* クリップボードにコピーできない環境では無視 */ }
    };

    return (
        <Modal
            open={open}
            title={`#${channelName || 'チャンネル'} への招待`}
            description="リンクを共有してサーバーに招待しましょう。"
            onClose={busy ? undefined : onClose}
            width={440}
            footer={(
                <>
                    <button type="button" className="app-modal-button" onClick={onClose}>閉じる</button>
                    <button
                        type="button"
                        className="app-modal-button app-modal-button-primary"
                        disabled={busy}
                        onClick={() => onCreate?.({ maxAge: Number(maxAge), maxUses: Number(maxUses), temporary })}
                    >
                        {busy ? '処理中...' : '招待リンクを生成'}
                    </button>
                </>
            )}
        >
            <div className="app-modal-form">
                {invite && (
                    <div className="app-invite-result">
                        <span className="app-invite-code">{invite.url}</span>
                        <button type="button" className="app-invite-copy" onClick={copyLink}>
                            {copied ? <FaCheck size={14} /> : <FaCopy size={14} />}
                            {copied ? 'コピーしました' : 'コピー'}
                        </button>
                    </div>
                )}
                <label className="app-modal-field">
                    <span className="app-modal-label">有効期限</span>
                    <select className="app-modal-input" value={maxAge} onChange={(e) => setMaxAge(e.target.value)}>
                        <option value={1800}>30分</option>
                        <option value={3600}>1時間</option>
                        <option value={21600}>6時間</option>
                        <option value={43200}>12時間</option>
                        <option value={86400}>1日</option>
                        <option value={604800}>7日</option>
                        <option value={0}>無期限</option>
                    </select>
                </label>
                <label className="app-modal-field">
                    <span className="app-modal-label">使用回数</span>
                    <select className="app-modal-input" value={maxUses} onChange={(e) => setMaxUses(e.target.value)}>
                        <option value={0}>無制限</option>
                        <option value={1}>1回</option>
                        <option value={5}>5回</option>
                        <option value={10}>10回</option>
                        <option value={25}>25回</option>
                        <option value={100}>100回</option>
                    </select>
                </label>
                <div className="app-modal-toggle-row" onClick={() => setTemporary((v) => !v)}>
                    <div className="min-w-0">
                        <span className="block text-sm font-semibold">一時的なメンバーを許可</span>
                        <span className="block text-xs text-[var(--app-on-surface-variant)]">切断するとサーバーから自動的に退出させます</span>
                    </div>
                    <span className="app-modal-switch" data-checked={temporary}><span className="app-modal-switch-knob" /></span>
                </div>
                {error && <p className="app-modal-error">{error}</p>}
            </div>
        </Modal>
    );
};

export default InviteModal;
