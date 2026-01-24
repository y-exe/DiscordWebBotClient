import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import Symbol from './Symbol';

/**
 * 右クリック / ボタンから開く汎用コンテキストメニュー。
 * for-web の ContextMenu と同じく位置を自動で画面内に収める。
 * items の要素に { items: [...] } を渡すと for-web ContextMenuSubMenu の
 * ネストメニュー、{ radio: true, selected: bool } でラジオ選択表示になる。
 */
const ActionMenu = ({ x, y, items, onClose, width = 200 }) => {
    const ref = useRef(null);
    const [pos, setPos] = useState({ x, y, ready: false });
    const [openSubmenu, setOpenSubmenu] = useState(null);
    const [subPos, setSubPos] = useState(null);

    useLayoutEffect(() => {
        const el = ref.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        let nx = x;
        let ny = y;
        if (x + rect.width + 8 > window.innerWidth) nx = Math.max(8, window.innerWidth - rect.width - 8);
        if (y + rect.height + 8 > window.innerHeight) ny = Math.max(8, y - rect.height - (y - window.innerHeight + rect.height + 8) - 16);
        // 実測したサイズから画面内に収めるための測定後更新
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPos({ x: nx, y: ny, ready: true });
    }, [x, y]);

    useEffect(() => {
        const onKeyDown = (event) => { if (event.key === 'Escape') onClose?.(); };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [onClose]);

    if (!items?.length) return null;

    const openSubmenuAt = (item, event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const estimatedWidth = 208;
        const estimatedHeight = Math.min(420, item.items.length * 40 + 16);
        let sx = rect.right;
        if (sx + estimatedWidth + 8 > window.innerWidth) sx = Math.max(8, rect.left - estimatedWidth - 8);
        const sy = Math.min(rect.top, Math.max(8, window.innerHeight - estimatedHeight - 8));
        setSubPos({ x: sx, y: sy });
        setOpenSubmenu((current) => (current === item.id ? null : item.id));
    };

    const renderItems = (list, depth = 0) => (
        <>
            {list.map((item, index) => {
                if (item.type === 'divider') return <div key={`d${depth}-${index}`} className="app-action-menu-divider" />;
                if (item.type === 'label') return <div key={`l${depth}-${index}`} className="app-action-menu-label">{item.label}</div>;
                const key = item.id ?? `i${depth}-${index}`;
                if (Array.isArray(item.items)) {
                    const open = openSubmenu === item.id;
                    return (
                        <div key={key} className="app-action-menu-submenu-anchor">
                            <button
                                type="button"
                                role="menuitem"
                                aria-haspopup="menu"
                                aria-expanded={open}
                                className="app-action-menu-item"
                                data-open={open ? 'true' : 'false'}
                                onClick={(event) => { event.stopPropagation(); openSubmenuAt(item, event); }}
                                onContextMenu={(event) => { event.preventDefault(); event.stopPropagation(); openSubmenuAt(item, event); }}
                            >
                                {item.icon && <span className="app-action-menu-icon">{item.icon}</span>}
                                <span className="min-w-0 flex-1 truncate text-left">{item.label}</span>
                                <span className="app-action-menu-chevron">▸</span>
                            </button>
                            {open && subPos && item.items.length > 0 && (
                                <div
                                    className="app-action-menu app-action-menu-submenu"
                                    role="menu"
                                    style={{ left: subPos.x, top: subPos.y }}
                                >
                                    {renderItems(item.items, depth + 1)}
                                </div>
                            )}
                        </div>
                    );
                }
                return (
                    <button
                        key={key}
                        type="button"
                        role="menuitem"
                        className="app-action-menu-item"
                        data-danger={item.danger ? 'true' : 'false'}
                        disabled={item.disabled}
                        onClick={(event) => {
                            event.stopPropagation();
                            onClose?.();
                            item.onClick?.(event);
                        }}
                    >
                        {item.icon && <span className="app-action-menu-icon">{item.icon}</span>}
                        <span className="min-w-0 flex-1 truncate text-left">{item.label}</span>
                        {item.radio && (
                            <span className="app-action-menu-icon app-action-menu-radio">
                                <Symbol size={18} fill={item.selected}>{item.selected ? 'radio_button_checked' : 'radio_button_unchecked'}</Symbol>
                            </span>
                        )}
                        {item.shortcut && <span className="app-action-menu-shortcut">{item.shortcut}</span>}
                    </button>
                );
            })}
        </>
    );

    return (
        <div
            className="app-action-menu-scrim"
            onContextMenu={(e) => e.preventDefault()}
            onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
        >
            <div
                ref={ref}
                className="app-action-menu"
                role="menu"
                style={{
                    left: pos.x,
                    top: pos.y,
                    width,
                    opacity: pos.ready ? 1 : 0,
                    pointerEvents: pos.ready ? 'auto' : 'none',
                }}
            >
                {renderItems(items)}
            </div>
        </div>
    );
};

export default ActionMenu;
