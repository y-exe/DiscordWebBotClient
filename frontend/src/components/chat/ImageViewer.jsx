import { useEffect, useState } from 'react';
import { openExternalUrl, safeMediaUrl } from '../../utils/security';
import { FaArrowDown, FaChevronLeft, FaChevronRight, FaExpand, FaUpRightFromSquare, FaXmark } from 'react-icons/fa6';

import { getProxyUrl } from '../../utils/helpers';

const ImageViewer = ({ images, initialIndex, onClose }) => {
  const [index, setIndex] = useState(initialIndex);
  const [isLoaded, setIsLoaded] = useState(false);

  const handleNext = (e) => {
    e?.stopPropagation();
    if (index < images.length - 1) {
      setIndex(index + 1);
      setIsLoaded(false);
    }
  };

  const handlePrev = (e) => {
    e?.stopPropagation();
    if (index > 0) {
      setIndex(index - 1);
      setIsLoaded(false);
    }
  };

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [index, images, onClose]);

  const currentUrl = images[index];
  const proxiedUrl = getProxyUrl(currentUrl);

  const downloadImage = (e) => {
    e.stopPropagation();
    const safeUrl = safeMediaUrl(currentUrl);
    if (!safeUrl) return;
    const link = document.createElement('a');
    link.href = safeUrl;
    link.download = 'image.png';
    link.rel = 'noopener noreferrer';
    link.click();
  };

  return (
    <div className="fixed inset-0 z-[1000] flex flex-col items-center justify-center bg-black/90" onClick={onClose}>
      <div className="absolute left-0 right-0 top-0 z-[1010] flex h-14 items-center justify-between bg-gradient-to-b from-black/60 to-transparent px-6" onClick={(e) => e.stopPropagation()}>
        <div className="text-sm font-bold text-white/80">{index + 1} / {images.length}</div>
        <div className="flex items-center gap-3 text-white/70">
          <md-icon-button type="button" class="m3-viewer-button" title="拡大">
            <FaExpand size={18} />
          </md-icon-button>
          <md-icon-button type="button" class="m3-viewer-button" title="元画像を開く" onClick={() => openExternalUrl(currentUrl)}>
            <FaUpRightFromSquare size={18} />
          </md-icon-button>
          <md-icon-button type="button" class="m3-viewer-button" title="ダウンロード" onClick={downloadImage}>
            <FaArrowDown size={20} />
          </md-icon-button>
          <div className="mx-1 h-6 w-px bg-white/20" />
          <md-icon-button type="button" class="m3-viewer-button" onClick={onClose} title="閉じる">
            <FaXmark size={26} />
          </md-icon-button>
        </div>
      </div>

      {images.length > 1 && (
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
            class={`m3-viewer-nav right-6 ${index === images.length - 1 ? 'opacity-0' : 'opacity-100'}`}
            onClick={handleNext}
            title="次へ"
          >
            <FaChevronRight size={28} />
          </md-icon-button>
        </>
      )}

      <div className="animate-viewer-zoom relative flex max-h-[88vh] max-w-[92vw] select-none items-center justify-center">
        <img
          key={currentUrl}
          src={proxiedUrl}
          onLoad={() => setIsLoaded(true)}
          className={`max-h-full max-w-full object-contain shadow-2xl transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
          onClick={(e) => e.stopPropagation()}
          alt=""
        />
        {!isLoaded && <div className="absolute h-10 w-10 animate-spin rounded-full border-4 border-discord-primary border-t-transparent" />}
      </div>
    </div>
  );
};

export default ImageViewer;
