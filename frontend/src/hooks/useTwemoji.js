import { useCallback, useLayoutEffect, useRef } from 'react';
import twemoji from 'twemoji';

const TWEMOJI_OPTIONS = {
  folder: 'svg',
  ext: '.svg',
  base: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/'
};

export const useTwemoji = () => {
  const ref = useRef(null);
  const lastContent = useRef(null);

  const apply = useCallback(() => {
    if (!ref.current) return;
    const current = ref.current.textContent || '';
    if (lastContent.current === current) return;
    lastContent.current = current;
    twemoji.parse(ref.current, TWEMOJI_OPTIONS);
  }, []);

  useLayoutEffect(() => {
    apply();
  });

  return { ref, apply };
};

export default useTwemoji;
