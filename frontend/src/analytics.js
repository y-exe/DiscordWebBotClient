export function initAnalytics() {
  const gaId = import.meta.env.GA_ID || import.meta.env.VITE_GA_ID;
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
  const gaId = import.meta.env.GA_ID || import.meta.env.VITE_GA_ID;
  if (!gaId || typeof window.gtag !== 'function') return;

  window.gtag('config', gaId, {
    page_path: path,
  });
}
