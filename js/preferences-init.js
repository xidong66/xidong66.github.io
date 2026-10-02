/* Apply the saved palette before CSS paints; storage may be unavailable. */
(() => {
  let theme;
  try { theme = localStorage.getItem('xw.theme'); } catch { /* Private/storage-blocked browsing. */ }
  if (!['light', 'dark'].includes(theme)) theme = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  document.documentElement.dataset.theme = theme;
})();
