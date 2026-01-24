/**
 * for-web の Symbol コンポーネントの React 版。
 * Material Symbols(Variable Font) のリガチャでアイコンを表示する。
 *
 * <Symbol>add</Symbol>
 * <Symbol size={20} fill>settings</Symbol>
 */
export default function Symbol({
    children,
    size,
    fill = false,
    grade = 0,
    opticalSize = 'auto',
    type = 'outlined',
    className = '',
    style,
    ...rest
}) {
    const fontVariationSettings = `"FILL" ${fill ? 1 : 0}, "wght" 400, "GRAD" ${grade}${
        opticalSize === 'auto' ? '' : `, "opsz" ${opticalSize}`
    }`;

    return (
        <span
            className={`material-symbols-${type} ${className}`.trim()}
            style={{
                display: 'block',
                fontVariationSettings,
                ...(size ? { fontSize: `${size}px` } : null),
                userSelect: 'none',
                ...style,
            }}
            aria-hidden="true"
            {...rest}
        >
            {children}
        </span>
    );
}
