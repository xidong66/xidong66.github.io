/* Small, cancellable visual sequences shared by the studio and stationery. */
export function wait(duration, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException('Cancelled', 'AbortError'));
    const abort = () => { clearTimeout(timer); reject(new DOMException('Cancelled', 'AbortError')); };
    const timer = setTimeout(() => { signal?.removeEventListener('abort', abort); resolve(); }, duration);
    signal?.addEventListener('abort', abort, { once: true });
  });
}
export async function animate(element, frames, duration, { reduced = false, signal, easing = 'cubic-bezier(.22,.8,.25,1)' } = {}) {
  if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
  const apply = () => { for (const [key, value] of Object.entries(frames.at(-1))) if (!['offset', 'easing', 'composite'].includes(key)) element.style[key] = value; };
  if (reduced || !duration) { apply(); return; }
  const animation = element.animate(frames, { duration, easing, fill: 'forwards' });
  const abort = () => animation.cancel(); signal?.addEventListener('abort', abort, { once: true });
  try { await animation.finished; apply(); }
  finally { animation.cancel(); signal?.removeEventListener('abort', abort); }
}
