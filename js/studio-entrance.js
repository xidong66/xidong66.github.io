import { animate, wait } from './studio-animation.js';

export function createStudioEntrance({ dialog, motion, skip, requestFrame, translate }) {
  const controller = new AbortController(), word = dialog.querySelector('.entrance-word');
  let desk, running = !skip && !motion.matches, finished = false;
  function finish() {
    if (finished) return; finished = true; running = false; controller.abort();
    if (desk) { desk.playEntrance(true); requestFrame(); }
    dialog.close(); document.documentElement.dataset.entrance = 'complete';
  }
  dialog.querySelector('#entrance-skip').addEventListener('click', finish);
  dialog.addEventListener('cancel', event => { event.preventDefault(); finish(); });
  motion.addEventListener('change', event => { if (event.matches) finish(); });
  if (running) { document.documentElement.dataset.entrance = 'greeting'; dialog.showModal(); }
  else { finished = true; document.documentElement.dataset.entrance = 'complete'; }
  return {
    skip: finish,
    async play(api) {
      desk = api; if (!running) { desk?.playEntrance(true); return; }
      const signal = controller.signal;
      try {
        for (const greeting of ['Hello', '你好', 'Bonjour', 'こんにちは', 'Hola', '안녕']) {
          word.textContent = greeting;
          await animate(word, [{ opacity: 0, transform: 'translateY(18px)' }, { opacity: 1, transform: 'translateY(0)' }], 180, { signal });
          await wait(240, signal);
          await animate(word, [{ opacity: 1 }, { opacity: 0 }], 100, { signal });
        }
        dialog.dataset.phase = 'name'; word.textContent = translate('home.name', 'Xidong Wu');
        await animate(word, [{ opacity: 0, transform: 'translateY(18px)' }, { opacity: 1, transform: 'translateY(0)' }], 500, { signal });
        await wait(500, signal); document.documentElement.dataset.entrance = 'desk';
        const camera = desk?.playEntrance(false); requestFrame();
        const name = dialog.querySelector('.entrance-name'), rect = name.getBoundingClientRect(), target = document.querySelector('.topbar .monogram').getBoundingClientRect();
        await Promise.all([
          animate(name, [{ transform: 'translate(0,0) scale(1)', opacity: 1 }, { transform: `translate(${target.left + target.width / 2 - rect.left - rect.width / 2}px,${target.top + target.height / 2 - rect.top - rect.height / 2}px) scale(.2)`, opacity: 0 }], 1000, { signal }),
          animate(dialog, [{ backgroundColor: getComputedStyle(dialog).backgroundColor }, { backgroundColor: 'transparent' }], 950, { signal }),
          camera,
        ]);
      } catch (error) { if (!signal.aborted) console.warn('The entrance was shortened.', error.message); }
      finish();
    },
  };
}
