export function initAnalytics() {
  const gaId = process.env.GA_ID || process.env.NEXT_PUBLIC_GA_ID || 'G-Z3DMZV1XXD';
  if (!gaId) return;

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer.push(arguments);
  }
  window.gtag = gtag;

  gtag('js', new Date());
  gtag('config', gaId);
}

export function trackPageView(path) {
  const gaId = process.env.GA_ID || process.env.NEXT_PUBLIC_GA_ID || 'G-Z3DMZV1XXD';
  if (!gaId || typeof window.gtag !== 'function') return;

  window.gtag('config', gaId, {
    page_path: path,
  });
}
