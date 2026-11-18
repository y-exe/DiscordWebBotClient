import { useEffect, useRef, useState } from 'react';
import { openExternalUrl, safeMediaUrl } from '../../utils/security';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa6';

import { getProxyUrl } from '../../utils/helpers';
import { humanFileSize } from './messageUtils';

const ZOOM_STEP = 0.3;
const MIN_SCALE = 0.1;
const MAX_SCALE = 5;

/**
 * 画像ビュアー (for-web ImageViewerModal 仕様: スクライム+カード式ツールバー、
 * ホイール/ドラッグでのズーム・パン)
 */
const ImageViewer = ({ images, initialIndex, onClose }) => {
  const [index, setIndex] = useState(initialIndex);
  const [prevIndex, setPrevIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef(null);

  const items = (images || []).map((image) => (typeof image === 'string' ? { url: image } : image));
  const current = items[index];

  // 画像切替時にズーム・パンをリセット(state調整はレンダー中に行う)
  if (prevIndex !== index) {
    setPrevIndex(index);
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }

  const clampScale = (value) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));

  const handleNext = (e) => {
    e?.stopPropagation();
    if (index < items.length - 1) setIndex(index + 1);
  };

  const handlePrev = (e) => {
    e?.stopPropagation();
    if (index > 0) setIndex(index - 1);
  };

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  });

  const onWheel = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setScale((current) => clampScale(current - e.deltaY / 1000));
  };

  const onPointerDown = (e) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    dragRef.current = { startX: e.clientX - offset.x, startY: e.clientY - offset.y };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e) => {
    if (!dragRef.current) return;
    setOffset({ x: e.clientX - dragRef.current.startX, y: e.clientY - dragRef.current.startY });
  };

  const onPointerUp = () => {
    dragRef.current = null;
  };

  const downloadImage = (e) => {
    e.stopPropagation();
    const safeUrl = safeMediaUrl(current?.url);
    if (!safeUrl) return;
    const link = document.createElement('a');
    link.href = safeUrl;
    link.download = current?.filename || 'image';
    link.rel = 'noopener noreferrer';
    link.click();
  };

  return (
    <div className="app-image-viewer" onClick={onClose}>
      <div className="app-image-viewer-inner">
        <div className="app-image-viewer-bar">
          {current?.filename ? (
            <div className="app-viewer-card" onClick={(e) => e.stopPropagation()}>
              <div className="app-viewer-card-text">
                <span className="app-viewer-title">{current.filename}</span>
                {current.size != null && <span className="app-viewer-label">{humanFileSize(current.size)}</span>}
              </div>
            </div>
          ) : items.length > 1 ? (
            <div className="app-viewer-card" onClick={(e) => e.stopPropagation()}>
              <span className="app-viewer-title">{index + 1} / {items.length}</span>
            </div>
          ) : (
            <div />
          )}
          <div className="app-viewer-card" onClick={(e) => e.stopPropagation()}>
            <md-icon-button type="button" class="m3-icon-button" title="縮小" onClick={() => setScale((s) => clampScale(s - ZOOM_STEP))}>
              zoom_out
            </md-icon-button>
            <md-icon-button type="button" class="m3-icon-button" title="拡大" onClick={() => setScale((s) => clampScale(s + ZOOM_STEP))}>
              zoom_in
            </md-icon-button>
            <md-icon-button type="button" class="m3-icon-button" title="ダウンロード" onClick={downloadImage}>
              download
            </md-icon-button>
            <md-icon-button type="button" class="m3-icon-button" title="元画像を開く" onClick={() => openExternalUrl(current?.url)}>
              open_in_new
            </md-icon-button>
            <md-icon-button type="button" class="m3-icon-button" title="閉じる" onClick={onClose}>
              close
            </md-icon-button>
          </div>
        </div>

        {items.length > 1 && (
          <>
            <md-icon-button
              type="button"
              class={`m3-viewer-nav left-6 ${index === 0 ? 'opacity-0' : 'opacity-100'}`}
              onClick={handlePrev}
              title="前へ"
            >
              <FaChevronLeft size={28} />
            </md-icon-button>
            <md-icon-button
              type="button"
              class={`m3-viewer-nav right-6 ${index === items.length - 1 ? 'opacity-0' : 'opacity-100'}`}
              onClick={handleNext}
              title="次へ"
            >
              <FaChevronRight size={28} />
            </md-icon-button>
          </>
        )}

        <img
          className="app-image-viewer-image"
          src={getProxyUrl(current?.url)}
          alt={current?.filename || ''}
          draggable={false}
          style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})` }}
          onWheel={onWheel}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          onContextMenu={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  );
};

export default ImageViewer;
