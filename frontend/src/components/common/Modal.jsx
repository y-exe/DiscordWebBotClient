import { useEffect, useRef } from 'react';
import { FaXmark } from 'react-icons/fa6';

/**
 * 中央モーダルダイアログの共通コンテナ (scrim + カード)
 * for-web の Dialog と同じ構造: 左上に閉じるボタン付き
 */
const Modal = ({
    open = true,
    title,
    description,
    onClose,
    children,
    footer,
    danger = false,
    width = 460,
    showClose = true,
}) => {
    const cardRef = useRef(null);

    useEffect(() => {
        if (!open) return undefined;
        const onKeyDown = (event) => {
            if (event.key === 'Escape') {
                event.stopPropagation();
                onClose?.();
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div className="app-modal-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
            <div
                ref={cardRef}
                className={`app-modal-card${danger ? ' app-modal-card-danger' : ''}`}
                style={{ maxWidth: width }}
                role="dialog"
                aria-modal="true"
            >
                {showClose && (
                    <button type="button" className="app-modal-close" onClick={onClose} aria-label="閉じる">
                        <FaXmark size={18} />
                    </button>
                )}
                {(title || description) && (
                    <div className="app-modal-head">
                        <h2 className="app-modal-title">{title}</h2>
                        {description && <p className="app-modal-description">{description}</p>}
                    </div>
                )}
                {children}
                {footer && <div className="app-modal-footer">{footer}</div>}
            </div>
        </div>
    );
};

export default Modal;
