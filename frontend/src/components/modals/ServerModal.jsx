import { useState } from 'react';
import Modal from '../common/Modal';

/**
 * サーバー作成モーダル (アイコン + 名前)
 * (呼び出し側で key を変えて再マウントし、状態を初期化します)
 */
const ServerModal = ({ open = true, busy = false, error = null, onSubmit, onClose }) => {
    const [name, setName] = useState('');
    const [iconData, setIconData] = useState(null);
    const [fileKey, setFileKey] = useState(0);

    const handleFile = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) return;
        if (file.size > 1024 * 1024) {
            event.target.value = '';
            return;
        }
        const reader = new FileReader();
        reader.onload = () => setIconData(reader.result);
        reader.readAsDataURL(file);
    };

    const canSubmit = name.trim().length > 0 && !busy;

    return (
        <Modal
            open={open}
            title="サーバーを作成"
            description="サーバーとはあなたと友達が集まる場所です。あとでいつでも変更できます。"
            onClose={busy ? undefined : onClose}
            width={460}
            footer={(
                <>
                    <button type="button" className="app-modal-button" onClick={onClose} disabled={busy}>キャンセル</button>
                    <button
                        type="button"
                        className="app-modal-button app-modal-button-primary"
                        disabled={!canSubmit}
                        onClick={() => onSubmit?.({ name: name.trim(), icon: iconData })}
                    >
                        {busy ? '処理中...' : '作成'}
                    </button>
                </>
            )}
        >
            <form className="app-modal-form" onSubmit={(e) => { e.preventDefault(); if (canSubmit) onSubmit?.({ name: name.trim(), icon: iconData }); }}>
                <div className="flex flex-col items-center gap-2">
                    <label className="app-modal-icon-picker" title="アイコンをアップロード">
                        {iconData ? <img src={iconData} alt="" /> : <span className="text-xs">アイコン<br />アップロード</span>}
                        <input key={fileKey} type="file" accept="image/*" className="hidden" onChange={handleFile} />
                    </label>
                    {iconData && (
                        <button type="button" className="text-xs text-[var(--app-error)] hover:underline" onClick={() => { setIconData(null); setFileKey((k) => k + 1); }}>アイコンを削除</button>
                    )}
                </div>
                <label className="app-modal-field">
                    <span className="app-modal-label">サーバー名</span>
                    <input className="app-modal-input" value={name} maxLength={100} autoFocus placeholder="新しいサーバー" onChange={(e) => setName(e.target.value)} />
                </label>
                {error && <p className="app-modal-error">{error}</p>}
            </form>
        </Modal>
    );
};

/**
 * 招待コードでサーバーに参加するモーダル
 */
export const JoinServerModal = ({ open = true, busy = false, error = null, onSubmit, onClose }) => {
    const [code, setCode] = useState('');

    const cleaned = code.trim().replace(/^https?:\/\/(discord\.gg|discord\.com\/invite)\//i, '');
    const canSubmit = cleaned.length >= 2 && !busy;

    return (
        <Modal
            open={open}
            title="招待でサーバーに参加"
            onClose={busy ? undefined : onClose}
            width={440}
            footer={(
                <>
                    <button type="button" className="app-modal-button" onClick={onClose} disabled={busy}>キャンセル</button>
                    <button
                        type="button"
                        className="app-modal-button app-modal-button-primary"
                        disabled={!canSubmit}
                        onClick={() => onSubmit?.(cleaned)}
                    >
                        {busy ? '処理中...' : '参加'}
                    </button>
                </>
            )}
        >
            <form className="app-modal-form" onSubmit={(e) => { e.preventDefault(); if (canSubmit) onSubmit?.(cleaned); }}>
                <label className="app-modal-field">
                    <span className="app-modal-label">招待リンクまたはコード</span>
                    <input className="app-modal-input" value={code} autoFocus placeholder="https://discord.gg/xxxx または xxxx" onChange={(e) => setCode(e.target.value)} />
                </label>
                {error && <p className="app-modal-error">{error}</p>}
            </form>
        </Modal>
    );
};

export default ServerModal;
