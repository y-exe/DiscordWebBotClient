import Modal from './Modal';

/**
 * 確認ダイアログ (削除・退出などの破壊的操作用)
 */
const ConfirmDialog = ({
    open = true,
    title,
    body,
    confirmLabel = '削除',
    cancelLabel = 'キャンセル',
    danger = true,
    busy = false,
    onConfirm,
    onClose,
}) => (
    <Modal
        open={open}
        title={title}
        danger={danger}
        onClose={busy ? undefined : onClose}
        width={440}
        showClose={false}
        footer={(
            <>
                <button type="button" className="app-modal-button" onClick={onClose} disabled={busy}>{cancelLabel}</button>
                <button
                    type="button"
                    className={`app-modal-button ${danger ? 'app-modal-button-danger' : 'app-modal-button-primary'}`}
                    onClick={onConfirm}
                    disabled={busy}
                >
                    {busy ? '処理中...' : confirmLabel}
                </button>
            </>
        )}
    >
        {body && <p className="app-modal-body-text">{body}</p>}
    </Modal>
);

export default ConfirmDialog;
