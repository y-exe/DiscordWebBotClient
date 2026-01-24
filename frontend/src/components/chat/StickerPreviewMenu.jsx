import { useEffect, useRef } from 'react';
import { getStickerUrl, isLottieSticker } from '../../utils/stickers';
import { getProxyUrl } from '../../utils/helpers';

const StickerPreviewMenu = ({ preview, guild, onClose }) => {
    const menuRef = useRef(null);
    const sticker = preview?.sticker;
    const anchor = preview?.anchor;

    useEffect(() => {
        if (!menuRef.current || !anchor) return;
        const menu = menuRef.current;
        const frame = requestAnimationFrame(() => {
            menu.anchorElement = anchor;
            if (typeof menu.show === 'function') {
                menu.show();
            } else {
                menu.open = true;
            }
        });
        return () => cancelAnimationFrame(frame);
    }, [anchor, preview?.key]);

    useEffect(() => {
        const menu = menuRef.current;
        if (!menu) return undefined;
        const handleClosed = () => onClose(preview?.key);
        menu.addEventListener('closed', handleClosed);
        return () => menu.removeEventListener('closed', handleClosed);
    }, [onClose, preview?.key]);

    if (!sticker) return null;
    const stickerUrl = getStickerUrl(sticker);
    const serverName = guild?.id !== '@me' ? guild?.name : null;

    return (
        <md-menu
            ref={menuRef}
            class="app-sticker-menu"
            positioning="fixed"
            anchor-corner="start-end"
            menu-corner="start-start"
            x-offset="8"
            skip-restore-focus
        >
            <div className="app-sticker-menu-content" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                <div className="app-sticker-menu-main">
                    <div className="app-sticker-menu-preview">
                        {isLottieSticker(sticker) ? (
                            <span className="app-sticker-lottie">{sticker.name}</span>
                        ) : (
                            <img src={getProxyUrl(stickerUrl)} alt={sticker.name} />
                        )}
                    </div>
                    <div className="app-sticker-menu-copy">
                        <h3>{sticker.name}</h3>
                        <p>{sticker.description || 'このサーバーで作られたスタンプです。'}</p>
                    </div>
                </div>
                {serverName && (
                    <>
                        <md-divider />
                        <div className="app-sticker-menu-server">
                            {guild?.icon ? <img src={getProxyUrl(guild.icon)} alt="" /> : <span>{guild?.acronym || guild?.name?.slice(0, 2)}</span>}
                            <div>
                                <p>このスタンプが作られたサーバー</p>
                                <strong>{serverName}</strong>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </md-menu>
    );
};

export default StickerPreviewMenu;
