import { useEffect, useState } from 'react';
import Symbol from '../common/Symbol';
import { getProxyUrl } from '../../utils/helpers';
import { safeMediaUrl } from '../../utils/security';

const humanFileSize = (size) => {
    if (!Number.isFinite(size) || size < 0) return null;
    if (size < 1024) return `${size} B`;
    const units = ['KB', 'MB', 'GB'];
    let value = size;
    let unit = 'B';
    for (const next of units) {
        if (value < 1024) break;
        value /= 1024;
        unit = next;
    }
    return `${value.toFixed(value < 10 ? 1 : 0)} ${unit}`;
};

const attachmentKind = (attachment) => {
    const type = attachment.contentType || '';
    if (type.startsWith('image/')) return 'image';
    if (type.startsWith('video/')) return 'video';
    if (type.startsWith('audio/')) return 'audio';
    if (type.startsWith('text/')) return 'text';
    return 'file';
};

const KIND_ICONS = {
    image: 'image',
    video: 'movie',
    audio: 'headphones',
    text: 'description',
    file: 'draft',
};

/**
 * for-web FileInfo: ファイル名 + サイズ + ダウンロードボタン
 */
export const FileCard = ({ attachment, downloadable = true }) => {
    const kind = attachmentKind(attachment);
    const sizeText = humanFileSize(attachment.size);
    const name = attachment.name || 'ファイル';

    return (
        <div className="app-file-info">
            <span className="app-file-info-icon">
                <Symbol size={22}>{KIND_ICONS[kind] || 'draft'}</Symbol>
            </span>
            <span className="app-file-info-text">
                <span className="app-file-info-name">{name}</span>
                {sizeText && <span className="app-file-info-size">{sizeText}</span>}
            </span>
            {downloadable && (
                <button
                    type="button"
                    className="app-file-info-download"
                    title="ダウンロード"
                    onClick={(event) => {
                        event.stopPropagation();
                        const link = document.createElement('a');
                        link.href = attachment.url;
                        link.download = name;
                        link.target = '_blank';
                        document.body.appendChild(link);
                        link.click();
                        link.remove();
                    }}
                >
                    <Symbol size={20}>download</Symbol>
                </button>
            )}
        </div>
    );
};

/**
 * for-web TextFile: テキストファイルの内容をインライン表示
 */
const AUTO_LOAD_MAX_SIZE_BYTES = 50000;

const TextFileView = ({ attachment, src }) => {
    const [contents, setContents] = useState(null);
    const [loading, setLoading] = useState(false);
    const canAutoLoad = Boolean(attachment.size && attachment.size <= AUTO_LOAD_MAX_SIZE_BYTES);

    const load = async () => {
        setLoading(true);
        try {
            const res = await fetch(src);
            setContents(await res.text());
        } catch {
            setContents('ファイルを読み込めませんでした');
        }
    };

    useEffect(() => {
        if (canAutoLoad) load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (contents !== null) {
        return <pre className="app-attachment-textfile"><code>{contents}</code></pre>;
    }
    if (loading) {
        return <md-circular-progress indeterminate />;
    }
    return (
        <button
            type="button"
            className="app-attachment-text-load"
            onClick={load}
        >
            ファイルを読み込む{attachment.size ? ` (${humanFileSize(attachment.size)})` : ''}
        </button>
    );
};

/**
 * for-web Spoiler: クリックで表示を解除
 */
const SpoilerView = () => {
    const [shown, setShown] = useState(true);
    if (!shown) return null;
    return (
        <div className="app-spoiler" onClick={() => setShown(false)}>
            <span>クリックで表示</span>
        </div>
    );
};

/**
 * for-web Attachment: 添付ファイルの種類別レンダー
 */
const AttachmentList = ({ attachments = [], onImageClick }) => {
    if (!attachments?.length) return null;

    return (
        <div className="app-attachments">
            {attachments.map((attachment, index) => {
                const kind = attachmentKind(attachment);
                const url = safeMediaUrl(attachment.url);
                if (!url) return null;
                const proxied = getProxyUrl(url);
                const key = attachment.id || `${attachment.name || 'file'}-${index}`;

                if (kind === 'image') {
                    const image = (
                        <img
                            key={key}
                            src={proxied}
                            loading="lazy"
                            decoding="async"
                            className="app-attachment-image"
                            onClick={() => onImageClick?.(url, attachments, index)}
                            alt=""
                        />
                    );
                    if (!attachment.spoiler) return image;
                    return (
                        <div key={key} className="app-attachment-spoiler-wrap">
                            {image}
                            <SpoilerView />
                        </div>
                    );
                }
                if (kind === 'video') {
                    const video = <video key={key} className="app-attachment-video" controls playsInline preload="metadata" src={proxied} />;
                    if (!attachment.spoiler) return video;
                    return (
                        <div key={key} className="app-attachment-spoiler-wrap">
                            {video}
                            <SpoilerView />
                        </div>
                    );
                }
                if (kind === 'audio') {
                    return (
                        <div key={key} className="app-attachment-container">
                            <FileCard attachment={attachment} />
                            <audio controls src={proxied} />
                        </div>
                    );
                }
                if (kind === 'text') {
                    return (
                        <div key={key} className="app-attachment-container">
                            <FileCard attachment={attachment} />
                            <TextFileView attachment={attachment} src={proxied} />
                        </div>
                    );
                }
                return (
                    <div key={key} className="app-attachment-container">
                        <FileCard attachment={attachment} />
                    </div>
                );
            })}
        </div>
    );
};

export default AttachmentList;
